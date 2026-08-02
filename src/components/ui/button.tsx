import type { ComponentPropsWithoutRef } from "react";

type ButtonTone = "accent" | "outline" | "destructive";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  tone?: ButtonTone;
};

const toneClasses: Record<ButtonTone, string> = {
  accent: "border-transparent bg-accent text-foreground hover:bg-accent/85",
  outline: "border-border bg-surface text-foreground hover:bg-background",
  destructive: "border-destructive bg-destructive text-white hover:bg-destructive/85",
};

export function Button({ className = "", tone = "accent", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-sm border px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${toneClasses[tone]} ${className}`}
      type={type}
      {...props}
    />
  );
}
