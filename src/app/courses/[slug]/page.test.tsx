import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";

import { requirePageRole } from "@/lib/auth/require-role";
import { renderCourseDetailPage } from "./page";

vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("not found"); }) }));
vi.mock("@/lib/auth/require-role", () => ({ requirePageRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/courses/youtube", async () => import("../../../features/courses/youtube"));

type TestElement = {
  props?: { children?: unknown };
  type?: unknown;
};

function textContent(node: unknown): string {
  if (Array.isArray(node)) {
    return node.map(textContent).join("");
  }

  if (typeof node === "string") {
    return node;
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const element = node as TestElement;
  const children = textContent(element.props?.children);
  if (children || typeof element.type !== "function") {
    return children;
  }

  return textContent(element.type(element.props ?? {}));
}

function createClient({
  course = { description: "인상주의를 살펴봅니다.", id: "course-art", title: "서양 미술" },
  courseError = null,
  lessons = [
    { description: "첫 번째 회차", id: "lesson-1", position: 1, title: "빛과 색", youtube_video_id: "dQw4w9WgXcQ" },
  ],
  lessonsError = null,
}: {
  course?: { description: string; id: string; title: string } | null;
  courseError?: unknown;
  lessons?: { description: string; id: string; position: number; title: string; youtube_video_id: string }[] | null;
  lessonsError?: unknown;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: course, error: courseError });
  const publishedEq = vi.fn().mockReturnValue({ maybeSingle });
  const slugEq = vi.fn().mockReturnValue({ eq: publishedEq });
  const lessonsOrder = vi.fn().mockResolvedValue({ data: lessons, error: lessonsError });
  const lessonsEq = vi.fn().mockReturnValue({ order: lessonsOrder });
  const client = {
    from: vi.fn((table: string) =>
      table === "courses"
        ? { select: vi.fn().mockReturnValue({ eq: slugEq }) }
        : { select: vi.fn().mockReturnValue({ eq: lessonsEq }) },
    ),
  };

  return { client, lessonsEq, lessonsOrder, publishedEq, slugEq };
}

describe("renderCourseDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("회원 권한과 공개 강의 필터로 상세·회차 순서를 조회한다", async () => {
    const { client, lessonsEq, lessonsOrder, publishedEq, slugEq } = createClient();

    const page = await renderCourseDetailPage({ slug: "western-art" }, async () => client);

    expect(requirePageRole).toHaveBeenCalledWith("member", { nextPath: "/courses/western-art" });
    expect(slugEq).toHaveBeenCalledWith("slug", "western-art");
    expect(publishedEq).toHaveBeenCalledWith("is_published", true);
    expect(lessonsEq).toHaveBeenCalledWith("course_id", "course-art");
    expect(lessonsOrder).toHaveBeenCalledWith("position", { ascending: true });
    expect(textContent(page)).toContain("빛과 색");
  });

  it("미공개 또는 존재하지 않는 slug는 notFound로 처리한다", async () => {
    const { client } = createClient({ course: null });

    await expect(renderCourseDetailPage({ slug: "private-course" }, async () => client)).rejects.toThrow("not found");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("상세 조회 DB 오류를 재시도 가능한 메시지로 표시한다", async () => {
    const { client } = createClient({ course: null, courseError: new Error("database unavailable") });

    const page = await renderCourseDetailPage({ slug: "western-art" }, async () => client);

    expect(textContent(page)).toContain("강의를 불러오지 못했습니다");
    expect(textContent(page)).toContain("강의 목록으로 돌아가기");
  });

  it("등록된 회차가 없으면 빈 회차 상태를 표시한다", async () => {
    const { client } = createClient({ lessons: [] });

    const page = await renderCourseDetailPage({ slug: "western-art" }, async () => client);

    expect(textContent(page)).toContain("등록된 회차가 없습니다");
    expect(textContent(page)).toContain("강의 목록으로 돌아가기");
  });

  it("회차 조회 DB 오류를 재시도 가능한 메시지로 표시한다", async () => {
    const { client } = createClient({ lessons: null, lessonsError: new Error("database unavailable") });

    const page = await renderCourseDetailPage({ slug: "western-art" }, async () => client);

    expect(textContent(page)).toContain("강의를 불러오지 못했습니다");
  });
});
