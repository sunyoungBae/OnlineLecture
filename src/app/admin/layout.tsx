import type { ReactNode } from "react";

import { requirePageRole } from "../../lib/auth/require-role";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requirePageRole("admin", { nextPath: "/admin/courses" });

  return (
    <div className="mx-auto max-w-[var(--content-max-width)] px-[var(--page-padding)] py-8">
      <header className="border-b border-border pb-6">
        <p className="text-sm font-medium text-muted-foreground">운영</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">관리자</h1>
        <nav aria-label="관리자 메뉴" className="mt-6">
          <a
            className="inline-flex min-h-11 items-center rounded-sm border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
            href="/admin/courses"
          >
            강의 관리
          </a>
        </nav>
      </header>
      {children}
    </div>
  );
}
