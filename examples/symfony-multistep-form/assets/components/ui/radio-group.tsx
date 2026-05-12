import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

type RadioGroupContextValue = {
  name: string;
  value?: string;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null,
);

export function RadioGroup({
  name,
  value,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  value?: string;
}) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  const contextValue = React.useMemo(() => ({ name, value }), [name, value]);
  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        role="radiogroup"
        aria-invalid={invalid || undefined}
        className={cn("flex flex-col gap-2", className)}
        {...rest}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({
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
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error("<ui-radio-group-item> must be inside <ui-radio-group>.");
  }
  const inputId = id ?? `${ctx.name}-${value}`;
  const checked = ctx.value === value;
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
        type="radio"
        id={inputId}
        name={ctx.name}
        value={value}
        defaultChecked={checked}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-full border border-primary text-primary shadow",
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
