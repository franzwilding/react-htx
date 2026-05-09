import React, { forwardRef, ButtonHTMLAttributes } from "react";

export interface ForwardRefButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  tone?: "neutral" | "danger";
}

// Exercises the React.forwardRef / call-expression branch in
// extractPropsFromDeclaration: the initializer is a CallExpression whose
// argument is the actual component arrow function.
export const ForwardRefButton = forwardRef<
  HTMLButtonElement,
  ForwardRefButtonProps
>((props, ref) => <button ref={ref} {...props} />);
ForwardRefButton.displayName = "ForwardRefButton";
