import { createContext } from "react";

export type FormError = {
  /**
   * Field name the error belongs to. Matches the `name` of an input
   * (or a `<FormField name="...">` wrapper).
   */
  name?: string;
  /** Optional element id to scroll to when error summary is clicked. */
  id?: string;
  /** Human-readable label used for prefixing error summaries. */
  label?: string;
  /** The error message. */
  message: string;
  /**
   * If true, the error is hidden from the field/summary (the user has
   * already started correcting it). Touched state is also tracked
   * automatically when fields change.
   */
  touched?: boolean;
};

export type FormErrorsContextValue = {
  /** All errors passed in via the `errors` prop. */
  errors: FormError[];
  /**
   * Errors for a specific field, excluding touched ones unless
   * `includeTouched` is true.
   */
  getErrors: (name: string, includeTouched?: boolean) => FormError[];
  /**
   * All errors (or all errors for `name`) excluding touched ones
   * unless `includeTouched` is true.
   */
  getAllErrors: (includeTouched?: boolean) => FormError[];
  /** Mark every error for `name` as touched (hides them). */
  touchErrors: (name: string) => void;
};

export type FormFieldContextValue = {
  /** The field's name. */
  name: string;
  /** True if the field has any non-touched errors. */
  invalid: boolean;
  /** Errors for this field (touched ones are excluded). */
  errors: FormError[];
  /** Mark errors for this field as touched. */
  touchErrors: () => void;
};

export const FormErrorsContext = createContext<FormErrorsContextValue | null>(
  null,
);

export const FormSubmittingContext = createContext<boolean>(false);

export const FormFieldContext = createContext<FormFieldContextValue | null>(
  null,
);
