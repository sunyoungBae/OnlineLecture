import { describe, expect, it, vi } from "vitest";
import { evaluateStorageAlert, sendStorageWarning } from "./alerts";

describe("저장량 경고", () => {
  it("80% 미만은 발송하지 않고 80% 최초 claim만 발송하며 75% 아래에서 재무장한다", () => {
    expect(evaluateStorageAlert({ usageBytes: 79, quotaBytes: 100, warningState: "armed" })).toMatchObject({ claimWarning: false, uploadAllowed: true });
    expect(evaluateStorageAlert({ usageBytes: 80, quotaBytes: 100, warningState: "armed" })).toMatchObject({ claimWarning: true });
    expect(evaluateStorageAlert({ usageBytes: 90, quotaBytes: 100, warningState: "sent" })).toMatchObject({ claimWarning: false });
    expect(evaluateStorageAlert({ usageBytes: 74, quotaBytes: 100, warningState: "sent" })).toMatchObject({ rearm: true });
  });
  it("95% 이상은 차단하고 삭제 후 즉시 다시 허용한다", () => {
    expect(evaluateStorageAlert({ usageBytes: 95, quotaBytes: 100, warningState: "sent" }).uploadAllowed).toBe(false);
    expect(evaluateStorageAlert({ usageBytes: 94, quotaBytes: 100, warningState: "sent" }).uploadAllowed).toBe(true);
  });
  it("Resend 실패는 키와 원문을 노출하지 않아 재시도할 수 있다", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    await expect(sendStorageWarning({ fetcher, recipient: "owner@example.com", apiKey: "secret", from: "alerts@example.com" })).resolves.toEqual({ sent: false });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("발신자 환경 값이 없으면 Resend 요청과 비밀 노출 없이 실패한다", async () => {
    const fetcher = vi.fn();
    await expect(sendStorageWarning({ fetcher, recipient: "owner@example.com", apiKey: "secret", from: "" })).resolves.toEqual({ sent: false });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
