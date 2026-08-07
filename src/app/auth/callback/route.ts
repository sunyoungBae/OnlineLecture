import { NextResponse, type NextRequest } from "next/server.js";

import { createClient } from "@/lib/supabase/server";

type CallbackClientFactory = () => Promise<{
  auth: {
    exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>;
  };
}>;

function safeNextPath(value: string | null, origin: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  const target = new globalThis.URL(value, origin);
  if (target.origin !== origin) {
    return "/";
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

function callbackErrorUrl(request: NextRequest) {
  const url = new globalThis.URL("/login", siteOrigin(request));
  url.searchParams.set("error", "oauth_callback");
  return url;
}

function siteOrigin(request: NextRequest) {
  return new globalThis.URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin,
  ).origin;
}

export async function handleOAuthCallback(
  request: NextRequest,
  createCallbackClient: CallbackClientFactory = createClient,
) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(callbackErrorUrl(request));
  }

  const next = safeNextPath(
    request.nextUrl.searchParams.get("next"),
    siteOrigin(request),
  );

  try {
    const supabase = await createCallbackClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(callbackErrorUrl(request));
    }
  } catch {
    return NextResponse.redirect(callbackErrorUrl(request));
  }

  return NextResponse.redirect(new globalThis.URL(next, siteOrigin(request)));
}

export async function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}
