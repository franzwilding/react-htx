import React from "react";

interface ExportArrowDefaultProps {
  /** Heading shown by the default-exported arrow component. */
  heading: string;
}

// `export default (props) => …` — exercises the ExportAssignment-with-
// ArrowFunction branch of extractPropsFromDeclaration.
export default (props: ExportArrowDefaultProps) => <h1>{props.heading}</h1>;
