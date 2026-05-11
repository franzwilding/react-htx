import React from "react";

interface ExportFunctionExprDefaultProps {
  /** Caption shown by the default-exported function expression. */
  caption: string;
}

// Anonymous `export default function (…) { … }`. TypeScript parses this as
// an unnamed `FunctionDeclaration` with the `default` modifier (not as an
// ExportAssignment expression), so it exercises the FunctionDeclaration
// branch of extractPropsFromDeclaration in concert with the file-name-based
// component naming inside extractFromComponentFunctions' default-export loop.
export default function (props: ExportFunctionExprDefaultProps) {
  return <p>{props.caption}</p>;
}
