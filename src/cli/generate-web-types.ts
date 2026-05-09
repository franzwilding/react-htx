#!/usr/bin/env node
import { generateWebTypes } from "./GenerateWebTypes";
import fs from "fs";
import { parseArgs } from "node:util";

/**
 * Detect the default tsconfig file.
 * Prefers tsconfig.app.json (common in Vite/modern setups) over tsconfig.json
 */
function detectDefaultTsconfig(): string {
  if (fs.existsSync("./tsconfig.app.json")) {
    return "./tsconfig.app.json";
  }
  return "./tsconfig.json";
}

function printHelp() {
  console.log(`
Usage: generate-web-types [options]

Options:
  --components, -c <dir>      Components directory. Repeatable, or comma-separated.
                              (default: components/ui)
  --tsconfig, -t <file>       TypeScript config file
                              (default: tsconfig.app.json if exists, else tsconfig.json)
  --out, -o <file>            Output file (default: web-types.json)
  --name, -n <name>           Library name (default: reactolith-components)
  --version, -v <version>     Library version (default: 1.0.0)
  --prefix, -p <prefix>       Element name prefix (default: ""). Must be empty or end with "-".
  --exclude <pattern>         Glob pattern to skip (e.g. "**/*.stories.tsx"). Repeatable.
  --help, -h                  Show this help message

All flags accept both "--name value" and "--name=value".

Examples:
  generate-web-types -c src/components -o web-types.json
  generate-web-types --components=src/ui --components=src/lib-ui --prefix=ui-
  generate-web-types -c src --exclude '**/*.stories.tsx' --exclude '**/*.test.tsx'
`);
}

function expandList(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  const out: string[] = [];
  for (const v of values) {
    for (const part of v.split(",")) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out.length ? out : undefined;
}

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    options: {
      components: { type: "string", short: "c", multiple: true },
      tsconfig: { type: "string", short: "t" },
      out: { type: "string", short: "o" },
      name: { type: "string", short: "n" },
      version: { type: "string", short: "v" },
      prefix: { type: "string", short: "p" },
      exclude: { type: "string", multiple: true },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });
} catch (err) {
  console.error(
    `generate-web-types: ${(err as Error).message}\nRun with --help for usage.`,
  );
  process.exit(1);
}

const { values, positionals } = parsed;

if (values.help) {
  printHelp();
  process.exit(0);
}

// Backward-compat: legacy positional arguments (componentsDir tsconfig outFile).
const positionalComponentsDir = positionals[0];
const positionalTsconfig = positionals[1];
const positionalOutFile = positionals[2];

const components =
  expandList(values.components as string[] | undefined) ??
  (positionalComponentsDir ? [positionalComponentsDir] : undefined);

const prefix = values.prefix ?? "";
if (prefix && !prefix.endsWith("-")) {
  console.error(
    `generate-web-types: --prefix must be empty or end with "-". Got "${prefix}".`,
  );
  process.exit(1);
}

const tsconfig =
  (values.tsconfig as string | undefined) ||
  positionalTsconfig ||
  detectDefaultTsconfig();

console.log(`generate-web-types: using tsconfig ${tsconfig}`);

generateWebTypes({
  componentsDir: components ?? "components/ui",
  tsconfig,
  outFile:
    (values.out as string | undefined) || positionalOutFile || "web-types.json",
  libraryName: (values.name as string | undefined) || "reactolith-components",
  libraryVersion: (values.version as string | undefined) || "1.0.0",
  prefix,
  exclude: expandList(values.exclude as string[] | undefined),
});
