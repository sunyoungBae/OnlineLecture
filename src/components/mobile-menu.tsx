"use client";

import Link from "next/link";
import { type ComponentRef, useId, useRef, useState } from "react";

const menuItems = [
  { href: "/", label: "홈" },
  { href: "/login", label: "로그인" },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<ComponentRef<"button">>(null);

  return (
    <div
      className="relative md:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setIsOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        className="flex min-h-11 min-w-11 items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={() => setIsOpen((open) => !open)}
        ref={menuButtonRef}
        type="button"
      >
        <span aria-hidden="true">☰</span>
      </button>

      {isOpen ? (
        <nav
          aria-label="모바일 메뉴"
          className="absolute right-0 top-full z-10 mt-2 w-40 border border-[var(--border)] bg-[var(--surface)] p-1"
          id={menuId}
        >
          {menuItems.map((item) => (
            <Link
              className="flex min-h-11 items-center px-3 text-sm font-medium hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              href={item.href}
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
