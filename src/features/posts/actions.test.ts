import { describe, expect, it, vi } from "vitest";

import type { PostEditorState, PostFormData } from "./editor";
import {
  createPostAction,
  createUpdatePostAction,
  type PostActionDependencies,
} from "./actions";

const validContent = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
});

function formData(values: Record<string, unknown>): PostFormData {
  return { get: (name) => values[name] };
}

function dependencies({
  insertResult = { data: { id: "post-1" }, error: null },
  updateResult = { data: [{ id: "post-1" }], error: null },
  userId = "user-1",
}: {
  insertResult?: { data: { id: string } | null; error: unknown };
  updateResult?: { data: { id: string }[] | null; error: unknown };
  userId?: string;
} = {}) {
  const single = vi.fn().mockResolvedValue(insertResult);
  const insertSelect = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });
  const select = vi.fn().mockResolvedValue(updateResult);
  const authorId = vi.fn().mockReturnValue({ select });
  const postId = vi.fn().mockReturnValue({ eq: authorId });
  const update = vi.fn().mockReturnValue({ eq: postId });
  const from = vi.fn().mockReturnValue({ insert, update });
  const events: string[] = [];
  const redirect = vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  });
  const requirePageRole = vi.fn(async () => {
    events.push("auth");
    return { id: userId, role: "member" as const };
  });

  const deps: PostActionDependencies = {
    createClient: async () => ({ from }),
    redirect,
    requirePageRole,
    savePostAttachments: vi.fn().mockResolvedValue({ ok: true }),
  };

  return { authorId, deps, events, from, insert, postId, redirect, select, update };
}

const initialState: PostEditorState = { status: "idle" };

describe("게시글 서버 액션", () => {
  it("생성은 JSON 입력을 읽기 전에 인증한다", async () => {
    const { deps, events } = dependencies();
    const action = createPostAction(deps);
    const input: PostFormData = {
      get: (name) => {
        events.push(`form:${name}`);
        return name === "content" ? "{" : "제목";
      },
    };

    await expect(action(initialState, input)).resolves.toEqual({
      status: "error",
      message: "허용하지 않는 본문 형식입니다.",
    });

    expect(events).toEqual(["auth", "form:title", "form:content"]);
  });

  it("생성은 폼의 author_id를 무시하고 인증 프로필 ID로 작성자를 고정한다", async () => {
    const { deps, insert, redirect } = dependencies({ userId: "authenticated-user" });
    const action = createPostAction(deps);

    await expect(
      action(
        initialState,
        formData({ author_id: "forged-user", content: validContent, title: "제목" }),
      ),
    ).rejects.toThrow("redirect:/board");

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: "authenticated-user", title: "제목" }),
    );
    expect(redirect).toHaveBeenCalledWith("/board");
  });

  it("첨부가 있는 생성은 새 게시글 ID로 저장하고 첨부 실패면 게시글도 정리한다", async () => {
    const createdPostId = "00000000-0000-4000-8000-000000000010";
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: createdPostId }, error: null }),
      }),
    });
    const deleteByAuthor = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: createdPostId }], error: null }) });
    const deleteByPostId = vi.fn().mockReturnValue({ eq: deleteByAuthor });
    const remove = vi.fn().mockReturnValue({ eq: deleteByPostId });
    const savePostAttachments = vi.fn().mockResolvedValue({ ok: false });
    const redirect = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });
    const deps = {
      createClient: async () => ({ from: vi.fn().mockReturnValue({ delete: remove, insert, update: vi.fn() }) }),
      redirect,
      requirePageRole: vi.fn().mockResolvedValue({ id: "author-1", role: "member" }),
      savePostAttachments,
    } as unknown as PostActionDependencies;
    const action = createPostAction(deps);
    const attachment = { name: "guide.pdf", size: 1024, type: "application/pdf" };
    const input = {
      get: (name: string) => (name === "content" ? validContent : "제목"),
      getAll: (name: string) => (name === "files" ? [attachment] : []),
    } as PostFormData;

    await expect(action(initialState, input)).resolves.toEqual({
      status: "error",
      message: "게시글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });

    expect(savePostAttachments).toHaveBeenCalledWith(createdPostId, "author-1", [attachment]);
    expect(deleteByPostId).toHaveBeenCalledWith("id", createdPostId);
    expect(deleteByAuthor).toHaveBeenCalledWith("author_id", "author-1");
  });

  it("수정은 인증 전에 입력을 읽지 않고 post ID와 작성자 ID를 함께 조건으로 사용한다", async () => {
    const { authorId, deps, events, postId, redirect } = dependencies({ userId: "author-1" });
    const action = createUpdatePostAction("post-1", deps);
    const input: PostFormData = {
      get: (name) => {
        events.push(`form:${name}`);
        return name === "content" ? validContent : "수정 제목";
      },
    };

    await expect(action(initialState, input)).rejects.toThrow("redirect:/board/post-1");

    expect(events.slice(0, 3)).toEqual(["auth", "form:title", "form:content"]);
    expect(postId).toHaveBeenCalledWith("id", "post-1");
    expect(authorId).toHaveBeenCalledWith("author_id", "author-1");
    expect(redirect).toHaveBeenCalledWith("/board/post-1");
  });

  it("타인 또는 RLS로 0행 수정되면 일반 오류만 반환한다", async () => {
    const { deps } = dependencies({ updateResult: { data: [], error: null } });
    const action = createUpdatePostAction("other-post", deps);

    await expect(action(initialState, formData({ content: validContent, title: "수정 제목" }))).resolves.toEqual({
      status: "error",
      message: "게시글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it("DB/RLS 오류 원문은 생성 응답에 노출하지 않는다", async () => {
    const { deps } = dependencies({ insertResult: { data: null, error: new Error("permission denied by RLS") } });
    const action = createPostAction(deps);

    await expect(action(initialState, formData({ content: validContent, title: "제목" }))).resolves.toEqual({
      status: "error",
      message: "게시글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });
});
