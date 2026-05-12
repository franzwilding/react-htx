import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  /** Lets the input pick up errors from the surrounding `<my-form>`. */
  name?: string;
};

/**
 * shadcn/ui `<Input>` rendered as a controlled-by-the-DOM input. The element
 * is uncontrolled so React doesn't fight the browser over IME state, but the
 * server still owns the initial `value` and Symfony's re-render after a
 * failed submit overwrites it cleanly thanks to reactolith's morph.
 */
export function Input({
  className,
  type = "text",
  name,
  ...rest
}: InputProps) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  return (
    <input
      type={type}
      name={name}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
        className,
      )}
      {...rest}
    />
  );
}
