import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

function getPublicConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase 공개 환경 변수가 설정되지 않았습니다.");
  }

  return { anonKey, url };
}

export function createClient() {
  const { anonKey, url } = getPublicConfiguration();

  return createBrowserClient<Database>(url, anonKey, {
    auth: { flowType: "pkce" },
  });
}
