import React, { ReactNode } from "react";

export interface TextFieldProps {
  /** Field label. */
  label: string;
  /** Helper text shown below the field. */
  hint?: ReactNode;
  /** Validation error message. */
  error?: string;
  /** Mark the field as required. */
  required?: boolean;
  children?: ReactNode;
}

export function TextField(props: TextFieldProps) {
  return (
    <label>
      {props.label}
      {props.children}
      {props.hint}
      {props.error}
    </label>
  );
}
