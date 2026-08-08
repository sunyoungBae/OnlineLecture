import { beforeEach, describe, expect, it, vi } from "vitest";

import { requirePageRole } from "@/lib/auth/require-role";
import { renderCoursesPage } from "./page";

vi.mock("@/lib/auth/require-role", () => ({ requirePageRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/courses/youtube", async () => import("../../features/courses/youtube"));

type TestElement = {
  props?: { children?: unknown; src?: unknown };
  type?: unknown;
};

function elementsOfType(node: unknown, type: string): TestElement[] {
  if (Array.isArray(node)) {
    return node.flatMap((child) => elementsOfType(child, type));
  }

  if (!node || typeof node !== "object") {
    return [];
  }

  const element = node as TestElement;
  return [
    ...(element.type === type ? [element] : []),
    ...elementsOfType(element.props?.children, type),
  ];
}

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
  courses = [
    { description: "한국 미술", id: "course-a", slug: "korean-art", title: "한국 미술" },
    { description: "서양 미술", id: "course-b", slug: "western-art", title: "서양 미술" },
  ],
  coursesError = null,
  lessons = [
    { course_id: "course-a", position: 1, youtube_video_id: "dQw4w9WgXcQ" },
    { course_id: "course-b", position: 1, youtube_video_id: "9bZkp7q19f0" },
    { course_id: "course-a", position: 2, youtube_video_id: "3JZ_D3ELwOQ" },
  ],
  lessonsError = null,
}: {
  courses?: { description: string; id: string; slug: string; title: string }[] | null;
  coursesError?: unknown;
  lessons?: { course_id: string; position: number; youtube_video_id: string }[] | null;
  lessonsError?: unknown;
} = {}) {
  const coursesOrder = vi.fn().mockResolvedValue({ data: courses, error: coursesError });
  const coursesEq = vi.fn().mockReturnValue({ order: coursesOrder });
  const lessonsOrder = vi.fn().mockResolvedValue({ data: lessons, error: lessonsError });
  const lessonsIn = vi.fn().mockReturnValue({ order: lessonsOrder });
  const client = {
    from: vi.fn((table: string) =>
      table === "courses"
        ? { select: vi.fn().mockReturnValue({ eq: coursesEq }) }
        : { select: vi.fn().mockReturnValue({ in: lessonsIn }) },
    ),
  };

  return { client, coursesEq, coursesOrder, lessonsIn, lessonsOrder };
}

describe("renderCoursesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("회원 권한과 공개 필터로 강의 목록을 조회하고 첫 회차 썸네일을 표시한다", async () => {
    const { client, coursesEq, coursesOrder, lessonsIn, lessonsOrder } = createClient();

    const page = await renderCoursesPage(async () => client);

    expect(requirePageRole).toHaveBeenCalledWith("member", { nextPath: "/courses" });
    expect(coursesEq).toHaveBeenCalledWith("is_published", true);
    expect(coursesOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(lessonsIn).toHaveBeenCalledWith("course_id", ["course-a", "course-b"]);
    expect(lessonsOrder).toHaveBeenCalledWith("position", { ascending: true });
    expect(elementsOfType(page, "img").map((image) => image.props?.src)).toEqual([
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
    ]);
  });

  it("강의 조회 DB 오류를 재시도 가능한 메시지로 표시한다", async () => {
    const { client } = createClient({ courses: null, coursesError: new Error("database unavailable") });

    const page = await renderCoursesPage(async () => client);

    expect(textContent(page)).toContain("강의를 불러오지 못했습니다");
    expect(textContent(page)).toContain("강의 목록 새로고침");
  });

  it("공개 강의가 없으면 빈 상태를 표시하고 회차를 조회하지 않는다", async () => {
    const { client } = createClient({ courses: [] });

    const page = await renderCoursesPage(async () => client);

    expect(textContent(page)).toContain("현재 공개된 강의가 없습니다");
    expect(textContent(page)).toContain("강의 둘러보기");
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("회차 조회 DB 오류를 재시도 가능한 메시지로 표시한다", async () => {
    const { client } = createClient({ lessons: null, lessonsError: new Error("database unavailable") });

    const page = await renderCoursesPage(async () => client);

    expect(textContent(page)).toContain("강의를 불러오지 못했습니다");
  });
});
