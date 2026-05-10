import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import dts from "rollup-plugin-dts";

// externalize react and its subpaths (jsx-runtime) + react-dom if you use it
const external = (id) => /^(react|react-dom|ts-morph)(\/|$)/.test(id);

// rollup-plugin-typescript2's default include uses `*.ts+(|x)`, which newer
// picomatch versions no longer match. Provide explicit globs so .ts/.tsx files
// actually go through the TypeScript transform.
const tsInclude = ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts"];
const tsExclude = ["**/*.d.ts", "**/*.d.cts", "**/*.d.mts"];

export default [
  // JS bundles
  {
    input: "src/index.ts",
    external,

    plugins: [
      peerDepsExternal(),
      resolve({ extensions: [".mjs", ".js", ".ts", ".tsx"] }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        clean: true,
        include: tsInclude,
        exclude: tsExclude,
        tsconfigOverride: { compilerOptions: { declaration: false } }, // dts plugin handles .d.ts
      }),
    ],
    output: [
      { file: "dist/index.mjs", format: "esm", sourcemap: true },
      {
        file: "dist/index.cjs",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
  },
  // Server-only entry (react-dom/server)
  {
    input: "src/server.ts",
    external,
    plugins: [
      peerDepsExternal(),
      resolve({ extensions: [".mjs", ".js", ".ts", ".tsx"] }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        clean: true,
        include: tsInclude,
        exclude: tsExclude,
        tsconfigOverride: { compilerOptions: { declaration: false } },
      }),
    ],
    output: [
      { file: "dist/server.mjs", format: "esm", sourcemap: true },
      {
        file: "dist/server.cjs",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
  },
  // CLI bundle
  {
    input: "src/cli/generate-web-types.ts",
    external,
    plugins: [
      peerDepsExternal(),
      resolve({ extensions: [".mjs", ".js", ".ts", ".tsx"] }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        clean: true,
        include: tsInclude,
        exclude: tsExclude,
        tsconfigOverride: { compilerOptions: { declaration: false } }, // dts plugin handles .d.ts
      }),
    ],
    output: [
      {
        file: "dist/cli/generate-web-types.cjs",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
  },
  // Types — main
  {
    input: "src/index.ts",
    plugins: [dts()],
    output: { file: "dist/index.d.ts", format: "es" },
  },
  // Types — server
  {
    input: "src/server.ts",
    plugins: [dts()],
    output: { file: "dist/server.d.ts", format: "es" },
  },
];
