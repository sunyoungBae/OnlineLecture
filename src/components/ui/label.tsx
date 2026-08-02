import type { ComponentPropsWithoutRef } from "react";

export type LabelProps = ComponentPropsWithoutRef<"label">;

export function Label({ className = "", ...props }: LabelProps) {
  return <label className={`text-sm font-medium text-foreground ${className}`} {...props} />;
}
