import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runCli } from "../src/cli/runCli";
import fs from "fs";
import path from "path";

const fixturesDir = path.join(__dirname, "fixtures");
const componentsDir = path.join(fixturesDir, "components");
const tsconfig = path.join(fixturesDir, "tsconfig.json");

describe("runCli", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  const cleanups: string[] = [];

  function tmp(name: string): string {
    const file = path.join(fixturesDir, name);
    cleanups.push(file);
    return file;
  }

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    while (cleanups.length) {
      const file = cleanups.pop()!;
      if (fs.existsSync(file))
        fs.rmSync(file, { recursive: true, force: true });
    }
  });

  it("prints help and exits 0 with --help", () => {
    const code = runCli(["--help"]);
    expect(code).toBe(0);
    const out = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(out).toMatch(/Usage: generate-web-types/);
  });

  it("exits 1 with a usage message when an unknown option is passed", () => {
    const code = runCli(["--definitely-not-a-flag"]);
    expect(code).toBe(1);
    const err = errorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(err).toMatch(/generate-web-types:/);
    expect(err).toMatch(/Run with --help/);
  });

  it("rejects --prefix that does not end with `-` (single-output mode)", () => {
    const out = tmp("cli-bad-prefix.json");
    const code = runCli([
      "--components",
      componentsDir,
      "--prefix",
      "ui",
      "--out",
      out,
      "--tsconfig",
      tsconfig,
    ]);
    expect(code).toBe(1);
    const err = errorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(err).toMatch(/--prefix must be empty or end with "-"/);
  });

  it("errors when --components count does not match --out count in multi-output mode", () => {
    const aOut = tmp("cli-multi-a.json");
    const bOut = tmp("cli-multi-b.json");
    const code = runCli([
      "-c",
      componentsDir,
      // Only ONE -c, but TWO --out → mismatch.
      "-o",
      aOut,
      "-o",
      bOut,
      "-t",
      tsconfig,
    ]);
    expect(code).toBe(1);
    const err = errorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(err).toMatch(/in multi-output mode, --components must be given/);
    expect(err).toMatch(/Run with --help/);
  });

  it("errors on a --prefix value that doesn't end with `-` in multi-output mode", () => {
    const aOut = tmp("cli-multi-bad-prefix-a.json");
    const bOut = tmp("cli-multi-bad-prefix-b.json");
    const code = runCli([
      "-c",
      componentsDir,
      "-c",
      componentsDir,
      "-p",
      "ui-",
      "-p",
      "bad", // missing trailing `-`
      "-o",
      aOut,
      "-o",
      bOut,
      "-t",
      tsconfig,
    ]);
    expect(code).toBe(1);
    const err = errorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(err).toMatch(/--prefix must be empty or end with "-"/);
  });

  it("errors when --prefix count does not match --out count and is > 1", () => {
    const aOut = tmp("cli-multi-prefix-mismatch-a.json");
    const bOut = tmp("cli-multi-prefix-mismatch-b.json");
    const cOut = tmp("cli-multi-prefix-mismatch-c.json");
    const code = runCli([
      "-c",
      componentsDir,
      "-c",
      componentsDir,
      "-c",
      componentsDir,
      // 3 outputs, but 2 prefixes — neither 0, 1, nor 3, so fanOut throws.
      "-p",
      "ui-",
      "-p",
      "form-",
      "-o",
      aOut,
      "-o",
      bOut,
      "-o",
      cOut,
      "-t",
      tsconfig,
    ]);
    expect(code).toBe(1);
    const err = errorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(err).toMatch(/--prefix: expected 0, 1, or 3 value\(s\)/);
  });

  it("accepts the legacy positional argument form (componentsDir tsconfig outFile)", () => {
    const out = tmp("cli-positional.json");
    const code = runCli([componentsDir, tsconfig, out]);
    expect(code).toBe(0);
    expect(fs.existsSync(out)).toBe(true);
    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    expect(json).toHaveProperty("contributions.html.elements");
    // The fixtures contain Button — verify it's in there so we know the
    // legacy positional path actually wired through the components dir.
    const names = json.contributions.html.elements.map((e: any) => e.name);
    expect(names).toContain("button");
  });

  it("writes a single-output file via the modern --components/--out flags", () => {
    const out = tmp("cli-single.json");
    const code = runCli([
      "-c",
      componentsDir,
      "-o",
      out,
      "-p",
      "ui-",
      "-t",
      tsconfig,
      "-n",
      "cli-test",
      "-v",
      "9.9.9",
    ]);
    expect(code).toBe(0);
    expect(fs.existsSync(out)).toBe(true);
    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    expect(json.name).toBe("cli-test");
    expect(json.version).toBe("9.9.9");
    const names = json.contributions.html.elements.map((e: any) => e.name);
    expect(names).toContain("ui-button");
  });

  it("supports the multi-output mode end-to-end", () => {
    const aOut = tmp("cli-multi-ok-a.json");
    const bOut = tmp("cli-multi-ok-b.json");
    const code = runCli([
      "-c",
      componentsDir,
      "-c",
      componentsDir,
      // Single shared prefix fanned out to both groups.
      "-p",
      "ui-",
      "-o",
      aOut,
      "-o",
      bOut,
      "-t",
      tsconfig,
    ]);
    expect(code).toBe(0);
    expect(fs.existsSync(aOut)).toBe(true);
    expect(fs.existsSync(bOut)).toBe(true);

    const a = JSON.parse(fs.readFileSync(aOut, "utf-8"));
    const b = JSON.parse(fs.readFileSync(bOut, "utf-8"));
    expect(a.contributions.html.elements.map((e: any) => e.name)).toContain(
      "ui-button",
    );
    expect(b.contributions.html.elements.map((e: any) => e.name)).toContain(
      "ui-button",
    );
  });

  it("prefers tsconfig.app.json when no -t flag is passed and the file exists", () => {
    // When neither --tsconfig nor a positional tsconfig is supplied,
    // detectDefaultTsconfig() probes for ./tsconfig.app.json before
    // falling back to ./tsconfig.json. Force the probe to succeed by
    // spying on fs.existsSync.
    const realExistsSync = fs.existsSync;
    const existsSpy = vi
      .spyOn(fs, "existsSync")
      .mockImplementation((p: fs.PathLike) => {
        if (typeof p === "string" && p === "./tsconfig.app.json") return true;
        return realExistsSync(p);
      });

    try {
      const out = tmp("cli-default-tsconfig.json");
      // The detected tsconfig (./tsconfig.app.json) does not exist, so the
      // run will ultimately fail — but the early console.log line that
      // prints the chosen tsconfig is what we're after.
      runCli(["-c", componentsDir, "-o", out]);

      const logs = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(logs).toMatch(/using tsconfig \.\/tsconfig\.app\.json/);
    } finally {
      existsSpy.mockRestore();
    }
  });

  it("propagates generateWebTypes errors as exit code 1", () => {
    const out = tmp("cli-bad-dir.json");
    const code = runCli([
      "-c",
      path.join(fixturesDir, "does-not-exist"),
      "-o",
      out,
      "-t",
      tsconfig,
    ]);
    expect(code).toBe(1);
    const err = errorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(err).toMatch(/Components directory does not exist/);
  });
});
