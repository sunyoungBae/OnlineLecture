import { validateAttachmentCount, validateAttachmentFile, type AttachmentFileInput } from "./validation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import * as navigation from "next/navigation";

import { requireRole as defaultRequireRole, type Role } from "../../lib/auth/require-role";
import { createClient } from "../../lib/supabase/server";
import type { Database } from "../../types/database";

export type LessonUploadValidation = { valid: true } | { valid: false; reason: string };

export function validateLessonUpload(existingCount: number, files: readonly AttachmentFileInput[]): LessonUploadValidation {
  const count = validateAttachmentCount(existingCount + files.length);
  if (!count.valid) return count;
  for (const file of files) {
    const result = validateAttachmentFile(file);
    if (!result.valid) return result;
  }
  return { valid: true };
}

type FormDataLike = {
  get: (name: string) => unknown;
  getAll: (name: string) => unknown[];
};

type UploadFile = AttachmentFileInput;

type LessonAttachment = {
  id: string;
  lesson_id: string;
  mime_type: string;
  original_filename: string;
  size_bytes: number;
  storage_path: string;
};

type AttachmentInsert = Omit<LessonAttachment, "id">;

type Result<T> = { data: T; error: unknown };

type LessonAttachmentRepository = {
  deleteById: (attachmentId: string) => Promise<Result<{ id: string } | null>>;
  findById: (attachmentId: string) => Promise<Result<LessonAttachment | null>>;
  insert: (attachments: AttachmentInsert[]) => Promise<Result<null>>;
  listForLesson: (lessonId: string) => Promise<Result<LessonAttachment[] | null>>;
};

type AttachmentStorage = {
  createSignedUrl: (path: string, expiresIn: number) => Promise<Result<{ signedUrl: string } | null>>;
  remove: (paths: string[]) => Promise<Result<null>>;
  upload: (path: string, file: UploadFile) => Promise<Result<null>>;
};

export type LessonFileDependencies = {
  createPath: (lessonId: string) => string;
  redirect: (path: string) => never;
  repositoryFactory: () => Promise<LessonAttachmentRepository>;
  requireRole: (role: Role) => Promise<{ id: string; role: Role }>;
  storageFactory: () => Promise<AttachmentStorage>;
};

const ATTACHMENT_BUCKET = "attachments";
const DOWNLOAD_URL_TTL_SECONDS = 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const defaultDependencies: LessonFileDependencies = {
  createPath: (lessonId) => `${lessonId}/${globalThis.crypto.randomUUID()}`,
  redirect: (path) => navigation.redirect(path),
  repositoryFactory: createLessonAttachmentRepository,
  requireRole: defaultRequireRole,
  storageFactory: createAttachmentStorage,
};

function formValue(formData: FormDataLike, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validId(value: string) {
  return uuid.test(value);
}

function adminLessonsPath(formData: FormDataLike) {
  const courseId = formValue(formData, "course_id");
  return validId(courseId) ? `/admin/courses/${courseId}/lessons` : "/admin/courses";
}

function dependencyRedirect(
  dependencies: LessonFileDependencies,
  formData: FormDataLike,
  query: string,
): never {
  return dependencies.redirect(`${adminLessonsPath(formData)}?${query}`);
}

function filesFrom(formData: FormDataLike): UploadFile[] | null {
  const files = formData.getAll("files");
  if (!files.length || files.some((file) => !isUploadFile(file))) {
    return null;
  }

  return files as UploadFile[];
}

function isUploadFile(value: unknown): value is UploadFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const file = value as AttachmentFileInput;
  return typeof file.name === "string" && typeof file.size === "number" && typeof file.type === "string";
}

export async function uploadLessonAttachments(
  formData: FormDataLike,
  dependencies: LessonFileDependencies = defaultDependencies,
) {
  await dependencies.requireRole("admin");
  const lessonId = formValue(formData, "lesson_id");
  const files = filesFrom(formData);
  if (!validId(lessonId) || !files) {
    return dependencyRedirect(dependencies, formData, "error=attachment-invalid");
  }

  let repository: LessonAttachmentRepository;
  try {
    repository = await dependencies.repositoryFactory();
    const existing = await repository.listForLesson(lessonId);
    if (existing.error || !existing.data || !validateLessonUpload(existing.data.length, files).valid) {
      return dependencyRedirect(dependencies, formData, "error=attachment-invalid");
    }
  } catch {
    return dependencyRedirect(dependencies, formData, "error=attachment-save");
  }

  const storagePaths: string[] = [];
  try {
    const storage = await dependencies.storageFactory();
    for (const file of files) {
      const storagePath = dependencies.createPath(lessonId);
      const { error } = await storage.upload(storagePath, file);
      if (error) {
        if (storagePaths.length) {
          await storage.remove(storagePaths);
        }
        return dependencyRedirect(dependencies, formData, "error=attachment-save");
      }
      storagePaths.push(storagePath);
    }

    const { error } = await repository.insert(
      files.map((file, index) => ({
        lesson_id: lessonId,
        mime_type: file.type,
        original_filename: file.name,
        size_bytes: file.size,
        storage_path: storagePaths[index],
      })),
    );
    if (error) {
      await storage.remove(storagePaths);
      return dependencyRedirect(dependencies, formData, "error=attachment-save");
    }
  } catch {
    return dependencyRedirect(dependencies, formData, "error=attachment-save");
  }

  return dependencyRedirect(dependencies, formData, "notice=attachment-uploaded");
}

export async function downloadLessonAttachment(
  formData: FormDataLike,
  dependencies: LessonFileDependencies = defaultDependencies,
) {
  await dependencies.requireRole("member");
  const attachmentId = formValue(formData, "attachment_id");
  if (!validId(attachmentId)) {
    return dependencies.redirect("/courses");
  }

  try {
    const repository = await dependencies.repositoryFactory();
    const attachment = await repository.findById(attachmentId);
    if (attachment.error || !attachment.data || !attachment.data.lesson_id) {
      return dependencies.redirect("/courses");
    }

    const storage = await dependencies.storageFactory();
    const signed = await storage.createSignedUrl(attachment.data.storage_path, DOWNLOAD_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      return dependencies.redirect("/courses");
    }

    return dependencies.redirect(signed.data.signedUrl);
  } catch {
    return dependencies.redirect("/courses");
  }
}

export async function deleteLessonAttachment(
  formData: FormDataLike,
  dependencies: LessonFileDependencies = defaultDependencies,
) {
  await dependencies.requireRole("admin");
  const attachmentId = formValue(formData, "attachment_id");
  if (!validId(attachmentId)) {
    return dependencyRedirect(dependencies, formData, "error=attachment-delete");
  }

  try {
    const repository = await dependencies.repositoryFactory();
    const attachment = await repository.findById(attachmentId);
    if (attachment.error || !attachment.data) {
      return dependencyRedirect(dependencies, formData, "error=attachment-delete");
    }

    const storage = await dependencies.storageFactory();
    const removed = await storage.remove([attachment.data.storage_path]);
    if (removed.error) {
      return dependencyRedirect(dependencies, formData, "error=attachment-delete");
    }

    const deleted = await repository.deleteById(attachmentId);
    if (deleted.error || !deleted.data) {
      return dependencyRedirect(dependencies, formData, "error=attachment-delete");
    }
  } catch {
    return dependencyRedirect(dependencies, formData, "error=attachment-delete");
  }

  return dependencyRedirect(dependencies, formData, "notice=attachment-deleted");
}

async function createLessonAttachmentRepository(): Promise<LessonAttachmentRepository> {
  const supabase = await createClient();
  return {
    deleteById: async (attachmentId) => {
      const result = await supabase
        .from("attachments")
        .delete()
        .eq("id", attachmentId)
        .select("id")
        .maybeSingle();
      return result as unknown as Result<{ id: string } | null>;
    },
    findById: async (attachmentId) => {
      const result = await supabase
        .from("attachments")
        .select("id, lesson_id, mime_type, original_filename, size_bytes, storage_path")
        .eq("id", attachmentId)
        .maybeSingle();
      return result as unknown as Result<LessonAttachment | null>;
    },
    insert: async (attachments) => {
      const result = await supabase.from("attachments").insert(attachments);
      return { data: null, error: result.error };
    },
    listForLesson: async (lessonId) => {
      const result = await supabase
        .from("attachments")
        .select("id, lesson_id, mime_type, original_filename, size_bytes, storage_path")
        .eq("lesson_id", lessonId);
      return result as unknown as Result<LessonAttachment[] | null>;
    },
  };
}

async function createAttachmentStorage(): Promise<AttachmentStorage> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("첨부 저장소 환경 변수가 설정되지 않았습니다.");
  }

  const storage = createServiceClient<Database>(url, serviceRoleKey).storage.from(ATTACHMENT_BUCKET);
  return {
    createSignedUrl: async (path, expiresIn) => {
      const result = await storage.createSignedUrl(path, expiresIn);
      return result as unknown as Result<{ signedUrl: string } | null>;
    },
    remove: async (paths) => {
      const result = await storage.remove(paths);
      return { data: null, error: result.error };
    },
    upload: async (path, file) => {
      const result = await storage.upload(path, file as unknown as Parameters<typeof storage.upload>[1], {
        contentType: file.type,
        upsert: false,
      });
      return { data: null, error: result.error };
    },
  };
}
