import { describe, expect, it, vi } from "vitest";

import { loadPostDetail, renderPostPage, type PostDetailClient } from "./page";

const client = (post: any, comments: any[], error: any = null, viewerId: string | null = null) => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: post, error });
  const eq = vi.fn().mockReturnValue({
    maybeSingle,
    order: vi.fn().mockResolvedValue({ data: comments, error }),
  });
  const select = vi.fn().mockReturnValue({
    eq,
    order: vi.fn().mockResolvedValue({ data: comments, error }),
  });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: viewerId ? { id: viewerId } : null }, error: null }) },
    from: vi.fn(() => ({ select })),
  } as unknown as PostDetailClient;
};

const text = (node: any): string =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(text).join("")
      : node?.props
        ? text(node.props.children)
        : "";

describe("공개 게시글 상세", () => {
  it("게시글과 댓글을 공개 조회하고 첨부 업로드·다운로드·삭제 폼을 보인다", async () => {
    const loaded = client(
      {
        id: "p",
        title: "제목",
        content: { type: "doc" },
        author_id: "a",
        is_notice: false,
        created_at: "2026-01-01",
        attachments: [{ id: "a", original_filename: "guide.pdf", size_bytes: 1024 }],
      },
      [{ id: "c", body: "댓글", author_id: "b", created_at: "2026-01-01" }], null, "a",
    );

    await expect(loadPostDetail("p", async () => loaded)).resolves.toMatchObject({
      hasLoadError: false,
    });
    expect(loaded.from).toHaveBeenCalledWith("posts");
    expect(loaded.from).toHaveBeenCalledWith("comments");

    const page = await renderPostPage(Promise.resolve({ postId: "p" }), async () => loaded);
    expect(text(page)).toContain("첨부 업로드");
    expect(text(page)).toContain("guide.pdf 다운로드");
    expect(text(page)).toContain("첨부 삭제");
  });

  it("비작성자에게는 다운로드만 보이고 업로드·삭제 폼은 숨긴다", async () => {
    const page = await renderPostPage(
      Promise.resolve({ postId: "p" }),
      async () => client({ id: "p", title: "제목", content: {}, author_id: "author", is_notice: false, created_at: "2026", attachments: [{ id: "a", original_filename: "guide.pdf", size_bytes: 1 }] }, [], null, "other"),
    );
    expect(text(page)).toContain("guide.pdf 다운로드");
    expect(text(page)).not.toContain("첨부 업로드");
    expect(text(page)).not.toContain("첨부 삭제");
  });

  it("빈 댓글과 오류 상태를 안내한다", async () => {
    expect(
      text(
        await renderPostPage(
          Promise.resolve({ postId: "p" }),
          async () => client({ id: "p", title: "제목", content: { type: "doc" }, author_id: "a", is_notice: false, created_at: "2026" }, []),
        ),
      ),
    ).toContain("아직 댓글이 없습니다.");
    expect(
      text(await renderPostPage(Promise.resolve({ postId: "p" }), async () => client(null, [], new Error("db")))),
    ).toContain("게시글을 불러오지 못했습니다");
  });
});
