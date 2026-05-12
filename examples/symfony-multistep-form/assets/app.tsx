import "./app.css";
import { App, Form, createLoader } from "reactolith";

/**
 * Lazy-load every shadcn-style component from its own chunk. `import.meta.glob`
 * defaults to dynamic imports, so Vite emits one chunk per `.tsx` file — that's
 * what makes per-component HTTP/2 preloading actually mean something.
 *
 * `createLoader` resolves a kebab-case tag to a file using the rules from the
 * reactolith Quick Start:
 *
 *   <ui-input>               → ./components/ui/input.tsx (named `Input` or default)
 *   <ui-checkbox-group>      → ./components/ui/checkbox-group.tsx
 *   <ui-checkbox-group-item> → falls back to checkbox-group.tsx (named `CheckboxGroupItem`)
 *   <ui-field-label>         → falls back to field.tsx (named `FieldLabel`)
 *
 * `<my-form>` resolves to reactolith's own `Form` export (eager — included in
 * the main app bundle because every page uses it).
 */
const uiLoader = createLoader({
  modules: import.meta.glob("./components/ui/*.tsx"),
  prefix: "ui-",
  onMissing: () => null,
});

const flowLoader = createLoader({
  modules: import.meta.glob("./components/flow/*.tsx"),
  prefix: "flow-",
  onMissing: () => null,
});

new App(({ is }) => {
  if (is === "my-form") return Form;
  return uiLoader({ is }) ?? flowLoader({ is });
});
