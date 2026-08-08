import { describe, expect, it } from "vitest";
import { validateLessonUpload } from "./lesson-files";

describe("validateLessonUpload", () => {
  it("3개와 10MB, MIME·확장자 조건을 함께 강제한다", () => {
    expect(validateLessonUpload(2, [{ name: "guide.pdf", size: 10 * 1024 * 1024, type: "application/pdf" }])).toEqual({ valid: true });
    expect(validateLessonUpload(3, [{ name: "guide.pdf", size: 1, type: "application/pdf" }])).toEqual({ valid: false, reason: "too_many_files" });
    expect(validateLessonUpload(0, [{ name: "guide.pdf", size: 1, type: "text/plain" }])).toEqual({ valid: false, reason: "type_mismatch" });
  });
});
