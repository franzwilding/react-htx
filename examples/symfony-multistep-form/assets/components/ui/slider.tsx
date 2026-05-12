import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

export type SliderProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  name: string;
};

/**
 * Range slider rendered as a styled native `<input type="range">`. The live
 * value is mirrored to a small badge next to the slider as the user drags.
 */
export function Slider({ className, name, defaultValue, value, ...rest }: SliderProps) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  const initial =
    (value as string | number | undefined) ??
    (defaultValue as string | number | undefined) ??
    rest.min ??
    0;
  const [display, setDisplay] = React.useState<string | number>(initial);
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        name={name}
        defaultValue={initial}
        onInput={(e) => setDisplay(e.currentTarget.value)}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...rest}
      />
      <output className="min-w-[3ch] rounded-md border border-input bg-background px-2 py-0.5 text-center text-xs font-medium tabular-nums">
        {display}
      </output>
    </div>
  );
}
