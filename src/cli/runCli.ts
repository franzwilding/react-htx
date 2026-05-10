import {
  generateWebTypes,
  WebTypesGroup,
  GenerateResult,
} from "./GenerateWebTypes";
import fs from "fs";
import path from "path";
import { parseArgs } from "node:util";

/**
 * Detect the default tsconfig file.
 * Prefers tsconfig.app.json (common in Vite/modern setups) over tsconfig.json.
 */
function detectDefaultTsconfig(): string {
  if (fs.existsSync("./tsconfig.app.json")) {
    return "./tsconfig.app.json";
  }
  return "./tsconfig.json";
}

function printHelp(): void {
  console.log(`
Usage: generate-web-types [options]

Single output (one web-types JSON for one or more folders):
  -c, --components <dir>      Components directory (repeatable / comma-separated)
  -p, --prefix <prefix>       Element name prefix (must end with "-" or be empty)
  -o, --out <file>            Output file (default: web-types.json)
  -n, --name <name>           Library name (default: reactolith-components)
  -v, --version <version>     Library version (default: 1.0.0)
  -t, --tsconfig <file>       TypeScript config file
                              (default: tsconfig.app.json if exists, else tsconfig.json)
      --exclude <pattern>     Glob pattern to skip (repeatable)
  -h, --help                  Show this help

Multiple outputs (one web-types JSON per group, paired positionally):
  Repeat --out N times to define N groups. Each --out pulls the i-th
  --components and the i-th --prefix. The web-types spec allows package.json
  to point at an array of files, so this is the cleanest way to ship
  separate prefixes for separate folders.

Pairing rules when --out is repeated:
  --components: must be given N times (the i-th one feeds the i-th --out)
  --prefix:     0, 1, or N. (0 = no prefix; 1 = same prefix for all; N = per-group)
  --name:       0, 1, or N. (0 = default name for all; 1 = same; N = per-group)
  --version:    0, 1, or N.
  --exclude:    applied to every group.
  --tsconfig:   one shared TS project for all groups.

Examples:
  # Single output
  generate-web-types -c src/components/ui -p ui- -o web-types.json

  # Two outputs, two prefixes (shadcn-style + chart components)
  generate-web-types \\
    -c src/components/ui     -p ui-    -o web-types/ui.json \\
    -c src/components/charts -p chart- -o web-types/charts.json

  # Three outputs, all share the same library name & version
  generate-web-types -n my-app -v 2.0.0 \\
    -c src/components/ui    -p ui-   -o web-types/ui.json \\
    -c src/components/forms -p form- -o web-types/forms.json \\
    -c src/components/icons -p i-    -o web-types/icons.json
`);
}

function expandList(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return [];
  const out: string[] = [];
  for (const v of values) {
    for (const part of v.split(",")) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

/**
 * Pair an arg list of length 0, 1, or N into N values.
 * - 0 → returns N copies of `fallback`
 * - 1 → returns N copies of values[0]
 * - N → returns the array as-is
 * - anything else → throws with `flagName`
 */
function fanOut<T>(values: T[], n: number, flagName: string, fallback: T): T[] {
  if (values.length === 0) return Array(n).fill(fallback);
  if (values.length === 1) return Array(n).fill(values[0]);
  if (values.length === n) return values;
  throw new Error(
    `${flagName}: expected 0, 1, or ${n} value(s) to match the number of --out flags, got ${values.length}.`,
  );
}

/**
 * Run the CLI with the given argv (no `node` / script-name prefix).
 * Returns an exit code: 0 on success, 1 on any user-visible error.
 *
 * Exposed so tests can drive the CLI directly without spawning a child
 * process. The bin entry point in `generate-web-types.ts` calls
 * `runCli(process.argv.slice(2))` and forwards the exit code.
 */
export function runCli(argv: string[]): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        components: { type: "string", short: "c", multiple: true },
        tsconfig: { type: "string", short: "t" },
        out: { type: "string", short: "o", multiple: true },
        name: { type: "string", short: "n", multiple: true },
        version: { type: "string", short: "v", multiple: true },
        prefix: { type: "string", short: "p", multiple: true },
        exclude: { type: "string", multiple: true },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(
      `generate-web-types: ${(err as Error).message}\nRun with --help for usage.`,
    );
    return 1;
  }

  const { values, positionals } = parsed;

  if (values.help) {
    printHelp();
    return 0;
  }

  // Backward-compat: legacy positional arguments (componentsDir tsconfig outFile).
  const positionalComponentsDir = positionals[0];
  const positionalTsconfig = positionals[1];
  const positionalOutFile = positionals[2];

  const componentsRaw = (values.components as string[] | undefined) ?? [];
  const outsRaw = (values.out as string[] | undefined) ?? [];
  const prefixesRaw = (values.prefix as string[] | undefined) ?? [];
  const namesRaw = (values.name as string[] | undefined) ?? [];
  const versionsRaw = (values.version as string[] | undefined) ?? [];

  const tsconfig =
    (values.tsconfig as string | undefined) ||
    positionalTsconfig ||
    detectDefaultTsconfig();

  const sharedExclude = expandList(values.exclude as string[] | undefined);

  console.log(`generate-web-types: using tsconfig ${tsconfig}`);

  let groups: WebTypesGroup[];

  const isMulti = outsRaw.length > 1;

  if (isMulti) {
    const n = outsRaw.length;

    // In multi mode: --components must come N times, one per --out.
    // We do NOT split commas inside a single --components flag here, so each
    // group can still pull multiple folders by passing them comma-separated:
    //   -c "src/a,src/b" -p ui- -o ui.json
    if (componentsRaw.length !== n) {
      console.error(
        `generate-web-types: in multi-output mode, --components must be given exactly ${n} time(s) ` +
          `(once per --out), got ${componentsRaw.length}. Run with --help for usage.`,
      );
      return 1;
    }

    let prefixes: string[];
    let names: (string | undefined)[];
    let versions: (string | undefined)[];
    try {
      prefixes = fanOut(prefixesRaw, n, "--prefix", "");
      names = fanOut(namesRaw, n, "--name", undefined);
      versions = fanOut(versionsRaw, n, "--version", undefined);
    } catch (err) {
      console.error(
        `generate-web-types: ${(err as Error).message}\nRun with --help for usage.`,
      );
      return 1;
    }

    for (const p of prefixes) {
      if (p && !p.endsWith("-")) {
        console.error(
          `generate-web-types: --prefix must be empty or end with "-". Got "${p}".`,
        );
        return 1;
      }
    }

    groups = outsRaw.map((out, i) => {
      const fromList = expandList([componentsRaw[i]]);
      return {
        from: fromList.length === 1 ? fromList[0] : fromList,
        out,
        prefix: prefixes[i],
        name: names[i],
        version: versions[i],
      };
    });
  } else {
    // Single-output mode (back-compat): merge all -c into one group.
    const components =
      expandList(componentsRaw).length > 0
        ? expandList(componentsRaw)
        : positionalComponentsDir
          ? [positionalComponentsDir]
          : ["components/ui"];

    const prefix = prefixesRaw[0] ?? "";
    if (prefix && !prefix.endsWith("-")) {
      console.error(
        `generate-web-types: --prefix must be empty or end with "-". Got "${prefix}".`,
      );
      return 1;
    }

    const out =
      outsRaw[0] ??
      (positionalOutFile as string | undefined) ??
      "web-types.json";

    groups = [
      {
        from: components.length === 1 ? components[0] : components,
        out,
        prefix,
        name: namesRaw[0],
        version: versionsRaw[0],
      },
    ];
  }

  let result: GenerateResult;
  try {
    result = generateWebTypes({
      groups,
      tsconfig,
      exclude: sharedExclude,
    });
  } catch (err) {
    console.error(`generate-web-types: ${(err as Error).message}`);
    return 1;
  }

  console.log(`generate-web-types: wrote ${result.outputs.length} file(s):`);
  for (const o of result.outputs) {
    console.log(
      `  ${o.out} (${o.elementCount} element${o.elementCount === 1 ? "" : "s"}` +
        (o.prefix ? `, prefix "${o.prefix}"` : "") +
        `)`,
    );
  }

  if (result.outputs.length > 1) {
    const rel = result.outputs.map((o) => `"./${path.relative(".", o.out)}"`);
    console.log(
      `\nAdd to your package.json:\n  "web-types": [\n    ${rel.join(
        ",\n    ",
      )}\n  ]`,
    );
  } else if (result.outputs.length === 1) {
    console.log(
      `\nAdd to your package.json:\n  "web-types": "./${path.relative(
        ".",
        result.outputs[0].out,
      )}"`,
    );
  }

  return 0;
}
