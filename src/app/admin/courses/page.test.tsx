import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/auth/require-role", () => ({ requirePageRole: vi.fn().mockResolvedValue({ id: "admin", role: "admin" }) }));
vi.mock("../../../lib/supabase/server", () => ({ createClient: vi.fn() }));

import AdminCoursesPage, { loadAdminCourses } from "./page";

function text(node: any): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(text).join("");
  if (node?.type && typeof node.type === "function") return text(node.type(node.props ?? {}));
  return node?.props ? text(node.props.children) : "";
}

describe("관리자 강의 공통 상태", () => {
  it("목록 오류는 일반 안내와 재시도 복구 링크로 표시한다", async () => {
    const client = { from: () => ({ select: () => ({ order: async () => ({ data: null, error: new Error("db secret") }) }) }) };
    const loaded = await loadAdminCourses(async () => client);
    expect(loaded).toEqual({ courses: [], hasLoadError: true });

    const page = await AdminCoursesPage({ searchParams: Promise.resolve({}) });
    expect(text(page)).toContain("강의 목록을 불러오지 못했습니다");
    expect(text(page)).toContain("강의 목록 새로고침");
  });

  it("권한 거부 쿼리는 존재 정보를 숨긴 공통 alert로 표시한다", async () => {
    const page = await AdminCoursesPage({ searchParams: Promise.resolve({ error: "forbidden" }) });
    expect(text(page)).toContain("이 페이지에 접근할 권한이 없습니다");
    expect(text(page)).not.toContain("관리자 권한");
    expect(text(page)).not.toContain("새 강의");
  });
});
