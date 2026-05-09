import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  FormErrorsContext,
  FormFieldContext,
  FormFieldContextValue,
} from "./FormContext";

export type FormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  /** The field name. Errors are looked up by `error.name === name`. */
  name: string;
  /**
   * If true, render no wrapping element — only provide context.
   * Useful when the wrapper would otherwise interfere with layout.
   */
  asChild?: boolean;
};

export const FormField: React.FC<PropsWithChildren<FormFieldProps>> = ({
  name,
  asChild,
  className,
  children,
  ...rest
}) => {
  const errorsCtx = useContext(FormErrorsContext);
  const errors = errorsCtx ? errorsCtx.getErrors(name) : [];
  const invalid = errors.length > 0;

  const touchErrors = useCallback(() => {
    errorsCtx?.touchErrors(name);
  }, [errorsCtx, name]);

  const ctx = useMemo<FormFieldContextValue>(
    () => ({ name, invalid, errors, touchErrors }),
    [name, invalid, errors, touchErrors],
  );

  if (asChild) {
    return (
      <FormFieldContext.Provider value={ctx}>
        {children}
      </FormFieldContext.Provider>
    );
  }

  return (
    <FormFieldContext.Provider value={ctx}>
      <div
        data-slot="form-field"
        data-invalid={invalid || undefined}
        className={className}
        {...rest}
      >
        {children}
      </div>
    </FormFieldContext.Provider>
  );
};

FormField.displayName = "FormField";
