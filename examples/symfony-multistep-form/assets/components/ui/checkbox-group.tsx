import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

type CheckboxGroupContextValue = {
  name: string;
  value: string[];
};

const CheckboxGroupContext =
  React.createContext<CheckboxGroupContextValue | null>(null);

export function CheckboxGroup({
  name,
  value,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  /** Initial checked values. Pass via `json-value='["frontend"]'`. */
  value?: string[];
}) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  const contextValue = React.useMemo<CheckboxGroupContextValue>(
    () => ({ name, value: value ?? [] }),
    [name, value],
  );
  return (
    <CheckboxGroupContext.Provider value={contextValue}>
      <div
        role="group"
        aria-invalid={invalid || undefined}
        className={cn("flex flex-col gap-2", className)}
        {...rest}
      >
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  );
}

export function CheckboxGroupItem({
  value,
  id,
  className,
  children,
  ...rest
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "name" | "value" | "defaultChecked"
> & {
  value: string;
  children?: React.ReactNode;
}) {
  const ctx = React.useContext(CheckboxGroupContext);
  if (!ctx) {
    throw new Error(
      "<ui-checkbox-group-item> must be inside <ui-checkbox-group>.",
    );
  }
  const inputId = id ?? `${ctx.name}-${value}`;
  const checked = ctx.value.includes(value);
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-input bg-transparent p-3 shadow-sm transition-colors",
        "hover:bg-accent/40",
        "has-[:checked]:border-primary has-[:checked]:bg-accent/40",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        id={inputId}
        name={`${ctx.name}[]`}
        value={value}
        defaultChecked={checked}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "accent-primary",
        )}
        {...rest}
      />
      <span className="text-sm font-medium leading-none">{children}</span>
    </label>
  );
}
