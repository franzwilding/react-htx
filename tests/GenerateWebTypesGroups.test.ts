import { describe, it, expect, afterEach } from "vitest";
import { generateWebTypes } from "../src/cli/GenerateWebTypes";
import fs from "fs";
import path from "path";

const fixturesDir = path.join(__dirname, "fixtures");
const shadcnDir = path.join(fixturesDir, "shadcn");
const tsconfig = path.join(shadcnDir, "tsconfig.json");

const cleanups: string[] = [];
function tmp(name: string): string {
  const file = path.join(fixturesDir, name);
  cleanups.push(file);
  return file;
}

afterEach(() => {
  while (cleanups.length) {
    const file = cleanups.pop()!;
    if (fs.existsSync(file)) {
      fs.rmSync(file, { recursive: true, force: true });
    }
  }
});

describe("generateWebTypes — multi-output (groups)", () => {
  it("emits one file per group with the right elements + prefix", () => {
    const uiOut = tmp("test-ui.json");
    const chartsOut = tmp("test-charts.json");
    const formsOut = tmp("test-forms.json");

    const result = generateWebTypes({
      tsconfig,
      name: "shadcn-fixtures",
      version: "1.2.3",
      groups: [
        {
          from: path.join(shadcnDir, "ui"),
          out: uiOut,
          prefix: "ui-",
        },
        {
          from: path.join(shadcnDir, "charts"),
          out: chartsOut,
          prefix: "chart-",
        },
        {
          from: path.join(shadcnDir, "forms"),
          out: formsOut,
          prefix: "form-",
        },
      ],
    });

    expect(result.outputs).toHaveLength(3);
    expect(result.outputs.map((o) => o.out)).toEqual([
      uiOut,
      chartsOut,
      formsOut,
    ]);

    const ui = JSON.parse(fs.readFileSync(uiOut, "utf-8"));
    const charts = JSON.parse(fs.readFileSync(chartsOut, "utf-8"));
    const forms = JSON.parse(fs.readFileSync(formsOut, "utf-8"));

    expect(ui.name).toBe("shadcn-fixtures");
    expect(ui.version).toBe("1.2.3");

    const uiNames = ui.contributions.html.elements.map((e: any) => e.name);
    expect(uiNames).toContain("ui-button");
    expect(uiNames).toContain("ui-dialog");
    expect(uiNames).toContain("ui-dialog-trigger");
    expect(uiNames).toContain("ui-card");
    expect(uiNames).toContain("ui-card-header");
    expect(uiNames).toContain("ui-data-table");
    // chart elements must NOT leak into ui
    expect(uiNames).not.toContain("chart-bar-chart");
    expect(uiNames).not.toContain("ui-bar-chart");

    const chartNames = charts.contributions.html.elements.map(
      (e: any) => e.name,
    );
    expect(chartNames).toEqual(
      expect.arrayContaining(["chart-bar-chart", "chart-line-chart"]),
    );
    // ui elements must NOT leak into charts
    expect(chartNames).not.toContain("chart-button");

    const formNames = forms.contributions.html.elements.map((e: any) => e.name);
    expect(formNames).toContain("form-text-field");
  });

  it("supports per-group library name and version overrides", () => {
    const aOut = tmp("test-a.json");
    const bOut = tmp("test-b.json");

    generateWebTypes({
      tsconfig,
      name: "default-name",
      version: "0.0.0",
      groups: [
        {
          from: path.join(shadcnDir, "charts"),
          out: aOut,
          prefix: "chart-",
        },
        {
          from: path.join(shadcnDir, "forms"),
          out: bOut,
          prefix: "form-",
          name: "forms-only",
          version: "9.9.9",
        },
      ],
    });

    const a = JSON.parse(fs.readFileSync(aOut, "utf-8"));
    const b = JSON.parse(fs.readFileSync(bOut, "utf-8"));

    expect(a.name).toBe("default-name");
    expect(a.version).toBe("0.0.0");
    expect(b.name).toBe("forms-only");
    expect(b.version).toBe("9.9.9");
  });

  it("creates intermediate output directories", () => {
    const nestedDir = tmp("nested-out");
    fs.mkdirSync(nestedDir, { recursive: true });
    const out = path.join(nestedDir, "deep", "tree", "web-types.json");

    generateWebTypes({
      tsconfig,
      groups: [
        {
          from: path.join(shadcnDir, "charts"),
          out,
          prefix: "chart-",
        },
      ],
    });

    expect(fs.existsSync(out)).toBe(true);
  });

  it("rejects duplicate output paths across groups", () => {
    const sameOut = tmp("dup-out.json");
    expect(() =>
      generateWebTypes({
        tsconfig,
        groups: [
          {
            from: path.join(shadcnDir, "ui"),
            out: sameOut,
            prefix: "ui-",
          },
          {
            from: path.join(shadcnDir, "charts"),
            out: sameOut,
            prefix: "chart-",
          },
        ],
      }),
    ).toThrow(/duplicate output path/i);
  });

  it("rejects a prefix that doesn't end with `-`", () => {
    const out = tmp("bad-prefix.json");
    expect(() =>
      generateWebTypes({
        tsconfig,
        groups: [
          {
            from: path.join(shadcnDir, "ui"),
            out,
            prefix: "ui",
          },
        ],
      }),
    ).toThrow(/prefix must be empty or end with "-"/i);
  });

  it("applies shared excludes to every group", () => {
    const uiOut = tmp("ex-ui.json");
    const chartsOut = tmp("ex-charts.json");

    generateWebTypes({
      tsconfig,
      exclude: ["**/dialog.tsx", "**/bar-chart.tsx"],
      groups: [
        {
          from: path.join(shadcnDir, "ui"),
          out: uiOut,
          prefix: "ui-",
        },
        {
          from: path.join(shadcnDir, "charts"),
          out: chartsOut,
          prefix: "chart-",
        },
      ],
    });

    const ui = JSON.parse(fs.readFileSync(uiOut, "utf-8"));
    const charts = JSON.parse(fs.readFileSync(chartsOut, "utf-8"));

    const uiNames = ui.contributions.html.elements.map((e: any) => e.name);
    expect(uiNames).not.toContain("ui-dialog");
    expect(uiNames).toContain("ui-button");

    const chartNames = charts.contributions.html.elements.map(
      (e: any) => e.name,
    );
    expect(chartNames).not.toContain("chart-bar-chart");
    expect(chartNames).toContain("chart-line-chart");
  });

  it("extracts every export from a multi-export shadcn-style file", () => {
    const out = tmp("multi-export.json");

    generateWebTypes({
      tsconfig,
      groups: [
        {
          from: path.join(shadcnDir, "ui"),
          out,
          prefix: "ui-",
        },
      ],
    });

    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    const names = new Set(
      json.contributions.html.elements.map((e: any) => e.name),
    );

    // Dialog: 7 exports from a single dialog.tsx
    for (const n of [
      "ui-dialog",
      "ui-dialog-trigger",
      "ui-dialog-content",
      "ui-dialog-header",
      "ui-dialog-footer",
      "ui-dialog-title",
      "ui-dialog-description",
    ]) {
      expect(names.has(n)).toBe(true);
    }

    // Card: 6 exports from card.tsx
    for (const n of [
      "ui-card",
      "ui-card-header",
      "ui-card-title",
      "ui-card-description",
      "ui-card-content",
      "ui-card-footer",
    ]) {
      expect(names.has(n)).toBe(true);
    }

    // Select: 8 exports from select.tsx
    for (const n of [
      "ui-select",
      "ui-select-trigger",
      "ui-select-value",
      "ui-select-content",
      "ui-select-item",
      "ui-select-group",
      "ui-select-label",
      "ui-select-separator",
    ]) {
      expect(names.has(n)).toBe(true);
    }
  });

  it("discovers components in nested folders (data-table inside ui/)", () => {
    const out = tmp("nested.json");

    generateWebTypes({
      tsconfig,
      groups: [
        {
          from: path.join(shadcnDir, "ui"),
          out,
          prefix: "ui-",
        },
      ],
    });

    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    const names = json.contributions.html.elements.map((e: any) => e.name);

    expect(names).toContain("ui-data-table");
    expect(names).toContain("ui-data-table-header");
    expect(names).toContain("ui-data-table-row");
    expect(names).toContain("ui-data-table-cell");
  });

  it("captures cva-style enum variants on a button", () => {
    const out = tmp("button-variants.json");

    generateWebTypes({
      tsconfig,
      groups: [{ from: path.join(shadcnDir, "ui"), out, prefix: "ui-" }],
    });

    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    const button = json.contributions.html.elements.find(
      (e: any) => e.name === "ui-button",
    );
    expect(button).toBeDefined();

    const variant = button.attributes.find((a: any) => a.name === "variant");
    expect(variant).toBeDefined();
    expect(variant.values.map((v: any) => v.name)).toEqual(
      expect.arrayContaining([
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ]),
    );

    const size = button.attributes.find((a: any) => a.name === "size");
    expect(size.values.map((v: any) => v.name)).toEqual(
      expect.arrayContaining(["default", "sm", "lg", "icon"]),
    );
  });

  it("treats a React 19 ref-as-prop the same as a regular ref (skipped)", () => {
    const out = tmp("ref-as-prop.json");

    generateWebTypes({
      tsconfig,
      groups: [{ from: path.join(shadcnDir, "ui"), out, prefix: "ui-" }],
    });

    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    const input = json.contributions.html.elements.find(
      (e: any) => e.name === "ui-input",
    );

    expect(input).toBeDefined();
    // The `ref` prop is filtered out (matches the existing behaviour for
    // forwardRef components), so it never shows up as a `ref` attribute.
    expect(input.attributes.find((a: any) => a.name === "ref")).toBeUndefined();
    expect(input.attributes.find((a: any) => a.name === "type")).toBeDefined();
    expect(
      input.attributes.find((a: any) => a.name === "placeholder"),
    ).toBeDefined();
  });

  it("returns an empty `groups` list as an error", () => {
    expect(() =>
      generateWebTypes({
        tsconfig,
        groups: [],
      }),
    ).toThrow(/at least one entry/i);
  });

  it("identifies the default slot for shadcn cards (children)", () => {
    const out = tmp("card-slots.json");

    generateWebTypes({
      tsconfig,
      groups: [{ from: path.join(shadcnDir, "ui"), out, prefix: "ui-" }],
    });

    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    const cardContent = json.contributions.html.elements.find(
      (e: any) => e.name === "ui-card-content",
    );
    expect(cardContent).toBeDefined();
    expect(cardContent.slots).toBeDefined();
    expect(cardContent.slots.some((s: any) => s.name === "default")).toBe(true);
  });

  it("emits each output sorted alphabetically", () => {
    const uiOut = tmp("sort-ui.json");
    const chartsOut = tmp("sort-charts.json");

    generateWebTypes({
      tsconfig,
      groups: [
        { from: path.join(shadcnDir, "ui"), out: uiOut, prefix: "ui-" },
        {
          from: path.join(shadcnDir, "charts"),
          out: chartsOut,
          prefix: "chart-",
        },
      ],
    });

    for (const file of [uiOut, chartsOut]) {
      const elements = JSON.parse(fs.readFileSync(file, "utf-8")).contributions
        .html.elements;
      const names = elements.map((e: any) => e.name);
      expect(names).toEqual([...names].sort());
    }
  });
});
