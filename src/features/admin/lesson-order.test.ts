import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import { moveLessonInOrder } from "./lesson-order";
import { deleteLesson, moveLesson, updateLesson, type LessonMutationClient } from "../../app/admin/courses/[courseId]/lessons/actions";
import { AuthorizationError, requireRole } from "@/lib/auth/require-role";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/courses/youtube", async () => import("../courses/youtube"));
vi.mock("@/lib/auth/require-role", async () => {
  const actual = await import("../../lib/auth/require-role");
  return { ...actual, requireRole: vi.fn() };
});

const lessons = [
  { id: "one", position: 1 },
  { id: "two", position: 2 },
  { id: "three", position: 3 },
];

describe("moveLessonInOrder", () => {
  it("첫 회차를 위로 이동하면 순서를 유지한다", () => {
    expect(moveLessonInOrder(lessons, "one", "up")).toEqual(lessons);
  });

  it("중간 회차를 위와 아래로 이동하면 인접 회차와 position만 교환한다", () => {
    expect(moveLessonInOrder(lessons, "two", "up")).toEqual([
      { id: "two", position: 1 },
      { id: "one", position: 2 },
      { id: "three", position: 3 },
    ]);
    expect(moveLessonInOrder(lessons, "two", "down")).toEqual([
      { id: "one", position: 1 },
      { id: "three", position: 2 },
      { id: "two", position: 3 },
    ]);
  });

  it("마지막 회차를 아래로 이동하면 순서를 유지한다", () => {
    expect(moveLessonInOrder(lessons, "three", "down")).toEqual(lessons);
  });
});

describe("관리자 회차 이동 액션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue({ id: "admin", role: "admin" });
  });

  it("관리자는 검증된 회차를 RPC로 위로 이동한다", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const client = { rpc } as unknown as LessonMutationClient;
    const formData = new globalThis.FormData();
    formData.set("lesson_id", "00000000-0000-4000-8000-000000000001");
    formData.set("direction", "up");

    await moveLesson(formData, async () => client);

    expect(rpc).toHaveBeenCalledWith("move_lesson", {
      p_direction: "up",
      p_lesson_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(redirect).toHaveBeenCalledWith("/admin/courses?notice=lesson-moved");
  });

  it("회원은 RPC 호출 전에 회차 이동을 거부당한다", async () => {
    const rpc = vi.fn();
    const client = { rpc } as unknown as LessonMutationClient;
    vi.mocked(requireRole).mockRejectedValue(new AuthorizationError());
    const formData = new globalThis.FormData();
    formData.set("lesson_id", "00000000-0000-4000-8000-000000000001");
    formData.set("direction", "down");

    await moveLesson(formData, async () => client);

    expect(rpc).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin/courses?error=forbidden");
  });

  it.each(["update", "delete"])("%s는 영향 행이 없으면 저장 오류로 처리한다", async (operation) => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const client = { from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue({ eq }), delete: vi.fn().mockReturnValue({ eq }) }) } as unknown as LessonMutationClient;
    const formData = new globalThis.FormData();
    formData.set("course_id", "00000000-0000-4000-8000-000000000002"); formData.set("lesson_id", "00000000-0000-4000-8000-000000000001"); formData.set("title", "회차"); formData.set("description", "설명"); formData.set("youtube_url", "https://youtu.be/dQw4w9WgXcQ");
    await (operation === "update" ? updateLesson(formData, async () => client) : deleteLesson(formData, async () => client));
    expect(select).toHaveBeenCalledWith("id");
    expect(redirect).toHaveBeenCalledWith("/admin/courses/00000000-0000-4000-8000-000000000002/lessons?error=save");
  });
});
