import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve, relative, dirname, join } from "node:path";
import { readdirSync } from "node:fs";

const docsRoot = dirname(new URL(import.meta.url).pathname);

// Locally, this docs site lives inside the reactolith repo at `<lib>/docs`,
// so the library source sits at `../src`. In CI for the github.io split,
// the library is checked out separately and pointed to via REACTOLITH_LIB.
const libRoot = process.env.REACTOLITH_LIB
  ? resolve(process.env.REACTOLITH_LIB)
  : resolve(docsRoot, "..");

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

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(docsRoot, "src"),
      reactolith: resolve(libRoot, "src/index.ts"),
      "reactolith/server": resolve(libRoot, "src/server.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    rollupOptions: { input: findHtmlInputs() },
  },
});
