import { Field } from "@base-ui/react/field";
import type { ComponentPropsWithoutRef } from "react";

export type TextareaProps = ComponentPropsWithoutRef<"textarea">;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <Field.Control
      render={
        <textarea
          className={`min-h-22 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        />
      }
    />
  );
}
