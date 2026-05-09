import React from "react";

interface FunctionExpressionWidgetProps {
  /** Heading text */
  heading: string;
}

// Exercises extractPropsFromFunctionExpression — `const X = function () {}`.
export const FunctionExpressionWidget = function (
  props: FunctionExpressionWidgetProps,
) {
  return <h2>{props.heading}</h2>;
};
