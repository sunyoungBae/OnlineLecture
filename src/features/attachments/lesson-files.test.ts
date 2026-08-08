import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import {
  deleteLessonAttachment,
  downloadLessonAttachment,
  uploadLessonAttachments,
  validateLessonUpload,
  type LessonFileDependencies,
} from "./lesson-files";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const courseId = "00000000-0000-4000-8000-000000000001";
const lessonId = "00000000-0000-4000-8000-000000000002";
const attachmentId = "00000000-0000-4000-8000-000000000003";

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
  return {
    name,
    size: 1024,
    type: "application/pdf",
  };
}

function dependencies({
  deleteError = null,
  findResult = {
    id: attachmentId,
    lesson_id: lessonId,
    mime_type: "application/pdf",
    original_filename: "guide.pdf",
    size_bytes: 1024,
    storage_path: `${lessonId}/attachment-1`,
  },
  insertError = null,
  removeError = null,
}: {
  deleteError?: unknown;
  findResult?: {
    id: string;
    lesson_id: string;
    mime_type: string;
    original_filename: string;
    size_bytes: number;
    storage_path: string;
  } | null;
  insertError?: unknown;
  removeError?: unknown;
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const listForLesson = vi.fn().mockResolvedValue({ data: [], error: null });
  const findById = vi.fn().mockResolvedValue({ data: findResult, error: null });
  const deleteById = vi.fn().mockResolvedValue({ data: findResult ? { id: findResult.id } : null, error: deleteError });
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: removeError });
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example/download" }, error: null });
  const requireRole = vi.fn().mockResolvedValue({ id: "admin-id", role: "admin" as const });
  const deps: LessonFileDependencies = {
    createPath: () => `${lessonId}/attachment-1`,
    redirect,
    repositoryFactory: async () => ({ deleteById, findById, insert, listForLesson }),
    requireRole,
    storageFactory: async () => ({ createSignedUrl, remove, upload }),
  };

  return { createSignedUrl, deleteById, deps, findById, insert, listForLesson, remove, requireRole, upload };
}

describe("validateLessonUpload", () => {
  it("3개와 10MB, MIME·확장자 조건을 함께 강제한다", () => {
    expect(validateLessonUpload(2, [{ name: "guide.pdf", size: 10 * 1024 * 1024, type: "application/pdf" }])).toEqual({ valid: true });
    expect(validateLessonUpload(3, [{ name: "guide.pdf", size: 1, type: "application/pdf" }])).toEqual({ valid: false, reason: "too_many_files" });
    expect(validateLessonUpload(0, [{ name: "guide.pdf", size: 1, type: "text/plain" }])).toEqual({ valid: false, reason: "type_mismatch" });
  });
});

describe("회차 자료 서버 동작", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("관리자 업로드는 메타데이터 기록이 실패하면 저장 객체를 정리한다", async () => {
    const { deps, insert, remove, upload } = dependencies({ insertError: new Error("metadata failed") });

    await uploadLessonAttachments(formData({ course_id: courseId, files: [file()], lesson_id: lessonId }), deps);

    expect(upload).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({ lesson_id: lessonId, storage_path: `${lessonId}/attachment-1` }),
    ]);
    expect(remove).toHaveBeenCalledWith([`${lessonId}/attachment-1`]);
    expect(redirect).toHaveBeenCalledWith(`/admin/courses/${courseId}/lessons?error=attachment-save`);
  });

  it("인증된 회원은 RLS로 읽을 수 있는 회차 자료에만 서명 URL을 받는다", async () => {
    const { createSignedUrl, deps, findById, requireRole } = dependencies();

    await downloadLessonAttachment(formData({ attachment_id: attachmentId }), deps);

    expect(requireRole).toHaveBeenCalledWith("member");
    expect(findById).toHaveBeenCalledWith(attachmentId);
    expect(createSignedUrl).toHaveBeenCalledWith(`${lessonId}/attachment-1`, 60);
    expect(redirect).toHaveBeenCalledWith("https://signed.example/download");
  });

  it("공개 대상이 아닌 자료는 서명 URL을 만들지 않는다", async () => {
    const { createSignedUrl, deps } = dependencies({ findResult: null });

    await downloadLessonAttachment(formData({ attachment_id: attachmentId }), deps);

    expect(createSignedUrl).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/courses");
  });

  it("관리자 삭제는 Storage 삭제가 실패하면 DB 메타데이터를 보존한다", async () => {
    const { deleteById, deps, remove } = dependencies({ removeError: new Error("storage unavailable") });

    await deleteLessonAttachment(formData({ attachment_id: attachmentId, course_id: courseId }), deps);

    expect(remove).toHaveBeenCalledWith([`${lessonId}/attachment-1`]);
    expect(deleteById).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(`/admin/courses/${courseId}/lessons?error=attachment-delete`);
  });
});
