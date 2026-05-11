import React from "react";

// A zero-parameter function expression — exercises the empty-params branch
// of extractPropsFromFunctionExpression.
export const NoParamsFunctionExpr = function (): React.ReactElement {
  return <div>still nothing</div>;
};
