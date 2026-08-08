import { validateAttachmentCount, validateAttachmentFile, type AttachmentFileInput } from "./validation";

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
