import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";

export type LabelProps = ComponentProps<typeof Field.Label>;

export function Label({ className = "", ...props }: LabelProps) {
  return (
    <Field.Label
      className={`inline-flex min-h-11 items-center text-sm font-medium text-foreground ${className}`}
      {...props}
    />
  );
}
