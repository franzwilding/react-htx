import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name?: string;
  /** Render-time default value populated by the server. */
  value?: string;
};

export function Textarea({ className, name, value, children, ...rest }: TextareaProps) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  // The server can deliver the current value either as a `value` prop (the
  // reactolith convention) or as inner text (HTML convention). Prefer the prop.
  const defaultValue = value ?? (typeof children === "string" ? children : undefined);
  return (
    <textarea
      name={name}
      defaultValue={defaultValue}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
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
