import React, {
  FormEvent,
  FormEventHandler,
  PropsWithChildren,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  FormError,
  FormErrorsContext,
  FormErrorsContextValue,
  FormSubmittingContext,
} from "./FormContext";
import { useRouter } from "../provider/RouterProvider";

export type FormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  /**
   * Backend validation errors. Pass an array (typically rendered
   * server-side and serialized to the form via `json-errors`).
   */
  errors?: FormError[];
  /**
   * Optional submit handler. When omitted (the default), the native
   * submission bubbles up to reactolith's `Router` so the response
   * HTML re-hydrates the page automatically.
   */
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export const Form = forwardRef<HTMLFormElement, PropsWithChildren<FormProps>>(
  ({ errors: propErrors, onSubmit, children, ...rest }, forwardedRef) => {
    const errors = useMemo<FormError[]>(() => propErrors ?? [], [propErrors]);

    // Touched is tracked by error *reference*. When new errors arrive
    // (a fresh array from the backend), the old references drop out of
    // the active error list naturally — so we never need an effect to
    // reset state, which avoids race conditions with user interactions.
    const [touchedErrors, setTouchedErrors] = useState<Set<FormError>>(
      () => new Set(),
    );
    const [submitting, setSubmitting] = useState(false);
    const { router } = useRouter();

    const isTouched = useCallback(
      (e: FormError) => !!e.touched || touchedErrors.has(e),
      [touchedErrors],
    );

    const getErrors = useCallback(
      (name: string, includeTouched = false) =>
        errors.filter(
          (e) =>
            (e.name === name || e.id === name) &&
            (includeTouched || !isTouched(e)),
        ),
      [errors, isTouched],
    );

    const getAllErrors = useCallback(
      (includeTouched = false) =>
        includeTouched ? errors : errors.filter((e) => !isTouched(e)),
      [errors, isTouched],
    );

    const touchErrors = useCallback(
      (name: string) => {
        const matching = errors.filter((e) => e.name === name || e.id === name);
        if (!matching.length) return;
        setTouchedErrors((prev) => {
          let changed = false;
          const next = new Set(prev);
          for (const e of matching) {
            if (!next.has(e)) {
              next.add(e);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      [errors],
    );

    const ctx = useMemo<FormErrorsContextValue>(
      () => ({ errors, getErrors, getAllErrors, touchErrors }),
      [errors, getErrors, getAllErrors, touchErrors],
    );

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        if (onSubmit) {
          onSubmit(event);
        }
        if (event.defaultPrevented) {
          // The user explicitly stopped the default submission. Also
          // prevent the native event from reaching the Router so it
          // does not turn around and re-submit via fetch.
          event.stopPropagation();
          return;
        }

        // Native submission bubbles to the Router. Track the next
        // navigation cycle to flip submitting back off.
        setSubmitting(true);
        const off = router.on("nav:ended", () => {
          setSubmitting(false);
          off();
        });
      },
      [onSubmit, router],
    );

    // Mark a field's errors as touched as soon as the user changes it.
    // We listen at the form level (form elements receive bubbled
    // input/change events reliably across DOM trees).
    const handleFormInput: FormEventHandler<HTMLFormElement> = useCallback(
      (event) => {
        const target = event.target as HTMLElement | null;
        const name = target?.getAttribute("name");
        if (name) touchErrors(name);
      },
      [touchErrors],
    );

    return (
      <FormSubmittingContext.Provider value={submitting}>
        <FormErrorsContext.Provider value={ctx}>
          <form
            ref={forwardedRef}
            onSubmit={handleSubmit}
            onInput={handleFormInput}
            onChange={handleFormInput}
            {...rest}
          >
            {children}
          </form>
        </FormErrorsContext.Provider>
      </FormSubmittingContext.Provider>
    );
  },
);

Form.displayName = "Form";
