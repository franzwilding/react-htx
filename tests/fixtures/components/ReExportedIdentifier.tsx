import { ImportedComponent } from "./ImportedComponent";

// `const X = <Identifier>` — exercises the PropertyAccessExpression /
// Identifier-initializer branch of extractPropsFromDeclaration, which
// resolves the type through `getCallSignatures()`.
export const ReExportedIdentifier = ImportedComponent;
