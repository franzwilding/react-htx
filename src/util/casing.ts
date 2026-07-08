/** Convert a kebab-case name to PascalCase: `my-button` → `MyButton`. */
export const kebabToPascal = (name: string): string =>
  name.replace(/(^\w|-\w)/g, (m) => m.replace(/-/, "").toUpperCase());

/** Convert a PascalCase/camelCase name to kebab-case: `MyButton` → `my-button`. */
export const pascalToKebab = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
