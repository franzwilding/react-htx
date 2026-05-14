import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "defaultChecked"
> & {
  name: string;
  /** Initial state from the server. Use `json-checked="true"` in the HTML
   * attribute so reactolith parses it as a real boolean. */
  checked?: boolean;
  value?: string;
};

export function Checkbox({
  className,
  name,
  value = "1",
  checked,
  children,
  ...rest
}: CheckboxProps) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  return (
    <input
      type="checkbox"
      name={name}
      value={value}
      defaultChecked={!!checked}
      aria-invalid={invalid || undefined}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "accent-primary",
        className,
      )}
      {...rest}
    />
  );
}
