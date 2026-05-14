import * as React from "react";
import { useFormSubmitting } from "reactolith";
import { cn } from "../../lib/utils";

type Variant = "default" | "outline" | "secondary" | "destructive" | "ghost";

const variantClass: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  outline:
    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** When set, the button shows a busy indicator while the surrounding
   * `<my-form>` is submitting through reactolith's Router. */
  pendingLabel?: string;
};

export function Button({
  className,
  variant = "default",
  type = "button",
  pendingLabel,
  children,
  ...rest
}: ButtonProps) {
  const submitting = useFormSubmitting();
  const label = submitting && pendingLabel && type === "submit"
    ? pendingLabel
    : children;
  return (
    <button
      type={type}
      disabled={rest.disabled || (submitting && type === "submit")}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "h-9 px-4 py-2",
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      {label}
    </button>
  );
}
