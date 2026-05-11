import React, { memo } from "react";

interface MemoFunctionExpressionProps {
  /** Label shown by the memoised component */
  label: string;
}

// `memo(function () { ... })` — exercises the FunctionExpression-in-
// CallExpression-argument branch of extractPropsFromDeclaration.
export const MemoFunctionExpression = memo(function (
  props: MemoFunctionExpressionProps,
) {
  return <span>{props.label}</span>;
});
