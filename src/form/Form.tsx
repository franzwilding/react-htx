import React, {
  FormEvent,
  FormEventHandler,
  PropsWithChildren,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FormError,
  FormErrorsContext,
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
  ref?: Ref<HTMLFormElement>;
};

const hasSetCustomValidity = (
  el: unknown,
): el is { setCustomValidity: (msg: string) => void } =>
  !!el &&
  typeof el === "object" &&
  "setCustomValidity" in el &&
  typeof (el as { setCustomValidity: unknown }).setCustomValidity ===
    "function";

export function Form({
  ref,
  errors: propErrors,
  onSubmit,
  children,
  ...rest
}: PropsWithChildren<FormProps>) {
  const errors = useMemo<FormError[]>(() => propErrors ?? [], [propErrors]);
  const [submitting, setSubmitting] = useState(false);
  const { router } = useRouter();
  const internalRef = useRef<HTMLFormElement | null>(null);

  const setRef = useCallback(
    (el: HTMLFormElement | null) => {
      internalRef.current = el;
      if (typeof ref === "function") {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    },
    [ref],
  );

  // Wire backend errors to native constraint validation. Once set,
  // the browser flips `:user-invalid` on the field as soon as the
  // user interacts with it, so consumers can style invalid fields
  // with plain CSS instead of tracking touched state in React.
  useEffect(() => {
    const form = internalRef.current;
    if (!form) return;
    const taken = new Set<string>();
    for (const error of errors) {
      if (!error.name || taken.has(error.name)) continue;
      const el = form.elements.namedItem(error.name);
      if (hasSetCustomValidity(el)) {
        el.setCustomValidity(error.message);
        taken.add(error.name);
      }
    }
    return () => {
      for (const el of Array.from(form.elements)) {
        if (hasSetCustomValidity(el)) el.setCustomValidity("");
      }
    };
  }, [errors]);

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
      // navigation cycle to flip submitting back off — on either a
      // successful end or a fetch error.
      setSubmitting(true);
      const reset = () => {
        setSubmitting(false);
        offEnded();
        offError();
      };
      const offEnded = router.on("nav:ended", reset);
      const offError = router.on("nav:error", reset);
    },
    [onSubmit, router],
  );

  // Clear a field's custom validity as soon as the user edits it.
  // Without this, setCustomValidity would persist until new errors
  // arrive from the server and the field would stay `:invalid`.
  const handleFormInput: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      const target = event.target;
      if (hasSetCustomValidity(target)) target.setCustomValidity("");
    },
    [],
  );

  return (
    <FormSubmittingContext.Provider value={submitting}>
      <FormErrorsContext.Provider value={errors}>
        <form
          ref={setRef}
          onSubmit={handleSubmit}
          onInput={handleFormInput}
          {...rest}
        >
          {children}
        </form>
      </FormErrorsContext.Provider>
    </FormSubmittingContext.Provider>
  );
}
