import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

/**
 * shadcn's "Field" composition primitives, simplified for the reactolith
 * pattern: server-rendered HTML resolves these kebab-case tags
 * (`<ui-field>`, `<ui-field-label>`, …) to the React components below.
 *
 * Each field is wired to its surrounding `<my-form>` via `useFormErrors(name)`
 * — the JSON error payload that the Symfony form theme renders on the form
 * root surfaces at the field level without prop drilling.
 */

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Field name. When set, the field automatically adopts an error state from
   * the surrounding `<my-form>` and applies `data-invalid` to itself. */
  name?: string;
};

export function Field({ className, name, children, ...rest }: FieldProps) {
  const errors = useFormErrors(name);
  const hasError = !!name && errors.length > 0;
  return (
    <div
      className={cn("space-y-2", className)}
      data-form-item=""
      data-invalid={hasError ? "" : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

type FieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function FieldLabel({
  className,
  htmlFor,
  required,
  children,
  ...rest
}: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...rest}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-1 text-destructive">
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldDescription({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...rest}
    >
      {children}
    </p>
  );
}

type FieldErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Field name; defaults to picking up the closest `<ui-field name="…">`
   * via the explicit `name` attribute on the HTML tag. */
  name: string;
};

export function FieldError({ className, name, ...rest }: FieldErrorProps) {
  const errors = useFormErrors(name);
  if (!errors.length) return null;
  return (
    <div role="alert" {...rest}>
      {errors.map((err, index) => (
        <p
          key={index}
          className={cn(
            "text-sm font-medium text-destructive",
            className,
          )}
        >
          {err.message}
        </p>
      ))}
    </div>
  );
}
