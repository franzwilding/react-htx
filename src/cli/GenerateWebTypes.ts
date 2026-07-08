import {
  Project,
  Node,
  FunctionDeclaration,
  VariableDeclaration,
  ArrowFunction,
  FunctionExpression,
  Type,
  Symbol as TsSymbol,
  SourceFile,
  Identifier,
  ImportDeclaration,
  JSDocableNode,
} from "ts-morph";
import fs from "fs";
import path from "path";
import { pascalToKebab } from "../util/casing";

/**
 * One output file: scans the given folders, applies the prefix, and writes a
 * single web-types JSON file. Each project can have many of these (the
 * package.json `web-types` field accepts an array of paths).
 */
export interface WebTypesGroup {
  /**
   * One or more directories scanned recursively for component files.
   * Accepts a single path or an array of paths.
   */
  from: string | string[];
  /** Output JSON path. */
  out: string;
  /** Element name prefix. Must be empty or end with `-`. */
  prefix?: string;
  /** Library name written into the JSON (overrides the top-level default). */
  name?: string;
  /** Library version written into the JSON (overrides the top-level default). */
  version?: string;
  /**
   * Glob-like patterns of component files to skip. Merged with the top-level
   * `exclude` patterns.
   */
  exclude?: string[];
}

export interface MultiGroupOptions {
  groups: WebTypesGroup[];
  tsconfig?: string;
  /** Default library name used by groups that don't set their own. */
  name?: string;
  /** Default library version used by groups that don't set their own. */
  version?: string;
  /** Patterns applied to every group. */
  exclude?: string[];
}

/**
 * Legacy single-group options. Equivalent to a `groups: [{ … }]` config.
 */
export interface SingleGroupOptions {
  componentsDir?: string | string[];
  outFile?: string;
  tsconfig?: string;
  libraryName?: string;
  libraryVersion?: string;
  prefix?: string;
  exclude?: string[];
}

export type GenerateWebTypesOptions = SingleGroupOptions | MultiGroupOptions;

export interface GenerateGroupResult {
  out: string;
  elementCount: number;
  prefix: string;
}

export interface GenerateResult {
  outputs: GenerateGroupResult[];
}

interface ComponentInfo {
  name: string;
  propsType: Type | null;
  propsNode: Node | null;
  sourceFile: SourceFile;
}

interface WebTypeAttribute {
  name: string;
  description?: string;
  required: boolean;
  value?: {
    kind: "no-value" | "plain" | "expression";
    type: string;
  };
  values?: Array<{ name: string }>;
}

interface WebTypeSlot {
  name: string;
  description: string;
}

interface WebTypeElement {
  name: string;
  description: string;
  attributes: WebTypeAttribute[];
  slots?: WebTypeSlot[];
}

function findComponentFiles(dir: string, seen?: Set<string>): string[] {
  const visited = seen ?? new Set<string>();
  let real: string;
  try {
    real = fs.realpathSync(dir);
  } catch {
    return [];
  }
  if (visited.has(real)) return [];
  visited.add(real);

  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      let target: string;
      try {
        target = fs.realpathSync(fullPath);
      } catch {
        continue;
      }
      if (visited.has(target)) continue;
      let stat: fs.Stats;
      try {
        stat = fs.statSync(target);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        results.push(...findComponentFiles(fullPath, visited));
      } else if (
        stat.isFile() &&
        (target.endsWith(".tsx") || target.endsWith(".ts"))
      ) {
        results.push(fullPath);
      }
    } else if (entry.isDirectory()) {
      results.push(...findComponentFiles(fullPath, visited));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Convert a glob-like pattern to a RegExp matched against absolute paths. */
function globToRegExp(pattern: string): RegExp {
  let re = "";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i += 2;
        if (pattern[i] === "/") i++;
      } else {
        re += "[^/]*";
        i++;
      }
    } else if (c === "?") {
      re += "[^/]";
      i++;
    } else if (/[.+^$(){}|[\]\\]/.test(c)) {
      re += "\\" + c;
      i++;
    } else if (c === "/") {
      re += "/";
      i++;
    } else {
      re += c;
      i++;
    }
  }
  return new RegExp(`(?:^|/)${re}$`);
}

function isMultiGroup(
  options: GenerateWebTypesOptions,
): options is MultiGroupOptions {
  return Array.isArray((options as MultiGroupOptions).groups);
}

function normaliseGroups(options: GenerateWebTypesOptions): {
  groups: WebTypesGroup[];
  tsconfig: string;
  defaultName: string;
  defaultVersion: string;
  sharedExclude: string[];
} {
  if (isMultiGroup(options)) {
    if (options.groups.length === 0) {
      throw new Error(
        "generateWebTypes: `groups` must contain at least one entry.",
      );
    }
    const seen = new Set<string>();
    for (const g of options.groups) {
      const out = path.resolve(g.out);
      if (seen.has(out)) {
        throw new Error(
          `generateWebTypes: duplicate output path across groups: ${g.out}`,
        );
      }
      seen.add(out);
      if (g.prefix && !g.prefix.endsWith("-")) {
        throw new Error(
          `generateWebTypes: prefix must be empty or end with "-". Got "${g.prefix}".`,
        );
      }
    }
    return {
      groups: options.groups,
      tsconfig: options.tsconfig || "./tsconfig.json",
      defaultName: options.name || "reactolith-components",
      defaultVersion: options.version || "1.0.0",
      sharedExclude: options.exclude || [],
    };
  }

  const single = options;
  if (single.prefix && !single.prefix.endsWith("-")) {
    throw new Error(
      `generateWebTypes: prefix must be empty or end with "-". Got "${single.prefix}".`,
    );
  }
  return {
    groups: [
      {
        from: single.componentsDir ?? "components/ui",
        out: single.outFile ?? "web-types.json",
        prefix: single.prefix ?? "",
        name: single.libraryName,
        version: single.libraryVersion,
      },
    ],
    tsconfig: single.tsconfig || "./tsconfig.json",
    defaultName: single.libraryName || "reactolith-components",
    defaultVersion: single.libraryVersion || "1.0.0",
    sharedExclude: single.exclude || [],
  };
}

export function generateWebTypes(
  options: GenerateWebTypesOptions,
): GenerateResult {
  const { groups, tsconfig, defaultName, defaultVersion, sharedExclude } =
    normaliseGroups(options);

  const project = new Project({ tsConfigFilePath: tsconfig });

  const outputs: GenerateGroupResult[] = [];

  for (const group of groups) {
    const dirs = (Array.isArray(group.from) ? group.from : [group.from]).map(
      (d) => path.resolve(d),
    );
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Components directory does not exist: ${dir}`);
      }
    }

    const excludePatterns = [...sharedExclude, ...(group.exclude || [])].map(
      globToRegExp,
    );

    const seen = new Set<string>();
    const files: string[] = [];
    for (const dir of dirs) {
      for (const file of findComponentFiles(dir)) {
        if (seen.has(file)) continue;
        const normalised = file.replace(/\\/g, "/");
        if (excludePatterns.some((re) => re.test(normalised))) continue;
        seen.add(file);
        files.push(file);
      }
    }

    if (files.length === 0) {
      console.warn(
        `generate-web-types: no component files found in ${dirs.join(", ")}` +
          (excludePatterns.length
            ? ` after applying ${excludePatterns.length} exclude pattern(s)`
            : ""),
      );
    }

    const prefix = group.prefix ?? "";
    const elements: WebTypeElement[] = [];

    for (const filePath of files) {
      const sourceFile =
        project.getSourceFile(filePath) ||
        project.addSourceFileAtPath(filePath);
      if (!sourceFile) continue;

      const propsFromTypes = extractFromExportedPropsTypes(sourceFile);
      const propsFromComponents = extractFromComponentFunctions(sourceFile);

      const componentMap = new Map<string, ComponentInfo>();
      propsFromComponents.forEach((info) => {
        componentMap.set(info.name, info);
      });
      propsFromTypes.forEach((info) => {
        componentMap.set(info.name, info);
      });

      componentMap.forEach((info) => {
        const { attributes, slots } = extractAttributesAndSlots(
          info.propsType,
          info.propsNode || info.sourceFile,
        );
        const tagName = prefix + pascalToKebab(info.name);

        const element: WebTypeElement = {
          name: tagName,
          description: `${info.name} component`,
          attributes,
        };
        if (slots.length > 0) {
          element.slots = slots;
        }
        elements.push(element);
      });
    }

    elements.sort((a, b) => a.name.localeCompare(b.name));

    const webTypes = {
      $schema:
        "https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json",
      name: group.name || defaultName,
      version: group.version || defaultVersion,
      "js-types-syntax": "typescript",
      "description-markup": "markdown",
      contributions: {
        html: {
          elements,
        },
      },
    };

    const outDir = path.dirname(path.resolve(group.out));
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(group.out, JSON.stringify(webTypes, null, 2));

    outputs.push({
      out: group.out,
      elementCount: elements.length,
      prefix,
    });
  }

  return { outputs };
}

/**
 * Strategy 1: Extract from exported types ending with "Props"
 */
function extractFromExportedPropsTypes(
  sourceFile: SourceFile,
): ComponentInfo[] {
  const results: ComponentInfo[] = [];
  const exported = sourceFile.getExportedDeclarations();

  for (const [name, decls] of exported) {
    if (!name.endsWith("Props")) continue;

    const decl = decls[0];
    if (!decl) continue;

    const type = getTypeOfDeclaration(decl);
    if (!type) continue;

    const componentName = name.substring(0, name.length - 5);
    results.push({
      name: componentName,
      propsType: type,
      propsNode: decl,
      sourceFile,
    });
  }

  return results;
}

/**
 * Strategy 2: Extract props from exported React component functions
 */
function extractFromComponentFunctions(
  sourceFile: SourceFile,
): ComponentInfo[] {
  const results: ComponentInfo[] = [];
  const exported = sourceFile.getExportedDeclarations();

  for (const [name, decls] of exported) {
    if (name.endsWith("Props")) continue;
    if (!/^[A-Z]/.test(name)) continue;

    const decl = decls[0];
    if (!decl) continue;

    const propsInfo = extractPropsFromDeclaration(decl);
    if (propsInfo) {
      results.push({
        name,
        propsType: propsInfo.type,
        propsNode: propsInfo.node,
        sourceFile,
      });
    }
  }

  const defaultExport = sourceFile.getDefaultExportSymbol();
  if (defaultExport) {
    const decls = defaultExport.getDeclarations();
    for (const decl of decls) {
      let propsInfo = extractPropsFromDeclaration(decl);

      if (!propsInfo && Node.isExportAssignment(decl)) {
        const expr = decl.getExpression();
        if (Node.isIdentifier(expr)) {
          propsInfo = resolveIdentifierToProps(expr, sourceFile);
        }
      }

      if (propsInfo) {
        const fileName = path.basename(
          sourceFile.getFilePath(),
          path.extname(sourceFile.getFilePath()),
        );
        // Not the shared kebabToPascal: file names may start with non-ASCII
        // letters or contain consecutive hyphens, which the \w-based regex
        // handles differently. Keep the split-based, Unicode-tolerant form.
        const componentName = fileName
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("");
        results.push({
          name: componentName,
          propsType: propsInfo.type,
          propsNode: propsInfo.node,
          sourceFile,
        });
      }
    }
  }

  return results;
}

function resolveIdentifierToProps(
  identifier: Identifier,
  sourceFile: SourceFile,
): { type: Type | null; node: Node } | null {
  const identifierName = identifier.getText();

  const localVar = sourceFile.getVariableDeclaration(identifierName);
  if (localVar) {
    return extractPropsFromDeclaration(localVar);
  }

  const localFunc = sourceFile.getFunction(identifierName);
  if (localFunc) {
    return extractPropsFromDeclaration(localFunc);
  }

  const fromCallable = propsFromCallableType(identifier.getType(), identifier);
  if (fromCallable) return fromCallable;

  const importDecls = sourceFile.getImportDeclarations();
  for (const importDecl of importDecls) {
    const namedImports = importDecl.getNamedImports();
    for (const namedImport of namedImports) {
      const importedName =
        namedImport.getAliasNode()?.getText() || namedImport.getName();
      if (importedName === identifierName) {
        return resolveImportedComponent(importDecl, namedImport.getName());
      }
    }

    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport && defaultImport.getText() === identifierName) {
      return resolveImportedComponent(importDecl, "default");
    }
  }

  return null;
}

function resolveImportedComponent(
  importDecl: ImportDeclaration,
  exportName: string,
): { type: Type | null; node: Node } | null {
  try {
    const resolvedModule = importDecl.getModuleSpecifierSourceFile();
    if (!resolvedModule) return null;

    const exported = resolvedModule.getExportedDeclarations();

    if (exportName === "default") {
      const defaultExport = resolvedModule.getDefaultExportSymbol();
      if (defaultExport) {
        const decls = defaultExport.getDeclarations();
        for (const decl of decls) {
          const propsInfo = extractPropsFromDeclaration(decl);
          if (propsInfo) return propsInfo;
        }
      }
    } else {
      const decls = exported.get(exportName);
      if (decls && decls.length > 0) {
        for (const decl of decls) {
          const propsInfo = extractPropsFromDeclaration(decl);
          if (propsInfo) return propsInfo;
        }
      }
    }
  } catch {
    // External module: ignore.
  }

  return null;
}

function getTypeOfDeclaration(decl: Node): Type | null {
  if ("getType" in decl && typeof decl.getType === "function") {
    return (decl as { getType: () => Type }).getType();
  }
  return null;
}

function extractPropsFromDeclaration(
  decl: Node,
): { type: Type | null; node: Node } | null {
  if (Node.isFunctionDeclaration(decl)) {
    return extractPropsFromFunctionLike(decl);
  }

  if (Node.isVariableDeclaration(decl)) {
    const varDecl = decl as VariableDeclaration;
    const initializer = varDecl.getInitializer();

    if (
      initializer &&
      (Node.isArrowFunction(initializer) ||
        Node.isFunctionExpression(initializer))
    ) {
      return extractPropsFromFunctionLike(initializer);
    }

    if (initializer && Node.isCallExpression(initializer)) {
      for (const arg of initializer.getArguments()) {
        if (Node.isArrowFunction(arg) || Node.isFunctionExpression(arg)) {
          return extractPropsFromFunctionLike(arg);
        }
      }
    }

    if (
      initializer &&
      (Node.isPropertyAccessExpression(initializer) ||
        Node.isIdentifier(initializer))
    ) {
      const fromCallable = propsFromCallableType(varDecl.getType(), varDecl);
      // Only accept declarations that actually take a props parameter here;
      // zero-param values are too ambiguous when reached via an alias.
      if (fromCallable?.type) return fromCallable;
    }
  }

  if (Node.isExportAssignment(decl)) {
    const expr = decl.getExpression();
    if (Node.isArrowFunction(expr) || Node.isFunctionExpression(expr)) {
      return extractPropsFromFunctionLike(expr);
    }
  }

  return null;
}

function extractPropsFromFunctionLike(
  func: FunctionDeclaration | ArrowFunction | FunctionExpression,
): { type: Type | null; node: Node } | null {
  const returnType = func.getReturnType();
  if (!isJsxReturnType(returnType)) return null;

  const params = func.getParameters();
  if (params.length === 0) return { type: null, node: func };

  const firstParam = params[0];
  return { type: firstParam.getType(), node: firstParam };
}

/**
 * Derive props from a value whose *type* is callable and returns JSX —
 * covers `React.forwardRef(...)`-style values and re-exported identifiers
 * whose declaration is not itself a function node.
 */
function propsFromCallableType(
  type: Type,
  location: Node,
): { type: Type | null; node: Node } | null {
  const sig = type.getCallSignatures()[0];
  if (!sig || !isJsxReturnType(sig.getReturnType())) return null;

  const params = sig.getParameters();
  if (params.length === 0) return { type: null, node: location };
  return { type: params[0].getTypeAtLocation(location), node: location };
}

function isJsxReturnType(type: Type): boolean {
  const text = type.getText();
  return (
    text.includes("Element") ||
    text.includes("ReactNode") ||
    text.includes("ReactElement") ||
    text.includes("JSX") ||
    text === "null" ||
    text.includes("| null")
  );
}

function isSlotType(typeText: string): boolean {
  const slotPatterns = ["ReactNode", "ReactElement", "JSX.Element"];
  const isSlot = slotPatterns.some((pattern) => typeText.includes(pattern));
  const isFunction =
    typeText.includes("=>") ||
    typeText.includes("EventHandler") ||
    typeText.includes("Handler<");
  return isSlot && !isFunction;
}

function extractAttributesAndSlots(
  type: Type | null,
  contextNode: Node,
): { attributes: WebTypeAttribute[]; slots: WebTypeSlot[] } {
  const attributes: WebTypeAttribute[] = [];
  const slots: WebTypeSlot[] = [];

  if (!type) return { attributes, slots };

  type.getProperties().forEach((prop: TsSymbol) => {
    const propName = prop.getName();
    if (["key", "ref"].includes(propName)) return;

    const propType = prop.getTypeAtLocation(contextNode);
    const typeText = cleanTypeText(propType.getText());
    const description = getPropertyDescription(prop);
    const required = !prop.isOptional();

    if (isSlotType(typeText)) {
      const slotName = propName === "children" ? "default" : propName;
      slots.push({
        name: slotName,
        description: description || `Content for the ${slotName} slot`,
      });
      return;
    }

    if (propName === "children") return;

    const attr: WebTypeAttribute = {
      name: pascalToKebab(propName),
      description: description || undefined,
      required,
    };

    // Resolve the structural union (handles type aliases like
    // `type ButtonVariant = "default" | "destructive" | …` which `getText()`
    // would otherwise leave as just `"ButtonVariant"`).
    const unionMembers = collectUnionMemberTexts(propType);

    if (typeText === "boolean" || typeText === "boolean | undefined") {
      attr.value = { kind: "no-value", type: "boolean" };
    } else if (unionMembers !== null) {
      const values = unionMembers.filter(
        (v) => v !== "undefined" && v !== "null",
      );

      const primitiveTypes = [
        "boolean",
        "string",
        "number",
        "object",
        "any",
        "unknown",
        "never",
      ];
      const stringLiteralValues = values.filter((v) => /^["'].*["']$/.test(v));

      const hasOnlyStringLiterals =
        stringLiteralValues.length === values.length && values.length > 0;
      const hasOnlyPrimitives = values.every((v) => primitiveTypes.includes(v));

      const displayType = values.join(" | ") || typeText;

      if (hasOnlyStringLiterals) {
        attr.value = { kind: "plain", type: displayType };
        attr.values = stringLiteralValues
          .map((v) => v.replace(/['"]/g, ""))
          .map((v) => ({ name: v }));
      } else if (hasOnlyPrimitives || values.some((v) => v.includes("=>"))) {
        attr.value = { kind: "expression", type: displayType };
      } else {
        attr.value = { kind: "plain", type: displayType };
      }
    } else {
      attr.value = { kind: "plain", type: typeText };
    }

    attributes.push(attr);
  });

  return { attributes, slots };
}

/**
 * Return the printed form of each member of a (possibly aliased) union type,
 * or `null` if the type is not a union. Falls back to splitting the printed
 * text on `|` so we still recognise unions that ts-morph doesn't classify as
 * `isUnion()` (e.g. `string | number` literal-typed unions in some configs).
 */
function collectUnionMemberTexts(propType: Type): string[] | null {
  if (propType.isUnion()) {
    return propType.getUnionTypes().map((t) => cleanTypeText(t.getText()));
  }
  const text = cleanTypeText(propType.getText());
  if (text.includes("|")) {
    return text.split("|").map((v) => v.trim());
  }
  return null;
}

function cleanTypeText(text: string): string {
  return text
    .replace(/import\([^)]+\)\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPropertyDescription(prop: TsSymbol): string | undefined {
  const declarations = prop.getDeclarations();
  for (const decl of declarations) {
    if (isJsDocableNode(decl)) {
      const jsDocs = decl.getJsDocs();
      if (jsDocs.length > 0) {
        return jsDocs[0].getDescription().trim();
      }
    }
  }
  return undefined;
}

function isJsDocableNode(node: Node): node is Node & JSDocableNode {
  return (
    "getJsDocs" in node &&
    typeof (node as { getJsDocs?: unknown }).getJsDocs === "function"
  );
}
