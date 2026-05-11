// @ts-expect-error — the package intentionally does not exist; this is here
// to drive resolveImportedComponent down the `!resolvedModule` branch
// (and through its try/catch).
import Anything from "this-package-intentionally-does-not-exist";

// resolveIdentifierToProps must walk through the imports loop and call
// resolveImportedComponent, which has to return `null` without crashing
// because the module specifier does not resolve.
export default Anything;
