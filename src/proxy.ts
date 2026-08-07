import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server.js";

import type { Database } from "@/types/database";

type SessionClientFactory = (
  url: string,
  anonKey: string,
  options: {
    auth: { flowType: "pkce" };
    cookies: {
      getAll: () => { name: string; value: string }[];
      setAll: (
        cookies: { name: string; value: string; options?: CookieOptions }[],
      ) => void;
    };
  },
) => {
  auth: { getClaims: () => Promise<unknown> };
};

const createSessionClient: SessionClientFactory = (url, anonKey, options) =>
  createServerClient<Database>(url, anonKey, options);

export async function refreshSession(
  request: NextRequest,
  clientFactory: SessionClientFactory = createSessionClient,
) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = clientFactory(url, anonKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, options, value } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
