import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("./actions", () => ({ createLesson: vi.fn(), deleteLesson: vi.fn(), moveLesson: vi.fn(), updateLesson: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requirePageRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { lessonFeedback } from "./page";

describe("lessonFeedback", () => {
  it("notice와 error 코드를 고정 한국어 상태 메시지로만 매핑한다", () => {
    expect(lessonFeedback({ notice: "lesson-moved" })).toEqual({ role: "status", text: "회차 순서를 변경했습니다." });
    expect(lessonFeedback({ error: "save" })).toEqual({ role: "alert", text: "회차를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    expect(lessonFeedback({ error: "database secret" })).toBeNull();
  });
});
