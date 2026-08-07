"use client";

import { useActionState } from "react";

import { completeOnboarding, initialOnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    initialOnboardingState,
  );
  const error = state.status === "error" ? state.message : null;

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="nickname">
          별명
        </label>
        <input
          aria-describedby={error ? "nickname-error" : "nickname-help"}
          aria-invalid={Boolean(error)}
          className="mt-2 w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          id="nickname"
          maxLength={20}
          minLength={2}
          name="nickname"
          pattern="[가-힣A-Za-z0-9_]{2,20}"
          required
          type="text"
        />
        <p className="mt-2 text-sm text-[var(--muted-foreground)]" id="nickname-help">
          2~20자의 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.
        </p>
        {error ? (
          <p className="mt-2 text-sm text-[var(--destructive)]" id="nickname-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button
        className="min-h-11 rounded-sm border border-transparent bg-[var(--accent)] px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "저장 중..." : "별명 저장"}
      </button>
    </form>
  );
}
