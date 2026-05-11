import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

interface ManifestEntry {
  file: string;
  imports?: string[];
  css?: string[];
}
type Manifest = Record<string, ManifestEntry>;

interface Options {
  /**
   * Map a custom-element tag name (e.g. "ui-button") to the Vite manifest key
   * that implements it (e.g. "src/components/ui/button.tsx"). Return null for
   * tags that should not be preloaded.
   */
  resolve: (tag: string) => string | null;
  /** Output directory to scan. Defaults to "dist". */
  outDir?: string;
}

const TAG_PATTERN = /<([a-z][a-z0-9]*-[a-z0-9-]*)\b/gi;
const MARKER = "<!-- reactolith: preloaded component chunks -->";

function collectTags(html: string): Set<string> {
  const tags = new Set<string>();
  for (const m of html.matchAll(TAG_PATTERN)) tags.add(m[1].toLowerCase());
  return tags;
}

function walkHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(p, out);
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

export function preloadComponentChunks(opts: Options): Plugin {
  const outDir = opts.outDir ?? "dist";
  return {
    name: "reactolith-docs:preload-component-chunks",
    apply: "build",
    closeBundle() {
      const manifestPath = join(outDir, ".vite", "manifest.json");
      let manifest: Manifest;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch {
        this.warn(`manifest not found at ${manifestPath} — skipping preload injection`);
        return;
      }

      const expand = (key: string, seen: Set<string>, links: string[]) => {
        const entry = manifest[key];
        if (!entry || seen.has(entry.file)) return;
        seen.add(entry.file);
        links.push(`<link rel="modulepreload" href="/${entry.file}">`);
        for (const css of entry.css ?? []) {
          if (seen.has(css)) continue;
          seen.add(css);
          links.push(`<link rel="preload" as="style" href="/${css}">`);
        }
        for (const imp of entry.imports ?? []) expand(imp, seen, links);
      };

      for (const htmlPath of walkHtml(outDir)) {
        const source = readFileSync(htmlPath, "utf8");
        if (source.includes(MARKER)) continue;
        const links: string[] = [];
        const seen = new Set<string>();
        for (const tag of collectTags(source)) {
          const key = opts.resolve(tag);
          if (key) expand(key, seen, links);
        }
        if (!links.length) continue;
        const block = `\n    ${MARKER}\n    ${links.join("\n    ")}\n  `;
        const next = source.replace(/\s*<\/head>/i, `${block}</head>`);
        writeFileSync(htmlPath, next);
      }
    },
  };
}
