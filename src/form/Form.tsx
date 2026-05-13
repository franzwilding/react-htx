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

// `form.elements.namedItem` returns a `RadioNodeList` (not an Element)
// when several inputs share the same name — e.g. a radio group. The
// list itself has no `setCustomValidity`, so unwrap to the individual
// members before applying the error.
const collectValidatable = (
  node: ReturnType<HTMLFormElement["elements"]["namedItem"]>,
): Array<{ setCustomValidity: (msg: string) => void }> => {
  if (!node) return [];
  if (hasSetCustomValidity(node)) return [node];
  if (typeof (node as { length?: unknown }).length === "number") {
    const out: Array<{ setCustomValidity: (msg: string) => void }> = [];
    for (const child of Array.from(node as unknown as Iterable<unknown>)) {
      if (hasSetCustomValidity(child)) out.push(child);
    }
    return out;
  }
  return [];
};

export function Form({
  ref,
  errors: propErrors,
  onSubmit,
  children,
  ...rest
}: PropsWithChildren<FormProps>) {
  const incomingErrors = useMemo<FormError[]>(
    () => propErrors ?? [],
    [propErrors],
  );
  // Names the user has edited since the current `errors` prop arrived.
  // Tracked alongside the errors identity so a new payload from the
  // backend resets the cleared set during render — without that, a field
  // re-flagged by a fresh submission would flicker for one frame.
  const [clearedState, setClearedState] = useState<{
    source: FormError[];
    cleared: Set<string>;
  }>(() => ({ source: incomingErrors, cleared: new Set() }));
  if (clearedState.source !== incomingErrors) {
    setClearedState({ source: incomingErrors, cleared: new Set() });
  }
  const errors = useMemo<FormError[]>(() => {
    const cleared =
      clearedState.source === incomingErrors
        ? clearedState.cleared
        : new Set<string>();
    if (cleared.size === 0) return incomingErrors;
    return incomingErrors.filter(
      (e) => !(e.name && cleared.has(e.name)) && !(e.id && cleared.has(e.id)),
    );
  }, [incomingErrors, clearedState]);
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
      const targets = collectValidatable(form.elements.namedItem(error.name));
      if (targets.length === 0) continue;
      for (const target of targets) target.setCustomValidity(error.message);
      taken.add(error.name);
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
      // successful end, a fetch error, or supersession by a newer
      // navigation.
      setSubmitting(true);
      const reset = () => {
        setSubmitting(false);
        offEnded();
        offError();
        offCancelled();
      };
      const offEnded = router.on("nav:ended", reset);
      const offError = router.on("nav:error", reset);
      const offCancelled = router.on("nav:cancelled", reset);
    },
    [onSubmit, router],
  );

  // Clear a field's custom validity AND drop its backend errors from the
  // context as soon as the user edits it. Otherwise the field would stay
  // `:invalid` and `useFormErrors(name)` consumers would keep rendering
  // a stale message that contradicts the user's new input.
  const handleFormInput: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      const target = event.target;
      if (hasSetCustomValidity(target)) target.setCustomValidity("");
      const name =
        target && typeof target === "object" && "name" in target
          ? (target as { name?: unknown }).name
          : undefined;
      const id =
        target && typeof target === "object" && "id" in target
          ? (target as { id?: unknown }).id
          : undefined;
      const hasName = typeof name === "string" && name.length > 0;
      const hasId = typeof id === "string" && id.length > 0;
      if (!hasName && !hasId) return;
      setClearedState((prev) => {
        const prevSet = prev.cleared;
        if (
          (!hasName || prevSet.has(name as string)) &&
          (!hasId || prevSet.has(id as string))
        ) {
          return prev;
        }
        const next = new Set(prevSet);
        if (hasName) next.add(name as string);
        if (hasId) next.add(id as string);
        return { source: prev.source, cleared: next };
      });
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
