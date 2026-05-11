import { ImportedComponent as Aliased } from "./ImportedComponent";

// `import { X as Y }; export default Y` — guards the user-facing behaviour
// that aliased imports survive the round-trip through resolveIdentifierToProps
// (it currently resolves via the call-signatures path; the named-import loop
// further down is a defensive fallback for when that path fails).
export default Aliased;
