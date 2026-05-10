import { useContext } from "react";
import {
  FormError,
  FormErrorsContext,
  FormSubmittingContext,
} from "./FormContext";

/**
 * Returns whether the surrounding `<Form>` is currently submitting via
 * reactolith's `Router` (i.e. a plain `action="…"` URL submission whose
 * response re-hydrates the page). Returns `false` outside a `<Form>`.
 *
 * This is distinct from React 19's `useFormStatus()` (`react-dom`), which
 * only reports `pending` for submissions kicked off by a React form
 * action (`<form action={fn}>`). The two hooks track different
 * submission models and do not overlap. See the Forms doc page for the
 * full comparison.
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
