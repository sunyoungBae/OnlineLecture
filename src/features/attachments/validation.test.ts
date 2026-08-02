import { describe, expect, it } from "vitest";

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TARGET,
  validateAttachmentCount,
  validateAttachmentFile,
} from "./validation";

describe("validateAttachmentFile", () => {
  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.JPEG", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.webp", "image/webp"],
    ["animation.gif", "image/gif"],
    ["guide.pdf", "application/pdf"],
    ["legacy.doc", "application/msword"],
    [
      "document.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["legacy.ppt", "application/vnd.ms-powerpoint"],
    [
      "slides.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    ["legacy.xls", "application/vnd.ms-excel"],
    [
      "sheet.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    ["archive.zip", "application/zip"],
  ])("허용된 확장자와 MIME 조합 %s를 허용한다", (name, type) => {
    expect(
      validateAttachmentFile({ name, type, size: MAX_ATTACHMENT_BYTES }),
    ).toEqual({ valid: true });
  });

  it.each([
    ["malware.exe", "application/octet-stream"],
    ["page.html", "text/html"],
    ["vector.svg", "image/svg+xml"],
    ["notes.txt", "text/plain"],
  ])("allowlist 밖 형식 %s를 거부한다", (name, type) => {
    expect(validateAttachmentFile({ name, type, size: 1 })).toEqual({
      valid: false,
      reason: "unsupported_type",
    });
  });

  it.each([
    ["image.jpg", "application/pdf"],
    ["document.pdf", "image/jpeg"],
    ["archive.zip", "application/x-msdownload"],
    ["double.pdf.exe", "application/pdf"],
  ])("확장자와 MIME이 위장된 조합 %s/%s를 거부한다", (name, type) => {
    expect(validateAttachmentFile({ name, type, size: 1 })).toEqual({
      valid: false,
      reason: "type_mismatch",
    });
  });

  it("확장자가 없는 파일을 거부한다", () => {
    expect(
      validateAttachmentFile({ name: "README", type: "application/pdf", size: 1 }),
    ).toEqual({ valid: false, reason: "unsupported_type" });
  });

  it("10MB를 초과하는 파일을 거부한다", () => {
    expect(
      validateAttachmentFile({
        name: "large.pdf",
        type: "application/pdf",
        size: MAX_ATTACHMENT_BYTES + 1,
      }),
    ).toEqual({ valid: false, reason: "file_too_large" });
  });

  it("음수이거나 유한하지 않은 파일 크기를 거부한다", () => {
    expect(
      validateAttachmentFile({ name: "bad.pdf", type: "application/pdf", size: -1 }),
    ).toEqual({ valid: false, reason: "invalid_size" });
    expect(
      validateAttachmentFile({
        name: "bad.pdf",
        type: "application/pdf",
        size: Number.NaN,
      }),
    ).toEqual({ valid: false, reason: "invalid_size" });
  });
});

describe("validateAttachmentCount", () => {
  it("게시글과 회차 모두 대상당 3개까지 허용한다", () => {
    expect(validateAttachmentCount(MAX_ATTACHMENTS_PER_TARGET)).toEqual({ valid: true });
  });

  it("대상당 3개를 초과하면 거부한다", () => {
    expect(validateAttachmentCount(MAX_ATTACHMENTS_PER_TARGET + 1)).toEqual({
      valid: false,
      reason: "too_many_files",
    });
  });

  it("음수나 정수가 아닌 개수를 거부한다", () => {
    expect(validateAttachmentCount(-1)).toEqual({ valid: false, reason: "invalid_count" });
    expect(validateAttachmentCount(1.5)).toEqual({ valid: false, reason: "invalid_count" });
  });
});
