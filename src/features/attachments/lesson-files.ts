import { validateAttachmentCount, validateAttachmentFile, type AttachmentFileInput } from "./validation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import * as navigation from "next/navigation";

import { requireRole as defaultRequireRole, type Role } from "../../lib/auth/require-role";
import { createClient } from "../../lib/supabase/server";
import type { Database } from "../../types/database";
import { sendStorageWarning } from "../storage/alerts";

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
  move: (fromPath: string, toPath: string) => Promise<Result<null>>;
  remove: (paths: string[]) => Promise<Result<null>>;
  upload: (path: string, file: UploadFile) => Promise<Result<null>>;
};
type QuotaClaim = { reservation_id: string | null; upload_allowed: boolean; warning_claimed: boolean };
type StorageQuotaGateway = { claim: (bytes: number) => Promise<Result<QuotaClaim[] | null>>; release: (reservationId: string) => Promise<Result<boolean | null>>; sendFailed: () => Promise<Result<boolean | null>> };

export type LessonFileDependencies = {
  createPath: (lessonId: string) => string;
  redirect: (path: string) => never;
  repositoryFactory: () => Promise<LessonAttachmentRepository>;
  requireRole: (role: Role) => Promise<{ id: string; role: Role }>;
  storageFactory: () => Promise<AttachmentStorage>;
  quotaFactory: () => Promise<StorageQuotaGateway>;
  sendWarning: () => Promise<{ sent: boolean }>;
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
  quotaFactory: createStorageQuotaGateway,
  sendWarning: () => sendStorageWarning({ recipient: process.env.STORAGE_ALERT_RECIPIENT ?? "", apiKey: process.env.RESEND_API_KEY ?? "", from: process.env.RESEND_FROM ?? "" }),
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

function trashPathFor(attachment: LessonAttachment) {
  return `trash/${attachment.lesson_id}/${attachment.id}-${globalThis.crypto.randomUUID()}`;
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
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  let quota: StorageQuotaGateway | null = null;
  let reservationId: string | null = null;
  let warningClaimed = false;
  try {
    quota = await dependencies.quotaFactory();
    const claim = await quota.claim(totalBytes);
    const claimed = claim.data?.[0];
    if (claim.error || !claimed || !claimed.upload_allowed || !claimed.reservation_id) return dependencyRedirect(dependencies, formData, "error=attachment-save");
    reservationId = claimed.reservation_id;
    warningClaimed = claimed.warning_claimed;
    const storage = await dependencies.storageFactory();
    for (const file of files) {
      const storagePath = dependencies.createPath(lessonId);
      const { error } = await storage.upload(storagePath, file);
      if (error) {
        if (storagePaths.length) {
          await storage.remove(storagePaths);
        }
        if (warningClaimed) await quota.sendFailed();
        if (!(await releaseReservation(quota, reservationId))) return dependencyRedirect(dependencies, formData, "error=attachment-cleanup");
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
      if (warningClaimed) await quota.sendFailed();
      if (!(await releaseReservation(quota, reservationId))) return dependencyRedirect(dependencies, formData, "error=attachment-cleanup");
      return dependencyRedirect(dependencies, formData, "error=attachment-save");
    }
    if (warningClaimed) { const warning = await dependencies.sendWarning(); if (!warning.sent) await quota.sendFailed(); }
    if (!(await releaseReservation(quota, reservationId))) return dependencyRedirect(dependencies, formData, "error=attachment-cleanup");
  } catch {
    if (quota && !(await releaseReservation(quota, reservationId))) return dependencyRedirect(dependencies, formData, "error=attachment-cleanup");
    if (quota && warningClaimed) await quota.sendFailed().catch(() => undefined);
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
    const trashPath = trashPathFor(attachment.data);
    const moved = await storage.move(attachment.data.storage_path, trashPath);
    if (moved.error) {
      return dependencyRedirect(dependencies, formData, "error=attachment-delete");
    }

    const deleted = await repository.deleteById(attachmentId);
    if (deleted.error || !deleted.data) {
      await storage.move(trashPath, attachment.data.storage_path);
      return dependencyRedirect(dependencies, formData, "error=attachment-delete");
    }

    const removed = await storage.remove([trashPath]);
    if (removed.error) {
      // DB 메타데이터는 이미 삭제됐으므로 경로를 노출하지 않고 잔여 trash 객체는 운영 정리 대상으로 둔다.
      return dependencyRedirect(dependencies, formData, "error=attachment-delete");
    }
    const quota = await dependencies.quotaFactory();
    await quota.claim(0);
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
    move: async (fromPath, toPath) => {
      const result = await storage.move(fromPath, toPath);
      return { data: null, error: result.error };
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

async function createStorageQuotaGateway(): Promise<StorageQuotaGateway> {
  return {
    claim: async (bytes) => (await createServiceQuotaClient().rpc("storage_usage_claim", { p_incoming_bytes: bytes })) as unknown as Result<QuotaClaim[] | null>,
    release: async (reservationId) => (await createServiceQuotaClient().rpc("storage_usage_release", { p_reservation_id: reservationId })) as unknown as Result<boolean | null>,
    sendFailed: async () => (await createServiceQuotaClient().rpc("storage_warning_send_failed")) as unknown as Result<boolean | null>,
  };
}

async function releaseReservation(quota: StorageQuotaGateway, reservationId: string | null) {
  if (!reservationId) return true;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { const result = await quota.release(reservationId); if (!result.error && result.data === true) return true; } catch {}
  }
  return false;
}

function createServiceQuotaClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("저장량 서비스 환경 변수가 설정되지 않았습니다.");
  return createServiceClient<Database>(url, serviceRoleKey);
}
