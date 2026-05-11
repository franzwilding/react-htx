import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateWebTypes } from "../src/cli/GenerateWebTypes";
import fs from "fs";
import os from "os";
import path from "path";

describe("generateWebTypes", () => {
  const fixturesDir = path.join(__dirname, "fixtures");
  const componentsDir = path.join(fixturesDir, "components");
  const outFile = path.join(fixturesDir, "test-web-types.json");
  const tsconfig = path.join(fixturesDir, "tsconfig.json");

  afterEach(() => {
    // Clean up generated file after each test
    if (fs.existsSync(outFile)) {
      fs.unlinkSync(outFile);
    }
  });

  it("generates web-types.json file", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
      libraryName: "test-components",
      libraryVersion: "1.0.0",
    });

    expect(fs.existsSync(outFile)).toBe(true);
  });

  it("generates correct structure", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
      libraryName: "test-components",
      libraryVersion: "1.0.0",
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));

    expect(content).toHaveProperty("$schema");
    expect(content).toHaveProperty("name", "test-components");
    expect(content).toHaveProperty("version", "1.0.0");
    expect(content).toHaveProperty("contributions");
    expect(content.contributions).toHaveProperty("html");
    expect(content.contributions.html).toHaveProperty("elements");
    expect(Array.isArray(content.contributions.html.elements)).toBe(true);
  });

  it("extracts components from exported Props types", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const button = elements.find((el: any) => el.name === "button");
    expect(button).toBeDefined();
    expect(button.description).toContain("Button");
  });

  it("extracts components from arrow functions", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const card = elements.find((el: any) => el.name === "card");
    expect(card).toBeDefined();
  });

  it("extracts components from default exports", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const input = elements.find((el: any) => el.name === "input");
    expect(input).toBeDefined();
  });

  it("converts component names to kebab-case", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    expect(elements.some((el: any) => el.name === "button")).toBe(true);
    expect(elements.some((el: any) => el.name === "card")).toBe(true);
  });

  it("extracts attributes from props", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const button = elements.find((el: any) => el.name === "button");
    expect(button.attributes).toBeDefined();
    expect(Array.isArray(button.attributes)).toBe(true);

    const variant = button.attributes.find(
      (attr: any) => attr.name === "variant",
    );
    expect(variant).toBeDefined();
    expect(variant.required).toBe(false);
  });

  it("handles boolean attributes correctly", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const button = elements.find((el: any) => el.name === "button");
    const disabled = button.attributes.find(
      (attr: any) => attr.name === "disabled",
    );

    expect(disabled).toBeDefined();
    expect(disabled.value.kind).toBe("no-value");
    expect(disabled.value.type).toBe("boolean");
  });

  it("handles union types with enum values", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const button = elements.find((el: any) => el.name === "button");
    const variant = button.attributes.find(
      (attr: any) => attr.name === "variant",
    );

    expect(variant).toBeDefined();
    expect(variant.values).toBeDefined();
    expect(Array.isArray(variant.values)).toBe(true);
    expect(variant.values.length).toBeGreaterThan(0);
    expect(variant.values.some((v: any) => v.name === "primary")).toBe(true);
  });

  it("marks required props correctly", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const card = elements.find((el: any) => el.name === "card");
    const title = card.attributes.find((attr: any) => attr.name === "title");

    expect(title).toBeDefined();
    expect(title.required).toBe(true);
  });

  it("extracts slots from ReactNode props", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const card = elements.find((el: any) => el.name === "card");
    expect(card.slots).toBeDefined();
    expect(Array.isArray(card.slots)).toBe(true);
    expect(card.slots.length).toBeGreaterThan(0);
  });

  it("converts children prop to default slot", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const card = elements.find((el: any) => el.name === "card");
    const defaultSlot = card.slots.find((slot: any) => slot.name === "default");

    expect(defaultSlot).toBeDefined();
  });

  it("extracts named slots from ReactNode props", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const card = elements.find((el: any) => el.name === "card");
    const headerSlot = card.slots.find((slot: any) => slot.name === "header");
    const footerSlot = card.slots.find((slot: any) => slot.name === "footer");

    expect(headerSlot).toBeDefined();
    expect(footerSlot).toBeDefined();
  });

  it("converts attribute names to kebab-case", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const button = elements.find((el: any) => el.name === "button");
    const onClick = button.attributes.find(
      (attr: any) => attr.name === "on-click",
    );

    expect(onClick).toBeDefined();
  });

  it("applies prefix to element names", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
      prefix: "ui-",
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    expect(elements.some((el: any) => el.name === "ui-button")).toBe(true);
    expect(elements.some((el: any) => el.name === "ui-card")).toBe(true);
  });

  it("includes JSDoc descriptions for attributes", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const button = elements.find((el: any) => el.name === "button");
    const variant = button.attributes.find(
      (attr: any) => attr.name === "variant",
    );

    expect(variant.description).toBeDefined();
    expect(variant.description).toContain("variant");
  });

  it("sorts elements alphabetically", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const names = elements.map((el: any) => el.name);
    const sortedNames = [...names].sort();

    expect(names).toEqual(sortedNames);
  });

  it("discovers components in subdirectories", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const accordion = elements.find((el: any) => el.name === "accordion");
    expect(accordion).toBeDefined();
    expect(accordion.description).toContain("Accordion");
  });

  it("handles nested component naming correctly", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const accordionItem = elements.find(
      (el: any) => el.name === "accordion-item",
    );
    expect(accordionItem).toBeDefined();
    expect(accordionItem.attributes).toBeDefined();

    const title = accordionItem.attributes.find(
      (attr: any) => attr.name === "title",
    );
    expect(title).toBeDefined();
    expect(title.required).toBe(true);
  });

  it("includes both flat and nested components", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const names = elements.map((el: any) => el.name);

    // Flat components
    expect(names).toContain("button");
    expect(names).toContain("card");

    // Nested components
    expect(names).toContain("accordion");
    expect(names).toContain("accordion-item");
  });

  it("omits slots property when there are no slots", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    const button = elements.find((el: any) => el.name === "button");
    expect(button.slots).toBeUndefined();
  });

  it("accepts multiple components directories", () => {
    const accordionDir = path.join(componentsDir, "accordion");
    generateWebTypes({
      componentsDir: [componentsDir, accordionDir],
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const names = content.contributions.html.elements.map((el: any) => el.name);

    // Accordion components show up exactly once even though both dirs cover them
    expect(names.filter((n: string) => n === "accordion-item")).toHaveLength(1);
    expect(names).toContain("button");
  });

  it("excludes files matching glob patterns", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
      exclude: ["**/Button.tsx"],
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const names = content.contributions.html.elements.map((el: any) => el.name);

    expect(names).not.toContain("button");
    expect(names).toContain("card");
  });

  it("emits expression-kind attributes for primitive and function unions", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const mixed = elements.find((el: any) => el.name === "mixed-types");

    expect(mixed).toBeDefined();
    const count = mixed.attributes.find((a: any) => a.name === "count");
    expect(count.value.kind).toBe("expression");

    const onSelect = mixed.attributes.find((a: any) => a.name === "on-select");
    expect(onSelect.value.kind).toBe("expression");
  });

  it("does not turn function-valued ReactNode props into slots", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const mixed = elements.find((el: any) => el.name === "mixed-types");

    expect(mixed.slots).toBeUndefined();
    // It does still surface as an attribute (under the `expression` kind),
    // not silently dropped.
    expect(mixed.attributes.some((a: any) => a.name === "render-item")).toBe(
      true,
    );
  });

  it("leaves the description undefined for props without JSDoc", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;

    // Badge's `color` prop has no JSDoc.
    const badge = elements.find((el: any) => el.name === "badge");
    expect(badge).toBeDefined();
    const color = badge.attributes.find((a: any) => a.name === "color");
    expect(color).toBeDefined();
    expect(color.description).toBeUndefined();
  });

  it("extracts props from forwardRef-wrapped components", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const fwd = elements.find((el: any) => el.name === "forward-ref-button");

    expect(fwd).toBeDefined();
    const tone = fwd.attributes.find((a: any) => a.name === "tone");
    expect(tone).toBeDefined();
    expect(Array.isArray(tone.values)).toBe(true);
    expect(tone.values.some((v: any) => v.name === "danger")).toBe(true);
  });

  it("extracts props from function-expression components", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const widget = elements.find(
      (el: any) => el.name === "function-expression-widget",
    );

    expect(widget).toBeDefined();
    const heading = widget.attributes.find((a: any) => a.name === "heading");
    expect(heading).toBeDefined();
    expect(heading.required).toBe(true);
  });

  it("throws when a configured components directory is missing", () => {
    expect(() =>
      generateWebTypes({
        componentsDir: path.join(fixturesDir, "does-not-exist"),
        outFile,
        tsconfig,
      }),
    ).toThrow(/Components directory does not exist/);
  });

  it("warns when no component files match the configured directory", () => {
    const emptyDir = path.join(fixturesDir, "empty-components");
    fs.mkdirSync(emptyDir, { recursive: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      generateWebTypes({
        componentsDir: emptyDir,
        outFile,
        tsconfig,
      });
      expect(warn).toHaveBeenCalled();
      const message = warn.mock.calls[0]?.[0];
      expect(String(message)).toContain("no component files found");
    } finally {
      warn.mockRestore();
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("resolves a default export declared as `export default <Identifier>`", () => {
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const def = elements.find(
      (el: any) => el.name === "default-export-identifier",
    );

    expect(def).toBeDefined();
    const title = def.attributes.find((a: any) => a.name === "title");
    expect(title).toBeDefined();
    expect(title.required).toBe(true);
  });

  it("resolves a `export default <NamedImport>` across files", () => {
    // CrossFileNamedDefault.tsx imports { ImportedComponent } from
    // ./ImportedComponent and re-exports it as default. Exercises the
    // named-import branches of resolveIdentifierToProps and
    // resolveImportedComponent.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const cross = elements.find(
      (el: any) => el.name === "cross-file-named-default",
    );

    expect(cross).toBeDefined();
    const heading = cross.attributes.find((a: any) => a.name === "heading");
    expect(heading).toBeDefined();
    expect(heading.required).toBe(true);
  });

  it("resolves a `export default <DefaultImport>` across files", () => {
    // CrossFileDefaultDefault.tsx imports the default export of
    // ./ImportedComponent and re-exports it. Exercises the default-import
    // branch of resolveIdentifierToProps and resolveImportedComponent.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const cross = elements.find(
      (el: any) => el.name === "cross-file-default-default",
    );

    expect(cross).toBeDefined();
    const caption = cross.attributes.find((a: any) => a.name === "caption");
    expect(caption).toBeDefined();
    expect(caption.required).toBe(true);
  });

  it("emits an element with no attributes for components that take no props", () => {
    // NoPropsComponent.tsx has zero parameters, so extractPropsFromFunction
    // returns a propsType of null and extractAttributesAndSlots
    // short-circuits.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const noProps = elements.find(
      (el: any) => el.name === "no-props-component",
    );

    expect(noProps).toBeDefined();
    expect(noProps.attributes).toEqual([]);
    expect(noProps.slots).toBeUndefined();
  });

  it("resolves an aliased named import re-exported as default", () => {
    // AliasedNamedImport.tsx does `import { ImportedComponent as Aliased }`
    // and `export default Aliased`, exercising the alias branch of
    // resolveIdentifierToProps (`namedImport.getAliasNode()`).
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const aliased = elements.find(
      (el: any) => el.name === "aliased-named-import",
    );

    expect(aliased).toBeDefined();
    const heading = aliased.attributes.find((a: any) => a.name === "heading");
    expect(heading).toBeDefined();
    expect(heading.required).toBe(true);
  });

  it("extracts props from memo-wrapped function expressions", () => {
    // MemoFunctionExpression.tsx wraps a `function (props) { … }` in
    // `memo(…)`, exercising the FunctionExpression-in-CallExpression-argument
    // branch of extractPropsFromDeclaration.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const memo = elements.find(
      (el: any) => el.name === "memo-function-expression",
    );

    expect(memo).toBeDefined();
    const label = memo.attributes.find((a: any) => a.name === "label");
    expect(label).toBeDefined();
    expect(label.required).toBe(true);
  });

  it("does not crash on imports that cannot be resolved", () => {
    // ExternalImport.tsx points at a non-existent package. The catch-all in
    // resolveImportedComponent must swallow the failure and the generator
    // must still emit a result for the rest of the components.
    expect(() =>
      generateWebTypes({
        componentsDir,
        outFile,
        tsconfig,
      }),
    ).not.toThrow();

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const names = content.contributions.html.elements.map(
      (el: { name: string }) => el.name,
    );

    // Unresolved external imports produce no element, but the rest of the
    // run is unaffected.
    expect(names).not.toContain("external-import");
    expect(names).toContain("button");
  });

  it("skips render-prop `children` instead of treating it as a slot", () => {
    // RenderPropChildren.tsx types `children` as `(value: number) => string`,
    // which is not a slot. Exercises the `propName === \"children\"`
    // early-return that runs after isSlotType has rejected the function.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const renderProp = elements.find(
      (el: any) => el.name === "render-prop-children",
    );

    expect(renderProp).toBeDefined();
    // No slot was emitted for the function-typed children.
    expect(renderProp.slots).toBeUndefined();
    // children is not surfaced as an attribute either.
    expect(renderProp.attributes.some((a: any) => a.name === "children")).toBe(
      false,
    );
    // Other props are still emitted.
    expect(renderProp.attributes.some((a: any) => a.name === "label")).toBe(
      true,
    );
  });

  it("falls back to splitting on `|` for types ts-morph does not classify as unions", () => {
    // UnclassifiedUnion.tsx exposes `Promise<\"a\" | \"b\">`. The outer type
    // is not classified by ts-morph as a union, but its printed text
    // contains `|`, so collectUnionMemberTexts has to fall back to
    // `text.split(\"|\")`.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const fallback = elements.find(
      (el: any) => el.name === "unclassified-union",
    );

    expect(fallback).toBeDefined();
    const pending = fallback.attributes.find((a: any) => a.name === "pending");
    expect(pending).toBeDefined();
    // The prop is required (otherwise the outer type would be classified
    // as `Promise<…> | undefined`, taking the normal isUnion() path).
    expect(pending.required).toBe(true);
    expect(pending.value).toBeDefined();
    expect(typeof pending.value.type).toBe("string");
    expect(pending.value.type).toContain("|");
  });

  it("extracts props from `export default (props) => …`", () => {
    // ExportArrowDefault.tsx — exercises the ExportAssignment-with-
    // ArrowFunction branch of extractPropsFromDeclaration.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const arrow = elements.find(
      (el: any) => el.name === "export-arrow-default",
    );

    expect(arrow).toBeDefined();
    const heading = arrow.attributes.find((a: any) => a.name === "heading");
    expect(heading).toBeDefined();
    expect(heading.required).toBe(true);
  });

  it("extracts props from anonymous `export default function (props) { … }`", () => {
    // ExportFunctionExprDefault.tsx — TS parses an anonymous default-export
    // function as a FunctionDeclaration, so this exercises the file-name-
    // based naming path of extractFromComponentFunctions for unnamed default
    // exports.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const fn = elements.find(
      (el: any) => el.name === "export-function-expr-default",
    );

    expect(fn).toBeDefined();
    const caption = fn.attributes.find((a: any) => a.name === "caption");
    expect(caption).toBeDefined();
    expect(caption.required).toBe(true);
  });

  it("emits an empty-attribute element for zero-param arrow components", () => {
    // NoParamsArrow.tsx — exercises the empty-params branch of
    // extractPropsFromArrowFunction (`params.length === 0`).
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const noParams = elements.find((el: any) => el.name === "no-params-arrow");

    expect(noParams).toBeDefined();
    expect(noParams.attributes).toEqual([]);
    expect(noParams.slots).toBeUndefined();
  });

  it("emits an empty-attribute element for zero-param function expressions", () => {
    // NoParamsFunctionExpr.tsx — exercises the empty-params branch of
    // extractPropsFromFunctionExpression.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const noParams = elements.find(
      (el: any) => el.name === "no-params-function-expr",
    );

    expect(noParams).toBeDefined();
    expect(noParams.attributes).toEqual([]);
    expect(noParams.slots).toBeUndefined();
  });

  it("extracts props through a `const X = <Identifier>` re-export", () => {
    // ReExportedIdentifier.tsx exposes `const ReExportedIdentifier =
    // ImportedComponent`, exercising the Identifier-initializer branch of
    // extractPropsFromDeclaration (which inspects call signatures).
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const elements = content.contributions.html.elements;
    const reExp = elements.find(
      (el: any) => el.name === "re-exported-identifier",
    );

    expect(reExp).toBeDefined();
    const heading = reExp.attributes.find((a: any) => a.name === "heading");
    expect(heading).toBeDefined();
    expect(heading.required).toBe(true);
  });

  it("rejects a single-group prefix that does not end with '-'", () => {
    // Exercises the legacy single-group prefix validation in
    // normaliseGroups (the multi-group equivalent is already covered by
    // GenerateWebTypesGroups.test.ts).
    expect(() =>
      generateWebTypes({
        componentsDir,
        outFile,
        tsconfig,
        prefix: "ui_",
      }),
    ).toThrow(/prefix must be empty or end with "-"/);
  });

  it("escapes regex metacharacters in exclude glob patterns", () => {
    // The Card fixture lives at components/Card.tsx. The pattern below
    // contains a `+` and parentheses — both regex metacharacters that
    // globToRegExp must escape, otherwise the regex either fails to compile
    // or matches the wrong file.
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
      // Should NOT match anything (no `Card+x` or paren-named files exist),
      // so card.tsx must still be picked up.
      exclude: ["**/Card+x.tsx", "**/(weird).tsx"],
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const names = content.contributions.html.elements.map(
      (el: { name: string }) => el.name,
    );

    expect(names).toContain("card");
  });

  it("supports single-`*` and `?` glob characters in exclude patterns", () => {
    // Single `*` -> [^/]* in the regex (lines 135-136 of GenerateWebTypes.ts);
    // `?`        -> [^/]   (lines 139-140).
    generateWebTypes({
      componentsDir,
      outFile,
      tsconfig,
      // `Butto?.tsx` matches Button.tsx but not Buttonn.tsx; `*Card.tsx`
      // matches the Card.tsx file under any sibling directory.
      exclude: ["**/Butto?.tsx", "**/*Card.tsx"],
    });

    const content = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const names = content.contributions.html.elements.map((el: any) => el.name);

    expect(names).not.toContain("button");
    expect(names).not.toContain("card");
    // Other components must still be picked up.
    expect(names).toContain("badge");
  });

  describe("symlink handling", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reactolith-symlinks-"));
    });

    afterEach(() => {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("terminates instead of looping when a symlink points at an ancestor", () => {
      const subDir = path.join(tmpDir, "sub");
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(subDir, "Widget.tsx"),
        `export type WidgetProps = { label: string };\n` +
          `export const Widget = (_p: WidgetProps) => null;\n`,
      );
      // sub/loop -> ../  (back to tmpDir, an ancestor)
      fs.symlinkSync("..", path.join(subDir, "loop"));

      const tmpOut = path.join(tmpDir, "web-types.json");

      expect(() =>
        generateWebTypes({
          componentsDir: tmpDir,
          outFile: tmpOut,
          tsconfig,
        }),
      ).not.toThrow();

      const content = JSON.parse(fs.readFileSync(tmpOut, "utf-8"));
      const widgets = content.contributions.html.elements.filter(
        (el: { name: string }) => el.name === "widget",
      );
      // Widget is reachable through the cycle multiple times but must only
      // appear once in the output.
      expect(widgets).toHaveLength(1);
    });

    it("follows symlinks to directories outside the configured tree", () => {
      const externalDir = path.join(tmpDir, "external");
      fs.mkdirSync(externalDir);
      fs.writeFileSync(
        path.join(externalDir, "External.tsx"),
        `export type ExternalProps = { id: string };\n` +
          `export const External = (_p: ExternalProps) => null;\n`,
      );

      const componentsRoot = path.join(tmpDir, "components");
      fs.mkdirSync(componentsRoot);
      fs.symlinkSync(externalDir, path.join(componentsRoot, "linked"));

      const tmpOut = path.join(tmpDir, "web-types.json");

      generateWebTypes({
        componentsDir: componentsRoot,
        outFile: tmpOut,
        tsconfig,
      });

      const content = JSON.parse(fs.readFileSync(tmpOut, "utf-8"));
      const names = content.contributions.html.elements.map(
        (el: { name: string }) => el.name,
      );
      expect(names).toContain("external");
    });

    it("follows symlinks pointing directly at component files", () => {
      const realDir = path.join(tmpDir, "real");
      fs.mkdirSync(realDir);
      const realFile = path.join(realDir, "Linked.tsx");
      fs.writeFileSync(
        realFile,
        `export type LinkedProps = { value: number };\n` +
          `export const Linked = (_p: LinkedProps) => null;\n`,
      );

      const componentsRoot = path.join(tmpDir, "components");
      fs.mkdirSync(componentsRoot);
      fs.symlinkSync(realFile, path.join(componentsRoot, "Linked.tsx"));

      const tmpOut = path.join(tmpDir, "web-types.json");

      generateWebTypes({
        componentsDir: componentsRoot,
        outFile: tmpOut,
        tsconfig,
      });

      const content = JSON.parse(fs.readFileSync(tmpOut, "utf-8"));
      const names = content.contributions.html.elements.map(
        (el: { name: string }) => el.name,
      );
      expect(names).toContain("linked");
    });
  });
});
