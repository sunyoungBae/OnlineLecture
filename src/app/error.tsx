"use client";

import { EmptyState } from "../components/states/empty-state";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <EmptyState description="잠시 후 다시 시도해 주세요." headingLevel="h1" role="alert" title="일시적인 오류가 발생했습니다">
        <button className="min-h-11 border border-[var(--foreground)] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={reset} type="button">
          다시 시도
        </button>
      </EmptyState>
    </main>
  );
}
