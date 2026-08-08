import Link from "next/link";
import type { ReactNode } from "react";

export type StateAction = {
  href: string;
  label: string;
};

type EmptyStateProps = {
  action?: StateAction;
  children?: ReactNode;
  description: string;
  headingLevel?: "h1" | "h2" | "h3" | "h4";
  role?: "alert" | "status";
  title: string;
};

export function EmptyState({ action, children, description, headingLevel = "h2", role = "status", title }: EmptyStateProps) {
  const Heading = headingLevel;

  return (
    <section aria-live={role === "alert" ? "assertive" : "polite"} className="border border-[var(--border)] bg-[var(--surface)] p-6" role={role}>
      <Heading className="font-serif text-3xl font-semibold tracking-tight">{title}</Heading>
      <p className="mt-4 leading-7 text-[var(--muted-foreground)]">{description}</p>
      {children ? <div className="mt-6 flex flex-wrap gap-3">{children}</div> : null}
      {action ? (
        <Link className="mt-6 inline-flex min-h-11 items-center border border-[var(--foreground)] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
