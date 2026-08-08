const WARNING_RATIO = 0.8;
const REARM_RATIO = 0.75;
const BLOCK_RATIO = 0.95;

export function evaluateStorageAlert({ usageBytes, quotaBytes, warningState }: { usageBytes: number; quotaBytes: number; warningState: "armed" | "sent" }) {
  if (!Number.isSafeInteger(usageBytes) || !Number.isSafeInteger(quotaBytes) || usageBytes < 0 || quotaBytes <= 0) throw new RangeError("저장량을 확인할 수 없습니다.");
  const ratio = usageBytes / quotaBytes;
  return {
    uploadAllowed: ratio < BLOCK_RATIO,
    claimWarning: ratio >= WARNING_RATIO && warningState === "armed",
    rearm: ratio < REARM_RATIO && warningState === "sent",
  };
}

export async function sendStorageWarning({ fetcher = globalThis.fetch, recipient, apiKey, from }: { fetcher?: typeof globalThis.fetch; recipient: string; apiKey: string; from: string }) {
  if (!recipient || !apiKey || !from) return { sent: false };
  try {
    const response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [recipient], subject: "저장공간 사용량 경고", text: "저장공간 사용량이 80% 이상입니다." }) });
    return { sent: response.ok };
  } catch { return { sent: false }; }
}
