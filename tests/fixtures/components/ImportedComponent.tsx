import React from "react";

export interface ImportedComponentProps {
  /** Heading shown by the imported component. */
  heading: string;
}

// Named export — resolveImportedComponent should find this via getNamedImports.
export function ImportedComponent(props: ImportedComponentProps) {
  return <h2>{props.heading}</h2>;
}

interface ImportedDefaultProps {
  /** Caption rendered by the default-exported component. */
  caption: string;
}

function ImportedDefault(props: ImportedDefaultProps) {
  return <p>{props.caption}</p>;
}

// Default export — exercises the default-import branch of
// resolveImportedComponent.
export default ImportedDefault;
