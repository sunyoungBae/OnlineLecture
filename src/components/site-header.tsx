import Link from "next/link";
import { MobileMenu } from "./mobile-menu";

const navigationItems = [
  { href: "/", label: "홈" },
  { href: "/login", label: "로그인" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex min-h-16 max-w-[var(--content-max-width)] items-center justify-between px-[var(--page-padding)]">
        <Link
          className="flex min-h-11 items-center font-serif text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/"
        >
          OnlineLecture
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-2 md:flex">
          {navigationItems.map((item) => (
            <Link
              className="flex min-h-11 items-center px-3 text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <MobileMenu />
      </div>
    </header>
  );
}
