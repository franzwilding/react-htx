import React, { ComponentType, ElementType, ReactNode, Suspense } from "react";

export type ModuleLoader = () => Promise<Record<string, unknown>>;
export type ModuleMap = Record<string, ModuleLoader>;

export interface LoaderOptions {
  /**
   * One or many module maps from `import.meta.glob`. When multiple are
   * provided, earlier maps take priority — useful for overriding
   * shadcn components with custom ones.
   */
  modules: ModuleMap | ModuleMap[];
  /** Tag prefix to strip before resolving (e.g. "ui-"). Default: ""  */
  prefix?: string;
  /**
   * Fallback rendered while a component is being lazy-loaded.
   * Default: null
   */
  fallback?: ReactNode;
  /**
   * Called when a component cannot be resolved. Returns a component
   * to render in its place. By default an error is thrown.
   */
  onMissing?: (name: string, is: string) => ComponentType<unknown> | null;
}

const COMPONENT_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

const kebabToPascal = (name: string): string =>
  name.replace(/(^\w|-\w)/g, (m) => m.replace(/-/, "").toUpperCase());

const stripExt = (path: string): string => {
  for (const ext of COMPONENT_EXTENSIONS) {
    if (path.endsWith(ext)) return path.slice(0, -ext.length);
  }
  return path;
};

const fileBaseName = (path: string): string => {
  const slash = path.lastIndexOf("/");
  return stripExt(slash >= 0 ? path.slice(slash + 1) : path);
};

function findModulePath(
  modules: ModuleMap[],
  name: string,
): { loader: ModuleLoader } | null {
  for (const map of modules) {
    for (const path of Object.keys(map)) {
      if (fileBaseName(path) === name) {
        return { loader: map[path] };
      }
    }
  }
  return null;
}

function findExport(
  mod: Record<string, unknown>,
  name: string,
): ComponentType<unknown> | null {
  const pascal = kebabToPascal(name);
  const candidate = mod[pascal];
  if (typeof candidate === "function" || typeof candidate === "object") {
    return candidate as ComponentType<unknown>;
  }
  const def = (mod as { default?: unknown }).default;
  if (typeof def === "function" || (def && typeof def === "object")) {
    return def as ComponentType<unknown>;
  }
  // Case-insensitive fallback: matches "field-label" → "FieldLabel"
  const normalized = name.replace(/-/g, "").toLowerCase();
  for (const key of Object.keys(mod)) {
    if (key.toLowerCase() === normalized) {
      const value = mod[key];
      if (typeof value === "function" || (value && typeof value === "object")) {
        return value as ComponentType<unknown>;
      }
    }
  }
  return null;
}

async function resolveComponent(
  name: string,
  modules: ModuleMap[],
): Promise<{ default: ComponentType<unknown> }> {
  const segments = name.split("-");
  // Try the full name first, then progressively shorter prefixes so that
  // "accordion-item" resolves to "accordion.tsx" exporting AccordionItem.
  for (let i = segments.length; i >= 1; i--) {
    const candidate = segments.slice(0, i).join("-");
    const found = findModulePath(modules, candidate);
    if (!found) continue;
    const mod = await found.loader();
    const Component = findExport(mod, name);
    if (Component) return { default: Component };
  }
  throw new Error(
    `[reactolith] Could not resolve component "${name}". ` +
      `No matching file or export was found in the provided modules.`,
  );
}

export function createLoader(options: LoaderOptions): ElementType<{
  is: string;
  [key: string]: unknown;
}> {
  const moduleMaps = Array.isArray(options.modules)
    ? options.modules
    : [options.modules];
  const prefix = options.prefix ?? "";
  const fallback = options.fallback ?? null;
  const onMissing = options.onMissing;
  const cache = new Map<string, ComponentType<unknown>>();

  const Loader: React.FC<{ is: string; [key: string]: unknown }> = ({
    is,
    ...rest
  }) => {
    const name = is.startsWith(prefix) ? is.slice(prefix.length) : is;

    let Component = cache.get(name);
    if (!Component) {
      Component = React.lazy(async () => {
        try {
          return await resolveComponent(name, moduleMaps);
        } catch (err) {
          if (onMissing) {
            const Fallback = onMissing(name, is);
            if (Fallback) return { default: Fallback };
          }
          throw err;
        }
      }) as ComponentType<unknown>;
      cache.set(name, Component);
    }

    const Resolved = Component as ComponentType<{
      is: string;
      [key: string]: unknown;
    }>;
    return (
      <Suspense fallback={fallback}>
        <Resolved is={is} {...rest} />
      </Suspense>
    );
  };

  Loader.displayName = "ReactolithLoader";
  return Loader;
}
