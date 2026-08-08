import { describe, expect, it, vi } from "vitest";

vi.mock("../../../features/posts/actions", () => ({ createPost: vi.fn() }));
vi.mock("../../../lib/auth/require-role", () => ({
  requirePageRole: vi.fn().mockResolvedValue({ id: "member", role: "member" }),
}));
vi.mock("../../../features/posts/editor", () => ({
  PostEditor: ({ enableAttachments }: { enableAttachments?: boolean }) => (
    <p>{enableAttachments ? "첨부 파일" : "첨부 없음"}</p>
  ),
}));

import NewPostPage from "./page";

describe("새 게시글 첨부 화면", () => {
  it("게시글 생성 편집기에 다중 첨부 입력을 연결한다", async () => {
    const page = await NewPostPage();
    const editor = (page.props.children as any[])[1];
    expect(editor.props.enableAttachments).toBe(true);
  });
});
