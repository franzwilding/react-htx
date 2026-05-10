import React, { ReactNode } from "react";

/**
 * Visual style of the button. Inspired by `class-variance-authority` style
 * variants used by shadcn/ui.
 */
export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

/** Sizing variant. */
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps {
  /** Visual variant. */
  variant?: ButtonVariant;
  /** Size variant. */
  size?: ButtonSize;
  /** Disable the button. */
  disabled?: boolean;
  /** Slot the click handler. */
  onClick?: () => void;
  /** Button label / inner content. */
  children?: ReactNode;
}

export function Button(props: ButtonProps) {
  return <button {...props}>{props.children}</button>;
}
