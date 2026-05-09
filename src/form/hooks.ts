import { useContext } from "react";
import {
  FormError,
  FormErrorsContext,
  FormErrorsContextValue,
  FormFieldContext,
  FormFieldContextValue,
  FormSubmittingContext,
} from "./FormContext";

/**
 * Returns whether the surrounding `<Form>` is currently submitting.
 * Returns `false` if used outside a `<Form>`.
 */
export function useFormSubmitting(): boolean {
  return useContext(FormSubmittingContext);
}

/**
 * Returns the form errors context. Throws if used outside `<Form>`.
 */
export function useFormErrorsContext(): FormErrorsContextValue {
  const ctx = useContext(FormErrorsContext);
  if (!ctx) {
    throw new Error("useFormErrorsContext must be used inside a <Form>");
  }
  return ctx;
}

/**
 * Returns errors for a single field (when `name` is given) or every
 * non-touched error in the form. Returns an empty array outside a `<Form>`.
 */
export function useFormErrors(name?: string): FormError[] {
  const ctx = useContext(FormErrorsContext);
  if (!ctx) return [];
  return name === undefined ? ctx.getAllErrors() : ctx.getErrors(name);
}

/**
 * Returns the surrounding `<FormField>` context, or `null` if none.
 */
export function useFormField(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}
