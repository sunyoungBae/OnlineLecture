import { describe, expect, it, vi } from "vitest";

import { createCommentAction, deleteCommentAction, updateCommentAction, type CommentDependencies } from "./actions";

const form = (values: Record<string, unknown>) => ({ get: (name: string) => values[name] });

function dependencies({ data = [{ id: "comment-1" }], error = null, userId = "member-1" } = {}) {
  const insert = vi.fn().mockResolvedValue({ error });
  const select = vi.fn().mockResolvedValue({ data, error });
  const author = vi.fn().mockReturnValue({ select });
  const id = vi.fn().mockReturnValue({ eq: author });
  const update = vi.fn().mockReturnValue({ eq: id });
  const remove = vi.fn().mockReturnValue({ eq: id });
  const requirePageRole = vi.fn(async () => ({ id: userId, role: "member" as const }));
  const redirect = vi.fn((path: string): never => { throw new Error(`redirect:${path}`); });
  const deps: CommentDependencies = { createClient: async () => ({ from: vi.fn().mockReturnValue({ delete: remove, insert, update }) }), redirect, requirePageRole };
  return { author, deps, id, insert, redirect, requirePageRole };
}

describe("댓글 액션", () => {
  it.each(["", "가".repeat(2001)])("댓글 본문 %j은 1~2000자로 거부한다", async (body) => {
    const { deps } = dependencies();
    await expect(createCommentAction("post-1", deps)({}, form({ body }))).resolves.toEqual({ status: "error", message: "댓글은 1자 이상 2,000자 이하여야 합니다." });
  });

  it("인증 사용자 ID로만 댓글을 만들고 폼 author_id를 무시한다", async () => {
    const { deps, insert, redirect } = dependencies({ userId: "author-1" });
    await expect(createCommentAction("post-1", deps)({}, form({ author_id: "forged", body: "댓글" }))).rejects.toThrow("redirect:/board/post-1");
    expect(insert).toHaveBeenCalledWith({ author_id: "author-1", body: "댓글", post_id: "post-1" });
    expect(redirect).toHaveBeenCalledWith("/board/post-1");
  });

  it("수정과 삭제는 ID와 인증 작성자를 함께 조건으로 하고 0행은 일반 오류다", async () => {
    const { author, deps, id } = dependencies({ data: [] });
    await expect(updateCommentAction("post-1", "comment-1", deps)({}, form({ body: "수정" }))).resolves.toEqual({ status: "error", message: "댓글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    await expect(deleteCommentAction("post-1", "comment-1", deps)()).resolves.toEqual({ status: "error", message: "댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    expect(id).toHaveBeenCalledWith("id", "comment-1");
    expect(author).toHaveBeenCalledWith("author_id", "member-1");
  });
});
