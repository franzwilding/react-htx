import { useContext } from "react";
import {
  FormError,
  FormErrorsContext,
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
 * Returns errors for a single field (when `name` is given) or every
 * error in the form. Returns an empty array outside a `<Form>`.
 */
export function useFormErrors(name?: string): FormError[] {
  const errors = useContext(FormErrorsContext);
  if (name === undefined) return errors;
  return errors.filter((e) => e.name === name || e.id === name);
}
