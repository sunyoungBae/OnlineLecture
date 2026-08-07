"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

function safeNextPath(value: string | null) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%(?:2f|5c)/i.test(value)
  ) {
    return "/";
  }

  const target = new globalThis.URL(value, globalThis.location.origin);
  if (target.origin !== globalThis.location.origin) {
    return "/";
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

export default function LoginPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const callbackError = new globalThis.URLSearchParams(globalThis.location.search).get(
      "error",
    );
    if (callbackError === "oauth_callback") {
      setError("Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.");
    }
  }, []);

  async function signInWithGoogle() {
    setError("");

    try {
      const next = safeNextPath(
        new globalThis.URLSearchParams(globalThis.location.search).get("next"),
      );
      const callback = new globalThis.URL("/auth/callback", globalThis.location.origin);
      callback.searchParams.set("next", next);

      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          scopes: "openid email profile",
          skipBrowserRedirect: true,
        },
      });

      if (signInError || !data.url) {
        throw signInError ?? new Error("OAuth URL이 없습니다.");
      }

      globalThis.location.assign(data.url);
    } catch {
      setError("로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="text-4xl font-semibold tracking-tight">로그인</h1>
      <p className="mt-6 text-[var(--muted-foreground)]">
        Google 계정으로 로그인해 강의와 커뮤니티를 이용하세요.
      </p>
      <button
        className="mt-8 min-h-11 border border-[var(--foreground)] bg-[var(--surface)] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        type="button"
        onClick={signInWithGoogle}
      >
        Google로 계속하기
      </button>
      {error ? (
        <p className="mt-4 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
