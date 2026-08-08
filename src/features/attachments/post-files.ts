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
  restore: (attachment: PostAttachment) => Promise<Result<null>>;
};

type AttachmentStorage = {
  createSignedUrl: (path: string, expiresIn: number) => Promise<Result<{ signedUrl: string } | null>>;
  remove: (paths: string[]) => Promise<Result<null>>;
  upload: (path: string, file: UploadFile) => Promise<Result<null>>;
};

export type PostFileDependencies = {
  createPath: (postId: string) => string;
  redirect: (path: string) => never;
  repositoryFactory: () => Promise<PostAttachmentRepository>;
  requireRole: (role: Role) => Promise<{ id: string; role: Role }>;
  storageFactory: () => Promise<AttachmentStorage>;
};

export type PostUploadValidation =
  | { valid: true }
  | { valid: false; reason: string };

export type PostAttachmentSaveResult = { ok: true } | { ok: false };

const ATTACHMENT_BUCKET = "attachments";
const DOWNLOAD_URL_TTL_SECONDS = 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const defaultDependencies: PostFileDependencies = {
  createPath: (postId) => `posts/${postId}/${globalThis.crypto.randomUUID()}`,
  redirect: nextRedirect,
  repositoryFactory: createPostAttachmentRepository,
  requireRole: defaultRequireRole,
  storageFactory: createAttachmentStorage,
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
    return { ok: false };
  }

  try {
    const repository = await dependencies.repositoryFactory();
    const ownedPost = await repository.findOwnedPost(postId, authorId);
    if (ownedPost.error || !ownedPost.data) {
      return { ok: false };
    }

    const existing = await repository.listForPost(postId);
    if (existing.error || !existing.data || !validatePostUpload(existing.data.length, files).valid) {
      return { ok: false };
    }

    const storage = await dependencies.storageFactory();
    const paths: string[] = [];
    for (const file of files) {
      const path = dependencies.createPath(postId);
      const uploaded = await storage.upload(path, file);
      if (uploaded.error) {
        if (paths.length) {
          await storage.remove(paths);
        }
        return { ok: false };
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
      await storage.remove(paths);
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
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
    `${boardPath(postId)}?${saved.ok ? "notice=attachment-uploaded" : "error=attachment-save"}`,
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

    return dependencies.redirect(signed.data.signedUrl);
  } catch {
    return dependencies.redirect("/board");
  }
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

    const deleted = await repository.deleteById(attachmentId);
    if (deleted.error || !deleted.data) {
      return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
    }

    const storage = await dependencies.storageFactory();
    const removed = await storage.remove([attachment.data.storage_path]);
    if (removed.error) {
      await repository.restore(attachment.data);
      return dependencies.redirect(`${boardPath(postId)}?error=attachment-delete`);
    }
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
    restore: async (attachment) => {
      const result = await supabase.from("attachments").insert(attachment);
      return { data: null, error: result.error };
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
      const result = await storage.upload(
        path,
        file as unknown as Parameters<typeof storage.upload>[1],
        { contentType: file.type, upsert: false },
      );
      return { data: null, error: result.error };
    },
  };
}
