export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TARGET = 3;

const ALLOWED_MIME_TYPES = new Map<string, ReadonlySet<string>>([
  ["jpg", new Set(["image/jpeg"])],
  ["jpeg", new Set(["image/jpeg"])],
  ["png", new Set(["image/png"])],
  ["webp", new Set(["image/webp"])],
  ["gif", new Set(["image/gif"])],
  ["pdf", new Set(["application/pdf"])],
  ["doc", new Set(["application/msword"])],
  [
    "docx",
    new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
  ],
  ["ppt", new Set(["application/vnd.ms-powerpoint"])],
  [
    "pptx",
    new Set([
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]),
  ],
  ["xls", new Set(["application/vnd.ms-excel"])],
  [
    "xlsx",
    new Set([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]),
  ],
  ["zip", new Set(["application/zip", "application/x-zip-compressed"])],
]);

const ALL_ALLOWED_MIME_TYPES = new Set(
  [...ALLOWED_MIME_TYPES.values()].flatMap((types) => [...types]),
);

export type AttachmentFileInput = {
  name: string;
  type: string;
  size: number;
};

export type AttachmentValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "unsupported_type"
        | "type_mismatch"
        | "file_too_large"
        | "invalid_size";
    };

export type AttachmentCountValidationResult =
  | { valid: true }
  | { valid: false; reason: "too_many_files" | "invalid_count" };

export function validateAttachmentFile(
  file: AttachmentFileInput,
): AttachmentValidationResult {
  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    return { valid: false, reason: "invalid_size" };
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { valid: false, reason: "file_too_large" };
  }

  const extension = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1];
  if (!extension) {
    return { valid: false, reason: "unsupported_type" };
  }

  const allowedTypes = ALLOWED_MIME_TYPES.get(extension);

  if (!allowedTypes) {
    return {
      valid: false,
      reason: ALL_ALLOWED_MIME_TYPES.has(file.type)
        ? "type_mismatch"
        : "unsupported_type",
    };
  }

  if (!allowedTypes.has(file.type)) {
    return { valid: false, reason: "type_mismatch" };
  }

  return { valid: true };
}

export function validateAttachmentCount(
  totalCount: number,
): AttachmentCountValidationResult {
  if (!Number.isInteger(totalCount) || totalCount < 0) {
    return { valid: false, reason: "invalid_count" };
  }

  if (totalCount > MAX_ATTACHMENTS_PER_TARGET) {
    return { valid: false, reason: "too_many_files" };
  }

  return { valid: true };
}
