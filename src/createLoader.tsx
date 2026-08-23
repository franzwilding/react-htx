import React, { ComponentType, ElementType, ReactNode, Suspense } from "react";
import { kebabToPascal } from "./util/casing";

export type ModuleLoader = () => Promise<Record<string, unknown>>;
export type ModuleMap = Record<string, ModuleLoader>;

export interface LoaderGroup {
  /** One or many module maps from `import.meta.glob`. */
  modules: ModuleMap | ModuleMap[];
  /** Tag prefix this group handles (e.g. "ui-"). Required and non-empty
   *  except for at most one catch-all group. */
  prefix?: string;
}

export interface LoaderOptions {
  /**
   * One or many module maps from `import.meta.glob`. When multiple are
   * provided, earlier maps take priority — useful for overriding
   * shadcn components with custom ones.
   *
   * Mutually exclusive with `groups`.
   */
  modules?: ModuleMap | ModuleMap[];
  /** Tag prefix to strip before resolving (e.g. "ui-"). Default: "" */
  prefix?: string;
  /**
   * Multiple module-map groups, each with its own prefix. Groups are
   * tried in order; the first whose prefix matches the `is` wins.
   * A group without `prefix` is a catch-all (use as the last entry).
   *
   * Mutually exclusive with `modules` / `prefix`.
   */
  groups?: LoaderGroup[];
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

/**
 * Index module maps by file base name so resolves are O(1) instead of scanning
 * every path. Earlier maps (and earlier paths within a map) take priority,
 * matching the documented override order.
 */
function indexModules(
  modules: ModuleMap | ModuleMap[],
): Map<string, ModuleLoader> {
  const maps = Array.isArray(modules) ? modules : [modules];
  const index = new Map<string, ModuleLoader>();
  for (const map of maps) {
    for (const path of Object.keys(map)) {
      const base = fileBaseName(path);
      if (!index.has(base)) index.set(base, map[path]);
    }
  }
  return index;
}

// Recognises React-renderable values: plain function components, classes, and
// special component types (forwardRef, memo, lazy, …) which are objects branded
// with a `$$typeof` symbol. Plain data objects co-located in component files
// must not be treated as components — see issue #59.
function isComponent(value: unknown): value is ComponentType<unknown> {
  if (typeof value === "function") return true;
  if (!value || typeof value !== "object") return false;
  const brand = (value as { $$typeof?: unknown }).$$typeof;
  return typeof brand === "symbol";
}

function findExport(
  mod: Record<string, unknown>,
  name: string,
): ComponentType<unknown> | null {
  const pascal = kebabToPascal(name);
  const candidate = mod[pascal];
  if (isComponent(candidate)) return candidate;
  const def = (mod as { default?: unknown }).default;
  if (isComponent(def)) return def;
  // Case-insensitive fallback: matches "field-label" → "FieldLabel"
  const normalized = name.replace(/-/g, "").toLowerCase();
  for (const key of Object.keys(mod)) {
    if (key.toLowerCase() === normalized) {
      const value = mod[key];
      if (isComponent(value)) return value;
    }
  }
  return null;
}

async function resolveComponent(
  name: string,
  group: NormalizedGroup,
): Promise<{ default: ComponentType<unknown> }> {
  const segments = name.split("-");
  // Try the full name first, then progressively shorter prefixes so that
  // "accordion-item" resolves to "accordion.tsx" exporting AccordionItem.
  const attempt = async (index: Map<string, ModuleLoader>) => {
    for (let i = segments.length; i >= 1; i--) {
      const candidate = segments.slice(0, i).join("-");
      const loader = index.get(candidate);
      if (!loader) continue;
      const mod = await loader();
      const Component = findExport(mod, name);
      if (Component) return { default: Component };
    }
    return null;
  };

  group.index ??= indexModules(group.moduleMaps);
  const resolved =
    (await attempt(group.index)) ??
    // Miss: the module maps may have been mutated after the index was built
    // (late registration). Rebuild once and retry before giving up.
    (await attempt((group.index = indexModules(group.moduleMaps))));
  if (resolved) return resolved;

  throw new Error(
    `[reactolith] Could not resolve component "${name}". ` +
      `No matching file or export was found in the provided modules.`,
  );
}

interface NormalizedGroup {
  moduleMaps: ModuleMap | ModuleMap[];
  /** Base-name → loader index, built lazily on first resolve. */
  index: Map<string, ModuleLoader> | null;
  prefix: string;
  /** When false (legacy single-group), a non-matching prefix falls through
   *  with `name = is` instead of skipping the group. */
  strict: boolean;
}

function normalizeGroups(options: LoaderOptions): NormalizedGroup[] {
  if (options.groups) {
    if (options.modules !== undefined || options.prefix !== undefined) {
      throw new Error(
        "[reactolith] createLoader: `groups` is mutually exclusive with " +
          "`modules`/`prefix`.",
      );
    }
    if (!options.groups.length) {
      throw new Error("[reactolith] createLoader: `groups` must not be empty.");
    }
    return options.groups.map((g) => ({
      moduleMaps: g.modules,
      index: null,
      prefix: g.prefix ?? "",
      strict: true,
    }));
  }
  if (!options.modules) {
    throw new Error(
      "[reactolith] createLoader: provide `modules` or `groups`.",
    );
  }
  return [
    {
      moduleMaps: options.modules,
      index: null,
      prefix: options.prefix ?? "",
      strict: false,
    },
  ];
}

function matchGroup(
  groups: NormalizedGroup[],
  is: string,
): { group: NormalizedGroup; name: string } | null {
  for (const g of groups) {
    if (is.startsWith(g.prefix)) {
      return { group: g, name: is.slice(g.prefix.length) };
    }
  }
  if (groups.length === 1 && !groups[0].strict) {
    return { group: groups[0], name: is };
  }
  return null;
}

export function createLoader(options: LoaderOptions): ElementType<{
  is: string;
  [key: string]: unknown;
}> {
  const groups = normalizeGroups(options);
  const fallback = options.fallback ?? null;
  const onMissing = options.onMissing;
  const cache = new Map<string, ComponentType<unknown>>();

  // The lazy wrapper is built during render, but it is memoized in `cache`
  // under the tag name — a given `is` keeps one component identity for the
  // lifetime of the loader, so the remount this rule warns about cannot
  // happen here.
  /* eslint-disable @eslint-react/static-components */
  const Loader: React.FC<{ is: string; [key: string]: unknown }> = ({
    is,
    ...rest
  }) => {
    let Component = cache.get(is);
    if (!Component) {
      Component = React.lazy(async () => {
        const match = matchGroup(groups, is);
        const name = match ? match.name : is;
        try {
          if (!match) {
            throw new Error(
              `[reactolith] Could not resolve component "${is}". ` +
                `No group prefix matched.`,
            );
          }
          return await resolveComponent(name, match.group);
        } catch (err) {
          if (onMissing) {
            const Fallback = onMissing(name, is);
            if (Fallback) return { default: Fallback };
          }
          // Drop the cached lazy wrapper so a subsequent render can retry.
          // Without this, React.lazy caches the rejection internally and
          // re-throws forever, leaving the consumer stuck behind an Error
          // Boundary with no recovery path.
          cache.delete(is);
          throw err;
        }
      }) as ComponentType<unknown>;
      cache.set(is, Component);
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
  /* eslint-enable @eslint-react/static-components */

  Loader.displayName = "ReactolithLoader";
  return Loader;
}
