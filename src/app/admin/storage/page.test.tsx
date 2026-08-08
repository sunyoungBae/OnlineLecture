import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requirePageRole: vi.fn().mockResolvedValue({ id: "admin", role: "admin" }) }));
vi.mock("../../../lib/auth/require-role", () => ({ requirePageRole: vi.fn().mockResolvedValue({ id: "admin", role: "admin" }) }));

import { requirePageRole } from "../../../lib/auth/require-role";
import { loadAdminStorage, renderAdminStoragePage, type AdminStorageClient } from "./page";

const text = (node: any): string => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
function client({ usage = 800, quota = 1000, error = null }: { usage?: number; quota?: number; error?: unknown } = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: error ? null : { quota_bytes: quota, reserved_bytes: 0, warning_state: "sent", last_warning_email_sent_at: null }, error });
  const selectSettings = vi.fn().mockReturnValue({ maybeSingle });
  const selectAttachments = vi.fn().mockResolvedValue({ data: error ? null : [{ size_bytes: usage }], error });
  return { from: vi.fn((table: string) => table === "storage_settings" ? { select: selectSettings } : { select: selectAttachments }) } as unknown as AdminStorageClient;
}

describe("관리자 저장량 페이지", () => {
  it("관리자 guard 뒤 사용량과 80% 경고 상태를 보여준다", async () => {
    const loaded = await loadAdminStorage(async () => client());
    expect(requirePageRole).toHaveBeenCalledWith("admin", { nextPath: "/admin/storage" });
    expect(text(renderAdminStoragePage(loaded))).toContain("80%");
    expect(text(renderAdminStoragePage(loaded))).toContain("80.0%");
  });
  it("95% 차단과 일반 DB 오류를 구분해 안내한다", async () => {
    const blocked = await loadAdminStorage(async () => client({ usage: 950 }));
    const failed = await loadAdminStorage(async () => client({ error: new Error("secret") }));
    expect(text(renderAdminStoragePage(blocked))).toContain("업로드 차단");
    expect(text(renderAdminStoragePage(failed))).toContain("저장량 정보를 불러오지 못했습니다");
  });
});
