import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

export function ColorPicker({
  name,
  value,
  defaultValue,
  className,
  children: _,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  name: string;
  children?: React.ReactNode;
}) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  const initial = (value as string | undefined) ?? (defaultValue as string | undefined) ?? "#000000";
  const [color, setColor] = React.useState(initial);
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        name={name}
        defaultValue={initial}
        onChange={(e) => setColor(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent p-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...rest}
      />
      <code className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium uppercase tabular-nums text-muted-foreground">
        {color}
      </code>
    </div>
  );
}
