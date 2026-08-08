import { describe, expect, it, vi } from "vitest";

import {
  loadPublicPosts,
  renderBoardPage,
  type BoardPageClient,
} from "./page";

const courseId = "10000000-0000-0000-0000-000000000001";

function createClient({
  count = 1,
  data = [
    {
      author_id: "author-1",
      content: { type: "doc", content: [] },
      course_id: courseId,
      created_at: "2026-08-08T00:00:00.000Z",
      id: "post-1",
      is_notice: true,
      search_text: "검색 본문",
      title: "공지 제목",
    },
  ],
  error = null,
}: {
  count?: number | null;
  data?: BoardPageClientPost[] | null;
  error?: unknown;
} = {}) {
  const range = vi.fn().mockResolvedValue({ count, data, error });
  const or = vi.fn();
  const eq = vi.fn();
  const order = vi.fn();
  const query = { eq, or, order, range };
  order.mockReturnValue(query);
  eq.mockReturnValue(query);
  or.mockReturnValue(query);
  const select = vi.fn().mockReturnValue(query);
  const from = vi.fn().mockReturnValue({ select });

  return { client: { from } as BoardPageClient, eq, from, or, order, range };
}

type BoardPageClientPost = {
  author_id: string;
  content: { type: string; content: unknown[] };
  course_id: string | null;
  created_at: string;
  id: string;
  is_notice: boolean;
  search_text: string;
  title: string;
};

function textContent(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textContent).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    const element = node as { props: { children?: unknown }; type?: unknown };
    const children = textContent(element.props.children);
    if (children || typeof element.type !== "function") return children;
    return textContent(element.type(element.props));
  }

  return "";
}

describe("공개 게시글 목록", () => {
  it("비로그인 요청도 공지 우선·최신순·20개 범위로 검색과 강의 필터를 조회한다", async () => {
    const { client, eq, from, or, order, range } = createClient();

    await expect(
      loadPublicPosts(
        { courseId, page: 2, query: "100%_\\완료" },
        async () => client,
      ),
    ).resolves.toMatchObject({ hasLoadError: false, page: 2, total: 1 });

    expect(from).toHaveBeenCalledWith("posts");
    expect(or).toHaveBeenCalledWith(
      "title.ilike.%100\\%\\_\\\\완료%,search_text.ilike.%100\\%\\_\\\\완료%",
    );
    expect(eq).toHaveBeenCalledWith("course_id", courseId);
    expect(order).toHaveBeenNthCalledWith(1, "is_notice", { ascending: false });
    expect(order).toHaveBeenNthCalledWith(2, "created_at", { ascending: false });
    expect(range).toHaveBeenCalledWith(20, 39);
  });

  it("DB 오류는 공개 목록 일반 오류 상태로 바꾼다", async () => {
    const { client } = createClient({ error: new Error("database detail") });

    await expect(loadPublicPosts({ courseId: null, page: 1, query: null }, async () => client)).resolves.toEqual({
      hasLoadError: true,
      page: 1,
      posts: [],
      total: 0,
    });
  });

  it("빈 결과와 오류 결과를 공개 페이지에 각각 안내한다", async () => {
    const empty = createClient({ count: 0, data: [] });
    const emptyPage = await renderBoardPage(Promise.resolve({}), async () => empty.client);
    expect(textContent(emptyPage)).toContain("아직 게시글이 없습니다.");
    expect(textContent(emptyPage)).toContain("첫 게시글 작성하기");

    const failed = createClient({ error: new Error("database detail") });
    const failedPage = await renderBoardPage(Promise.resolve({}), async () => failed.client);
    expect(textContent(failedPage)).toContain("게시글 목록을 불러오지 못했습니다");
    expect(textContent(failedPage)).toContain("잠시 후 다시 시도해 주세요.");
    expect(textContent(failedPage)).toContain("목록 새로고침");
  });
});
