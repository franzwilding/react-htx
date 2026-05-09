import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve, relative, dirname, join } from "node:path";
import { readdirSync } from "node:fs";

const isPages = process.env.GITHUB_PAGES === "true";

const docsRoot = dirname(new URL(import.meta.url).pathname);

function findHtmlInputs(): Record<string, string> {
  const inputs: Record<string, string> = {};
  const ignore = new Set(["node_modules", "dist", "src", "public"]);
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (ignore.has(entry.name) || entry.name.startsWith(".")) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        const full = join(dir, entry.name);
        const rel = relative(docsRoot, full);
        const key =
          rel === "index.html"
            ? "main"
            : rel.replace(/\/index\.html$/, "").replace(/\.html$/, "");
        inputs[key || "main"] = full;
      }
    }
  };
  walk(docsRoot);
  return inputs;
}

const base = isPages ? "/reactolith/" : "/";

// Rewrite root-relative `href` and `action` attributes in HTML so they
// stay correct under the GitHub Pages sub-path (e.g. /reactolith/).
// Skips fragments, external URLs, and already-prefixed paths.
const rewriteHtmlLinks = {
  name: "rewrite-html-links",
  transformIndexHtml(html: string) {
    if (base === "/") return html;
    return html.replace(
      /\b(href|action)="\/(?!\/|reactolith\/)([^"#?][^"]*)"/g,
      (_m, attr, rest) => `${attr}="${base}${rest}"`,
    );
  },
};

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), rewriteHtmlLinks],
  resolve: {
    alias: {
      "@": resolve(docsRoot, "src"),
      reactolith: resolve(docsRoot, "../src/index.ts"),
      "reactolith/server": resolve(docsRoot, "../src/server.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    rollupOptions: { input: findHtmlInputs() },
  },
});
