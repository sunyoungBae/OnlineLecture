import { describe, expect, it } from "vitest";

import {
  buildPostSearchFilter,
  escapeIlikePattern,
  parsePostSearchParams,
} from "./search";

describe("게시글 검색 파라미터", () => {
  it("ILIKE의 %, _, 역슬래시를 리터럴로 이스케이프한다", () => {
    expect(escapeIlikePattern("100%_\\완료")).toBe("100\\%\\_\\\\완료");
    expect(buildPostSearchFilter("100%_\\완료")).toBe(
      "title.ilike.%100\\%\\_\\\\완료%,search_text.ilike.%100\\%\\_\\\\완료%",
    );
  });

  it("URL 검색 파라미터를 Zod로 정규화한다", () => {
    expect(
      parsePostSearchParams({
        course: "10000000-0000-0000-0000-000000000001",
        page: "2",
        q: "  강의 검색  ",
      }),
    ).toEqual({
      courseId: "10000000-0000-0000-0000-000000000001",
      page: 2,
      query: "강의 검색",
    });
  });

  it("페이지는 offset DoS를 막기 위해 10,000까지로 제한한다", () => {
    expect(parsePostSearchParams({ page: "10000" })).toEqual({
      courseId: null,
      page: 10_000,
      query: null,
    });
  });

  it.each([
    { course: "not-a-uuid", page: "-1", q: ["duplicate"] },
    { course: "10000000-0000-0000-0000-000000000001", page: "not-a-number", q: "x".repeat(121) },
    { page: "10001" },
    { page: String(Number.MAX_SAFE_INTEGER + 1) },
    { page: "9".repeat(1_000) },
  ])("잘못된 검색 파라미터는 안전한 첫 페이지 기본값으로 제한한다", (params) => {
    expect(parsePostSearchParams(params)).toEqual({ courseId: null, page: 1, query: null });
  });
});
