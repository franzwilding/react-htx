import React, { Ref } from "react";

export interface InputProps {
  /** Native input type. */
  type?: "text" | "email" | "password" | "search" | "tel" | "url" | "number";
  /** Placeholder text shown when empty. */
  placeholder?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Disable the field. */
  disabled?: boolean;
  /** Current value (controlled). */
  value?: string;
  /** Called when the value changes. */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** React 19 ref-as-prop pattern. */
  ref?: Ref<HTMLInputElement>;
}

// React 19-style ref-as-prop component (no forwardRef wrapper).
export function Input({ ref, ...props }: InputProps) {
  return <input ref={ref} {...props} />;
}
