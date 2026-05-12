import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

type Option = { value: string; label: string };

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "defaultValue" | "multiple"
> & {
  name: string;
  /** Initial value from the server. Pass via `json-value='"de"'` so it
   * arrives as a string and not the literal "de" minus the quotes. */
  value?: string | string[];
  multiple?: boolean;
  placeholder?: string;
  /** Optional pre-baked options. If omitted, the component renders any
   * `<option>` / `<ui-option>` children that came with the HTML. */
  options?: Option[];
};

export function Select({
  className,
  name,
  value,
  multiple,
  placeholder,
  options,
  children,
  ...rest
}: SelectProps) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  return (
    <select
      name={name}
      multiple={multiple}
      defaultValue={value as string | string[] | undefined}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
        className,
      )}
      {...rest}
    >
      {placeholder !== undefined ? (
        <option value="">{placeholder}</option>
      ) : null}
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );
}

/**
 * Used when the server emits `<ui-option value="x" json-selected="true">…</ui-option>`
 * instead of `<option>`. Reactolith resolves the kebab-cased tag to this
 * component, which expands back into a real `<option>`.
 */
export function Option({
  value,
  selected,
  disabled,
  children,
}: {
  value: string;
  selected?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <option value={value} disabled={disabled} defaultValue={selected ? value : undefined}>
      {children}
    </option>
  );
}
