import React from "react";

interface DefaultExportIdentifierProps {
  /** Title text */
  title: string;
}

function DefaultExportIdentifier(props: DefaultExportIdentifierProps) {
  return <h1>{props.title}</h1>;
}

// `export default <identifier>` — exercises the ExportAssignment-with-Identifier
// path in extractFromComponentFunctions / resolveIdentifierToProps.
export default DefaultExportIdentifier;
