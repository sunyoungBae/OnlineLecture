import { Input as InputPrimitive } from "@base-ui/react/input";
import type { ComponentProps } from "react";

export type InputProps = ComponentProps<typeof InputPrimitive>;

export function Input({ className = "", type = "text", ...props }: InputProps) {
  return (
    <InputPrimitive
      className={`min-h-11 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    />
  );
}
