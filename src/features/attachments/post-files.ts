import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect as nextRedirect } from "next/navigation";

import { requireRole as defaultRequireRole, type Role } from "../../lib/auth/require-role";
import { createClient } from "../../lib/supabase/server";
import type { Database } from "../../types/database";
import {
  validateAttachmentCount,
  validateAttachmentFile,
  type AttachmentFileInput,
} from "./validation";
import { sendStorageWarning } from "../storage/alerts";

type FormDataLike = {
  get: (name: string) => unknown;
  getAll: (name: string) => unknown[];
};

type UploadFile = AttachmentFileInput;

type PostAttachment = {
  id: string;
  post_id: string;
  mime_type: string;
  original_filename: string;
  size_bytes: number;
  storage_path: string;
};

type PostAttachmentInsert = Omit<PostAttachment, "id">;
type Result<T> = { data: T; error: unknown };

type PostAttachmentRepository = {
  deleteById: (attachmentId: string) => Promise<Result<{ id: string } | null>>;
  findById: (attachmentId: string) => Promise<Result<PostAttachment | null>>;
  findOwnedPost: (postId: string, authorId: string) => Promise<Result<{ id: string } | null>>;
  insert: (attachments: PostAttachmentInsert[]) => Promise<Result<null>>;
  listForPost: (postId: string) => Promise<Result<PostAttachment[] | null>>;
};

type AttachmentStorage = {
  createSignedUrl: (path: string, expiresIn: number) => Promise<Result<{ signedUrl: string } | null>>;
  move: (fromPath: string, toPath: string) => Promise<Result<null>>;
  remove: (paths: string[]) => Promise<Result<null>>;
  upload: (path: string, file: UploadFile) => Promise<Result<null>>;
};

type QuotaClaim = { reservation_id: string | null; upload_allowed: boolean; warning_claimed: boolean };
type StorageQuotaGateway = {
  claim: (bytes: number) => Promise<Result<QuotaClaim[] | null>>;
  release: (reservationId: string) => Promise<Result<boolean | null>>;
  sendFailed: () => Promise<Result<boolean | null>>;
};

export type PostFileDependencies = {
  createPath: (postId: string) => string;
  redirect: (path: string) => never;
  repositoryFactory: () => Promise<PostAttachmentRepository>;
  requireRole: (role: Role) => Promise<{ id: string; role: Role }>;
  storageFactory: () => Promise<AttachmentStorage>;
  quotaFactory: () => Promise<StorageQuotaGateway>;
  sendWarning: () => Promise<{ sent: boolean }>;
};

export type PostUploadValidation =
  | { valid: true }
  | { valid: false; reason: string };

export type PostAttachmentSaveResult =
  | { ok: true }
  | { ok: false; reason: "save_failed" | "cleanup_failed" };

const ATTACHMENT_BUCKET = "attachments";
const DOWNLOAD_URL_TTL_SECONDS = 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const defaultDependencies: PostFileDependencies = {
  createPath: (postId) => `posts/${postId}/${globalThis.crypto.randomUUID()}`,
  redirect: nextRedirect,
  repositoryFactory: createPostAttachmentRepository,
  requireRole: defaultRequireRole,
  storageFactory: createAttachmentStorage,
  quotaFactory: createStorageQuotaGateway,
  sendWarning: () => sendStorageWarning({ recipient: process.env.STORAGE_ALERT_RECIPIENT ?? "", apiKey: process.env.RESEND_API_KEY ?? "", from: process.env.RESEND_FROM ?? "" }),
};

export function validatePostUpload(
  existingCount: number,
  files: readonly AttachmentFileInput[],
): PostUploadValidation {
  const count = validateAttachmentCount(existingCount + files.length);
  if (!count.valid) {
    return count;
  }

  for (const file of files) {
    const result = validateAttachmentFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

function isValidId(value: string) {
  return uuid.test(value);
}

function formValue(formData: FormDataLike, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUploadFile(value: unknown): value is UploadFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const file = value as AttachmentFileInput;
  return (
    typeof file.name === "string" &&
    typeof file.size === "number" &&
    typeof file.type === "string"
  );
}

function filesFrom(formData: FormDataLike): UploadFile[] | null {
  const files = formData.getAll("files");
  return files.every(isUploadFile) ? (files as UploadFile[]) : null;
}

function boardPath(postId: string) {
  return `/board/${encodeURIComponent(postId)}`;
}

async function cleanupPaths(storage: AttachmentStorage, paths: string[]) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const removed = await storage.remove(paths);
      if (!removed.error) return true;
    } catch {
      // 두 번 모두 실패하면 호출자에게 경로 없는 cleanup 오류만 돌려준다.
    }
  }
  return false;
}

async function releaseReservation(quota: StorageQuotaGateway, reservationId: string | null) {
  if (!reservationId) return true;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const released = await quota.release(reservationId);
      if (!released.error && released.data === true) return true;
    } catch {}
  }
  return false;
}

async function rearmWarning(quota: StorageQuotaGateway, warningClaimed: boolean) {
  if (!warningClaimed) return true;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const rearmed = await quota.sendFailed();
      if (!rearmed.error && rearmed.data === true) return true;
    } catch {}
  }
  return false;
}

async function finalizeFailedUpload({ storage, paths, quota, reservationId, warningClaimed }: { storage: AttachmentStorage | null; paths: string[]; quota: StorageQuotaGateway | null; reservationId: string | null; warningClaimed: boolean }) {
  const cleaned = !storage || !paths.length || await cleanupPaths(storage, paths);
  const rearmed = !quota || await rearmWarning(quota, warningClaimed);
  const released = !quota || await releaseReservation(quota, reservationId);
  return cleaned && rearmed && released;
}

function trashPathFor(attachment: PostAttachment) {
  return `trash/posts/${attachment.post_id}/${attachment.id}-${globalThis.crypto.randomUUID()}`;
}

/**
 * Stores attachments after the caller has authenticated the post author.
 * A failed metadata insert removes every newly uploaded object.
 */
export async function savePostAttachments(
  postId: string,
  authorId: string,
  files: readonly UploadFile[],
  dependencies: PostFileDependencies = defaultDependencies,
): Promise<PostAttachmentSaveResult> {
  if (!isValidId(postId) || !isValidId(authorId) || files.length === 0) {
    return { ok: false, reason: "save_failed" };
  }

  let storage: AttachmentStorage | null = null;
  const paths: string[] = [];
  let quota: StorageQuotaGateway | null = null;
  let reservationId: string | null = null;
  let warningClaimed = false;
  let metadataSaved = false;
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  try {
    const repository = await dependencies.repositoryFactory();
    const ownedPost = await repository.findOwnedPost(postId, authorId);
    if (ownedPost.error || !ownedPost.data) {
      return { ok: false, reason: "save_failed" };
    }

    const existing = await repository.listForPost(postId);
    if (existing.error || !existing.data || !validatePostUpload(existing.data.length, files).valid) {
      return { ok: false, reason: "save_failed" };
    }

    quota = await dependencies.quotaFactory();
    const claim = await quota.claim(totalBytes);
    const claimed = claim.data?.[0];
    if (claim.error || !claimed || !claimed.upload_allowed || !claimed.reservation_id) return { ok: false, reason: "save_failed" };
    reservationId = claimed.reservation_id;
    warningClaimed = claimed.warning_claimed;
    storage = await dependencies.storageFactory();
    for (const file of files) {
      const path = dependencies.createPath(postId);
      const uploaded = await storage.upload(path, file);
      if (uploaded.error) {
        if (!(await finalizeFailedUpload({ storage, paths, quota, reservationId, warningClaimed }))) return { ok: false, reason: "cleanup_failed" };
        return { ok: false, reason: "save_failed" };
      }
      paths.push(path);
    }

    const inserted = await repository.insert(
      files.map((file, index) => ({
        post_id: postId,
        mime_type: file.type,
        original_filename: file.name,
        size_bytes: file.size,
        storage_path: paths[index],
      })),
    );
    if (inserted.error) {
      return { ok: false, reason: await finalizeFailedUpload({ storage, paths, quota, reservationId, warningClaimed }) ? "save_failed" : "cleanup_failed" };
    }
    metadataSaved = true;

    if (warningClaimed) {
      const warning = await dependencies.sendWarning();
      const rearmed = warning.sent || await rearmWarning(quota, true);
      const released = await releaseReservation(quota, reservationId);
      if (!rearmed || !released) return { ok: false, reason: "cleanup_failed" };
      return { ok: true };
    }
    if (!(await releaseReservation(quota, reservationId))) return { ok: false, reason: "cleanup_failed" };
    return { ok: true };
  } catch {
    // 메타데이터가 이미 커밋된 뒤의 알림/예약 예외는 실제 파일을 지우면
    // DB가 가리키는 경로만 남는다. 그 경우 재무장과 예약 해제만 보상한다.
    const finalized = await finalizeFailedUpload({ storage, paths: metadataSaved ? [] : paths, quota, reservationId, warningClaimed });
    return {
      ok: false,
      reason: finalized ? "save_failed" : "cleanup_failed",
    };
  }
}

export async function uploadPostAttachments(
  formData: FormDataLike,
  dependencies: PostFileDependencies = defaultDependencies,
) {
  const profile = await dependencies.requireRole("member");
  const postId = formValue(formData, "post_id");
  const files = filesFrom(formData);
  if (!isValidId(postId) || !files || files.length === 0) {
    return dependencies.redirect("/board");
  }

  const saved = await savePostAttachments(postId, profile.id, files, dependencies);
  return dependencies.redirect(
    `${boardPath(postId)}?${saved.ok ? "notice=attachment-uploaded" : `error=attachment-${saved.reason === "cleanup_failed" ? "cleanup" : "save"}`}`,
  );
}

export async function downloadPostAttachment(
  formData: FormDataLike,
  dependencies: PostFileDependencies = defaultDependencies,
) {
  await dependencies.requireRole("member");
  const attachmentId = formValue(formData, "attachment_id");
  if (!isValidId(attachmentId)) {
    return dependencies.redirect("/board");
  }

  let signedUrl: string | null = null;
  try {
    const repository = await dependencies.repositoryFactory();
    const attachment = await repository.findById(attachmentId);
    if (attachment.error || !attachment.data || !isValidId(attachment.data.post_id)) {
      return dependencies.redirect("/board");
    }

    const storage = await dependencies.storageFactory();
    const signed = await storage.createSignedUrl(
      attachment.data.storage_path,
      DOWNLOAD_URL_TTL_SECONDS,
    );
    if (signed.error || !signed.data?.signedUrl) {
      return dependencies.redirect("/board");
    }

    signedUrl = signed.data.signedUrl;
  } catch {
    return dependencies.redirect("/board");
  }

  return dependencies.redirect(signedUrl);
}

export async function deletePostAttachment(
  formData: FormDataLike,
  dependencies: PostFileDependencies = defaultDependencies,
) {
  const profile = await dependencies.requireRole("member");
  const attachmentId = formValue(formData, "attachment_id");
  const postId = formValue(formData, "post_id");
  if (!isValidId(attachmentId) || !isValidId(postId)) {
    return dependencies.redirect("/board");
  }

  try {
    const repository = await dependencies.repositoryFactory();
    const attachment = await repository.findById(attachmentId);
    const ownedPost = await repository.findOwnedPost(postId, profile.id);
    if (
      attachment.error ||
      !attachment.data ||
      attachment.data.post_id !== postId ||
      ownedPost.error ||
      !ownedPost.data
    ) {
      return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
    }

    const storage = await dependencies.storageFactory();
    const trashPath = trashPathFor(attachment.data);
    const moved = await storage.move(attachment.data.storage_path, trashPath);
    if (moved.error) {
      return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
    }

    const deleted = await repository.deleteById(attachmentId);
    if (deleted.error || !deleted.data) {
      const restored = await storage.move(trashPath, attachment.data.storage_path);
      if (restored.error) {
        return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
      }
      return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
    }

    if (!(await cleanupPaths(storage, [trashPath]))) {
      return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
    }
    const quota = await dependencies.quotaFactory();
    await quota.claim(0);
  } catch {
    return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
  }

  return dependencies.redirect(`${boardPath(postId)}?notice=attachment-deleted`);
}

async function createPostAttachmentRepository(): Promise<PostAttachmentRepository> {
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
        .select("id, post_id, mime_type, original_filename, size_bytes, storage_path")
        .eq("id", attachmentId)
        .maybeSingle();
      return result as unknown as Result<PostAttachment | null>;
    },
    findOwnedPost: async (postId, authorId) => {
      const result = await supabase
        .from("posts")
        .select("id")
        .eq("id", postId)
        .eq("author_id", authorId)
        .maybeSingle();
      return result as unknown as Result<{ id: string } | null>;
    },
    insert: async (attachments) => {
      const result = await supabase.from("attachments").insert(attachments);
      return { data: null, error: result.error };
    },
    listForPost: async (postId) => {
      const result = await supabase
        .from("attachments")
        .select("id, post_id, mime_type, original_filename, size_bytes, storage_path")
        .eq("post_id", postId);
      return result as unknown as Result<PostAttachment[] | null>;
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
      const result = await storage.upload(
        path,
        file as unknown as Parameters<typeof storage.upload>[1],
        { contentType: file.type, upsert: false },
      );
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

function createServiceQuotaClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("저장량 서비스 환경 변수가 설정되지 않았습니다.");
  return createServiceClient<Database>(url, serviceRoleKey);
}
