import { requirePageRole } from "../../../lib/auth/require-role";
import { createClient } from "../../../lib/supabase/server";
import { EmptyState } from "../../../components/states/empty-state";

export type AdminStorageClient = {
  from: (table: "storage_settings" | "attachments") => {
    select: (columns: string) => { maybeSingle?: () => Promise<{ data: { quota_bytes: number; reserved_bytes: number; warning_state: string; last_warning_email_sent_at: string | null } | null; error: unknown }>; } | Promise<{ data: { size_bytes: number }[] | null; error: unknown }>;
  };
};

export async function loadAdminStorage(factory: () => Promise<AdminStorageClient> = async () => (await createClient()) as unknown as AdminStorageClient) {
  await requirePageRole("admin", { nextPath: "/admin/storage" });
  try {
    const client = await factory();
    const settingsQuery = client.from("storage_settings").select("quota_bytes,reserved_bytes,warning_state,last_warning_email_sent_at") as { maybeSingle: () => Promise<{ data: { quota_bytes: number; reserved_bytes: number; warning_state: string; last_warning_email_sent_at: string | null } | null; error: unknown }> };
    const attachmentsQuery = client.from("attachments").select("size_bytes") as unknown as Promise<{ data: { size_bytes: number }[] | null; error: unknown }>;
    const [settings, attachments] = await Promise.all([settingsQuery.maybeSingle(), attachmentsQuery]);
    if (settings.error || !settings.data || attachments.error) return { hasLoadError: true as const, quota: 0, usage: 0, warningState: "armed" };
    return { hasLoadError: false as const, quota: settings.data.quota_bytes, usage: (attachments.data ?? []).reduce((sum, attachment) => sum + attachment.size_bytes, 0) + settings.data.reserved_bytes, warningState: settings.data.warning_state };
  } catch { return { hasLoadError: true as const, quota: 0, usage: 0, warningState: "armed" }; }
}

export function renderAdminStoragePage(data: { hasLoadError: boolean; quota: number; usage: number; warningState: string }) {
  if (data.hasLoadError) return <main className="py-10"><h2 className="text-3xl font-semibold">저장공간 관리</h2><div className="mt-6 max-w-[var(--reading-max-width)]"><EmptyState action={{ href: "/admin/storage", label: "저장량 새로고침" }} description="잠시 후 다시 시도해 주세요." role="alert" title="저장량 정보를 불러오지 못했습니다" /></div></main>;
  const percent = data.quota ? (data.usage / data.quota) * 100 : 0;
  const blocked = percent >= 95;
  return <main className="py-10"><h2 className="text-3xl font-semibold">저장공간 관리</h2><p className="mt-4">사용량: {percent.toFixed(1)}%</p><p className="mt-2">경고 기준: 80%</p><p className="mt-2" role={blocked ? "alert" : "status"}>{blocked ? "업로드 차단: 95% 이상입니다." : data.warningState === "sent" ? "80% 경고를 발송했습니다." : "업로드 가능"}</p></main>;
}

export default async function AdminStoragePage() { return renderAdminStoragePage(await loadAdminStorage()); }
