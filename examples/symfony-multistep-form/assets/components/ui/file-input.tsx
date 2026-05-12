import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

export function FileInput({
  name,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  name: string;
}) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  return (
    <input
      type="file"
      name={name}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
        "file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium file:text-secondary-foreground",
        "hover:file:bg-secondary/80",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
        "pt-1.5",
        className,
      )}
      {...rest}
    />
  );
}
