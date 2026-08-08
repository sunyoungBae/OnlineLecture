import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import {
  deletePostAttachment,
  downloadPostAttachment,
  savePostAttachments,
  uploadPostAttachments,
  validatePostUpload,
  type PostFileDependencies,
} from "./post-files";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const postId = "00000000-0000-4000-8000-000000000001";
const attachmentId = "00000000-0000-4000-8000-000000000002";
const authorId = "00000000-0000-4000-8000-000000000003";
const storagePath = `posts/${postId}/00000000-0000-4000-8000-000000000004`;

function formData(values: Record<string, unknown | unknown[]>) {
  return {
    get: (name: string) => {
      const value = values[name];
      return Array.isArray(value) ? value[0] : value;
    },
    getAll: (name: string) => {
      const value = values[name];
      return value === undefined ? [] : Array.isArray(value) ? value : [value];
    },
  };
}

function file(name = "guide.pdf") {
  return { name, size: 1024, type: "application/pdf" };
}

function dependencies({
  deleteError = null,
  insertError = null,
  moveError = null,
  removeError = null,
  restoreError = null,
  uploadError = null,
}: {
  deleteError?: unknown;
  insertError?: unknown;
  moveError?: unknown;
  removeError?: unknown;
  restoreError?: unknown;
  uploadError?: unknown;
} = {}) {
  const attachment = {
    id: attachmentId,
    post_id: postId,
    mime_type: "application/pdf",
    original_filename: "guide.pdf",
    size_bytes: 1024,
    storage_path: storagePath,
  };
  const findOwnedPost = vi.fn().mockResolvedValue({ data: { id: postId }, error: null });
  const listForPost = vi.fn().mockResolvedValue({ data: [], error: null });
  const findById = vi.fn().mockResolvedValue({ data: attachment, error: null });
  const insert = vi.fn().mockResolvedValue({ data: null, error: insertError });
  const deleteById = vi.fn().mockResolvedValue({ data: { id: attachmentId }, error: deleteError });
  const restore = vi.fn().mockResolvedValue({ data: null, error: restoreError });
  const upload = vi.fn().mockResolvedValue({ data: null, error: uploadError });
  const move = vi.fn().mockResolvedValue({ data: null, error: moveError });
  const remove = vi.fn().mockResolvedValue({ data: null, error: removeError });
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://signed.example/download" },
    error: null,
  });
  const requireRole = vi.fn().mockResolvedValue({ id: authorId, role: "member" as const });
  const claim = vi.fn().mockResolvedValue({ data: [{ reservation_id: "00000000-0000-4000-8000-000000000005", upload_allowed: true, warning_claimed: false }], error: null });
  const release = vi.fn().mockResolvedValue({ data: true, error: null });
  const sendFailed = vi.fn().mockResolvedValue({ data: true, error: null });
  const sendWarning = vi.fn().mockResolvedValue({ sent: true });
  const deps: PostFileDependencies = {
    createPath: () => storagePath,
    redirect,
    repositoryFactory: async () => ({
      deleteById,
      findById,
      findOwnedPost,
      insert,
      listForPost,
      restore,
    }),
    requireRole,
    storageFactory: async () => ({ createSignedUrl, move, remove, upload }),
    quotaFactory: async () => ({ claim, release, sendFailed }),
    sendWarning,
  };

  return {
    attachment,
    createSignedUrl,
    deleteById,
    deps,
    findById,
    findOwnedPost,
    insert,
    listForPost,
    move,
    remove,
    requireRole,
    claim, release, sendFailed, sendWarning,
    restore,
    upload,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("게시글 첨부 검증", () => {
  it("기존 파일을 포함해 3개와 10MiB, MIME·확장자 조건을 함께 강제한다", () => {
    expect(validatePostUpload(2, [file()])).toEqual({ valid: true });
    expect(validatePostUpload(3, [file()])).toEqual({ valid: false, reason: "too_many_files" });
    expect(validatePostUpload(0, [{ name: "guide.pdf", size: 10 * 1024 * 1024 + 1, type: "application/pdf" }])).toEqual({ valid: false, reason: "file_too_large" });
    expect(validatePostUpload(0, [{ name: "guide.pdf", size: 1, type: "image/png" }])).toEqual({ valid: false, reason: "type_mismatch" });
  });
});

describe("게시글 첨부 저장", () => {
  it("95% claim이 거부되면 객체 업로드 전에 일반 저장 오류로 중단한다", async () => {
    const { claim, deps, upload } = dependencies();
    claim.mockResolvedValue({ data: [{ reservation_id: null, upload_allowed: false, warning_claimed: false }], error: null });
    await expect(savePostAttachments(postId, authorId, [file()], deps)).resolves.toEqual({ ok: false, reason: "save_failed" });
    expect(upload).not.toHaveBeenCalled();
  });
  it("RPC 배열이 비어 있거나 오류면 첫 행을 추정하지 않고 업로드를 거부한다", async () => {
    const { claim, deps, upload } = dependencies();
    claim.mockResolvedValue({ data: [], error: null });
    await expect(savePostAttachments(postId, authorId, [file()], deps)).resolves.toEqual({ ok: false, reason: "save_failed" });
    expect(upload).not.toHaveBeenCalled();
  });
  it("성공한 metadata 뒤 reservation release가 0행이면 재시도하고 성공으로 처리하지 않는다", async () => {
    const { deps, release } = dependencies();
    release.mockResolvedValue({ data: false, error: null });
    await expect(savePostAttachments(postId, authorId, [file()], deps)).resolves.toEqual({ ok: false, reason: "cleanup_failed" });
    expect(release).toHaveBeenCalledTimes(2);
  });
  it("80% 최초 claim만 경고를 보내고 발송 실패면 재시도 가능 상태로 되돌린다", async () => {
    const { claim, deps, sendFailed, sendWarning } = dependencies();
    claim.mockResolvedValue({ data: [{ reservation_id: "00000000-0000-4000-8000-000000000005", upload_allowed: true, warning_claimed: true }], error: null });
    sendWarning.mockResolvedValue({ sent: false });
    await savePostAttachments(postId, authorId, [file()], deps);
    expect(sendWarning).toHaveBeenCalledOnce();
    expect(sendFailed).toHaveBeenCalledOnce();
  });
  it("작성자 확인 뒤 private posts 경로에 저장하고 메타데이터를 기록한다", async () => {
    const { deps, findOwnedPost, insert, upload } = dependencies();

    const result = await savePostAttachments(postId, authorId, [file()], deps);
    expect(findOwnedPost).toHaveBeenCalledWith(postId, authorId);
    expect(result).toEqual({ ok: true });
    expect(upload).toHaveBeenCalledWith(storagePath, file());
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        mime_type: "application/pdf",
        original_filename: "guide.pdf",
        post_id: postId,
        storage_path: storagePath,
      }),
    ]);
  });

  it("메타데이터 기록 실패면 업로드한 객체를 정리하고 상세 오류를 노출하지 않는다", async () => {
    const { deps, remove } = dependencies({ insertError: new Error("RLS details") });

    await expect(savePostAttachments(postId, authorId, [file()], deps)).resolves.toEqual({ ok: false, reason: "save_failed" });
    expect(remove).toHaveBeenCalledWith([storagePath]);
  });

  it("메타데이터 실패 뒤 객체 정리는 한 번 재시도하고 실패를 cleanup 오류로 구분한다", async () => {
    const { deps, remove } = dependencies({ insertError: new Error("RLS") });
    remove.mockResolvedValue({ data: null, error: new Error("storage") });

    await expect(savePostAttachments(postId, authorId, [file()], deps)).resolves.toEqual({
      ok: false,
      reason: "cleanup_failed",
    });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith([storagePath]);
  });

  it("업로드 실패면 앞서 저장한 객체를 정리한다", async () => {
    const { deps, release, remove, upload } = dependencies();
    upload.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error: new Error("storage") });

    await expect(savePostAttachments(postId, authorId, [file(), file("other.pdf")], deps)).resolves.toEqual({ ok: false, reason: "save_failed" });
    expect(remove).toHaveBeenCalledWith([storagePath]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("업로드 예외면 이미 저장한 모든 객체를 정리한다", async () => {
    const { deps, remove, upload } = dependencies();
    upload.mockResolvedValueOnce({ data: null, error: null }).mockRejectedValueOnce(new Error("storage"));

    await expect(savePostAttachments(postId, authorId, [file(), file("other.pdf")], deps)).resolves.toEqual({ ok: false, reason: "save_failed" });
    expect(remove).toHaveBeenCalledWith([storagePath]);
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
  });

  it("메타데이터 예외면 저장 객체를 정리하고 cleanup 실패는 일반 cleanup 오류로 제한한다", async () => {
    const { deps, insert, remove } = dependencies();
    insert.mockRejectedValue(new Error("database secret"));
    remove.mockResolvedValue({ data: null, error: new Error("storage secret") });

    await expect(savePostAttachments(postId, authorId, [file()], deps)).resolves.toEqual({ ok: false, reason: "cleanup_failed" });
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("폼 업로드는 회원 인증 뒤 작성자만 처리하고 일반 오류로 돌아간다", async () => {
    const { deps, requireRole } = dependencies();
    requireRole.mockRejectedValue(new Error("denied"));

    await expect(uploadPostAttachments(formData({ files: [file()], post_id: postId }), deps)).rejects.toThrow("denied");
  });
});

describe("게시글 첨부 다운로드와 삭제", () => {
  it("회원은 검증된 게시글 첨부에만 짧은 signed URL을 발급받는다", async () => {
    const { createSignedUrl, deps, findById, requireRole } = dependencies();

    await downloadPostAttachment(formData({ attachment_id: attachmentId }), deps);

    expect(requireRole).toHaveBeenCalledWith("member");
    expect(findById).toHaveBeenCalledWith(attachmentId);
    expect(createSignedUrl).toHaveBeenCalledWith(storagePath, 60);
    expect(redirect).toHaveBeenCalledWith("https://signed.example/download");
  });

  it("signed URL 리디렉션의 제어 흐름 예외를 오류로 바꾸지 않는다", async () => {
    const { deps } = dependencies();
    const redirect = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(
      downloadPostAttachment(formData({ attachment_id: attachmentId }), { ...deps, redirect }),
    ).rejects.toThrow("redirect:https://signed.example/download");
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("삭제는 작성자 소유권을 확인한 뒤 원본을 trash로 이동하고 DB 실패면 되돌린다", async () => {
    const { deleteById, deps, findOwnedPost, move, remove } = dependencies({ deleteError: new Error("RLS") });

    await deletePostAttachment(formData({ attachment_id: attachmentId, post_id: postId }), deps);

    expect(findOwnedPost).toHaveBeenCalledWith(postId, authorId);
    expect(deleteById).toHaveBeenCalledWith(attachmentId);
    expect(move).toHaveBeenNthCalledWith(1, storagePath, expect.stringMatching(/^trash\/posts\//));
    expect(move).toHaveBeenNthCalledWith(2, expect.stringMatching(/^trash\/posts\//), storagePath);
    expect(remove).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(`/board/${postId}?error=attachment-delete`);
  });

  it("trash 정리 실패는 경로를 노출하지 않는 일반 오류로 남긴다", async () => {
    const { deps, move, remove } = dependencies({ removeError: new Error("storage") });

    await deletePostAttachment(formData({ attachment_id: attachmentId, post_id: postId }), deps);

    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith([move.mock.calls[0]?.[1]]);
    expect(redirect).toHaveBeenCalledWith(`/board/${postId}?error=attachment-delete`);
  });
});
