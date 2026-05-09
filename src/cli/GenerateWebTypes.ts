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

export interface GenerateWebTypesOptions {
  /**
   * One or more directories scanned recursively for component files.
   * Accepts a single path or an array of paths. Defaults to `components/ui`.
   */
  componentsDir?: string | string[];
  outFile?: string;
  tsconfig?: string;
  libraryName?: string;
  libraryVersion?: string;
  prefix?: string;
  /**
   * Glob-like patterns of component files to skip (e.g. `**\/*.stories.tsx`).
   * Patterns are matched against the file's absolute path; `*` is greedy
   * within a single segment, `**` crosses path separators.
   */
  exclude?: string[];
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

function findComponentFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findComponentFiles(fullPath));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Convert a glob-like pattern to a RegExp matched against absolute paths. */
function globToRegExp(pattern: string): RegExp {
  // Normalise path separators, escape regex specials except * and ?,
  // then translate ** -> .*, * -> [^/]*, ? -> [^/].
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

export function generateWebTypes(options: GenerateWebTypesOptions): void {
  const project = new Project({
    tsConfigFilePath: options.tsconfig || "./tsconfig.json",
  });

  const dirs = (
    Array.isArray(options.componentsDir)
      ? options.componentsDir
      : [options.componentsDir || "components/ui"]
  ).map((d) => path.resolve(d));

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Components directory does not exist: ${dir}`);
    }
  }

  const excludePatterns = (options.exclude || []).map(globToRegExp);
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

  const elements: WebTypeElement[] = [];
  const prefix = options.prefix || "";

  files.forEach((filePath: string) => {
    const sourceFile = project.addSourceFileAtPath(filePath);
    if (!sourceFile) return;

    // Strategy 1: Look for exported *Props types (existing behavior)
    const propsFromTypes = extractFromExportedPropsTypes(sourceFile);

    // Strategy 2: Look for exported React components and extract their props
    const propsFromComponents = extractFromComponentFunctions(sourceFile);

    // Merge results, preferring explicit Props types
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
      const tagName =
        prefix + info.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

      const element: WebTypeElement = {
        name: tagName,
        description: `${info.name} component`,
        attributes,
      };

      // Only add slots if there are any
      if (slots.length > 0) {
        element.slots = slots;
      }

      elements.push(element);
    });
  });

  elements.sort((a, b) => a.name.localeCompare(b.name));

  const webTypes = {
    $schema:
      "https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json",
    name: options.libraryName || "reactolith-components",
    version: options.libraryVersion || "1.0.0",
    "js-types-syntax": "typescript",
    "description-markup": "markdown",
    contributions: {
      html: {
        elements,
      },
    },
  };
  const outFile = options.outFile || "web-types.json";
  fs.writeFileSync(outFile, JSON.stringify(webTypes, null, 2));
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
    // Skip Props types (handled by Strategy 1)
    if (name.endsWith("Props")) continue;

    // Skip non-PascalCase names (not React components)
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

  // Also check for default export
  const defaultExport = sourceFile.getDefaultExportSymbol();
  if (defaultExport) {
    const decls = defaultExport.getDeclarations();
    for (const decl of decls) {
      let propsInfo = extractPropsFromDeclaration(decl);

      // If no props found directly, check if it's an ExportAssignment with an Identifier
      if (!propsInfo && Node.isExportAssignment(decl)) {
        const expr = decl.getExpression();
        if (Node.isIdentifier(expr)) {
          // Try to resolve the identifier to its declaration
          propsInfo = resolveIdentifierToProps(expr, sourceFile);
        }
      }

      if (propsInfo) {
        // Use filename as component name for default exports, converting kebab-case to PascalCase
        const fileName = path.basename(
          sourceFile.getFilePath(),
          path.extname(sourceFile.getFilePath()),
        );
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

/**
 * Resolve an identifier to its props - handles local variables and imports
 */
function resolveIdentifierToProps(
  identifier: Identifier,
  sourceFile: SourceFile,
): { type: Type | null; node: Node } | null {
  const identifierName = identifier.getText();

  // First, check if it's a local variable declaration
  const localVar = sourceFile.getVariableDeclaration(identifierName);
  if (localVar) {
    return extractPropsFromDeclaration(localVar);
  }

  // Check if it's a local function declaration
  const localFunc = sourceFile.getFunction(identifierName);
  if (localFunc) {
    return extractPropsFromDeclaration(localFunc);
  }

  // Check if it's an imported symbol - try to get props directly from the type
  const identifierType = identifier.getType();
  const callSignatures = identifierType.getCallSignatures();
  if (callSignatures.length > 0) {
    const sig = callSignatures[0];
    const params = sig.getParameters();
    if (params.length > 0) {
      const firstParam = params[0];
      const paramType = firstParam.getTypeAtLocation(identifier);
      const returnType = sig.getReturnType();
      if (isJsxReturnType(returnType)) {
        return { type: paramType, node: identifier };
      }
    } else {
      // No params but returns JSX - component without props
      const returnType = sig.getReturnType();
      if (isJsxReturnType(returnType)) {
        return { type: null, node: identifier };
      }
    }
  }

  // Fallback: try to resolve from the imported module source file
  const importDecls = sourceFile.getImportDeclarations();
  for (const importDecl of importDecls) {
    // Check named imports
    const namedImports = importDecl.getNamedImports();
    for (const namedImport of namedImports) {
      const importedName =
        namedImport.getAliasNode()?.getText() || namedImport.getName();
      if (importedName === identifierName) {
        // Found the import - resolve from the imported module
        return resolveImportedComponent(importDecl, namedImport.getName());
      }
    }

    // Check default import
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport && defaultImport.getText() === identifierName) {
      return resolveImportedComponent(importDecl, "default");
    }
  }

  return null;
}

/**
 * Resolve props from an imported component
 */
function resolveImportedComponent(
  importDecl: ImportDeclaration,
  exportName: string,
): { type: Type | null; node: Node } | null {
  try {
    const resolvedModule = importDecl.getModuleSpecifierSourceFile();

    if (!resolvedModule) {
      return null;
    }

    // Get the exported declaration from the module
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
    // Module resolution failed - this is okay for external modules
  }

  return null;
}

/**
 * Get the Type of a declaration node, if available.
 */
function getTypeOfDeclaration(decl: Node): Type | null {
  if ("getType" in decl && typeof decl.getType === "function") {
    return (decl as { getType: () => Type }).getType();
  }
  return null;
}

/**
 * Extract props type from a function/variable declaration
 */
function extractPropsFromDeclaration(
  decl: Node,
): { type: Type | null; node: Node } | null {
  // Handle function declarations: export function Button(props: ButtonProps) {}
  if (Node.isFunctionDeclaration(decl)) {
    return extractPropsFromFunction(decl);
  }

  // Handle variable declarations: export const Button = (props: ButtonProps) => {}
  if (Node.isVariableDeclaration(decl)) {
    const varDecl = decl as VariableDeclaration;
    const initializer = varDecl.getInitializer();

    if (initializer && Node.isArrowFunction(initializer)) {
      return extractPropsFromArrowFunction(initializer);
    }

    if (initializer && Node.isFunctionExpression(initializer)) {
      return extractPropsFromFunctionExpression(initializer);
    }

    // Handle React.forwardRef, React.memo, etc.
    if (initializer && Node.isCallExpression(initializer)) {
      const args = initializer.getArguments();
      for (const arg of args) {
        if (Node.isArrowFunction(arg)) {
          return extractPropsFromArrowFunction(arg);
        }
        if (Node.isFunctionExpression(arg)) {
          return extractPropsFromFunctionExpression(arg);
        }
      }
    }

    // Handle property access expressions: const Select = SelectPrimitive.Root
    if (
      initializer &&
      (Node.isPropertyAccessExpression(initializer) ||
        Node.isIdentifier(initializer))
    ) {
      // Try to get the type from the variable declaration
      const varType = varDecl.getType();
      // Check if this is a React component type (has Props in the call signature)
      const callSignatures = varType.getCallSignatures();
      if (callSignatures.length > 0) {
        const sig = callSignatures[0];
        const params = sig.getParameters();
        if (params.length > 0) {
          const firstParam = params[0];
          const paramType = firstParam.getTypeAtLocation(varDecl);
          const returnType = sig.getReturnType();
          if (isJsxReturnType(returnType)) {
            return { type: paramType, node: varDecl };
          }
        }
      }
    }
  }

  // Handle export default function() {}
  if (Node.isExportAssignment(decl)) {
    const expr = decl.getExpression();
    if (Node.isArrowFunction(expr)) {
      return extractPropsFromArrowFunction(expr);
    }
    if (Node.isFunctionExpression(expr)) {
      return extractPropsFromFunctionExpression(expr);
    }
  }

  return null;
}

function extractPropsFromFunction(
  func: FunctionDeclaration,
): { type: Type | null; node: Node } | null {
  // Check if this looks like a React component (returns JSX)
  const returnType = func.getReturnType();
  if (!isJsxReturnType(returnType)) return null;

  const params = func.getParameters();
  if (params.length === 0) {
    // No params - return empty props type
    return { type: null, node: func };
  }

  const firstParam = params[0];
  const type = firstParam.getType();
  return { type, node: firstParam };
}

function extractPropsFromArrowFunction(
  func: ArrowFunction,
): { type: Type | null; node: Node } | null {
  // Check if this looks like a React component (returns JSX)
  const returnType = func.getReturnType();
  if (!isJsxReturnType(returnType)) return null;

  const params = func.getParameters();
  if (params.length === 0) {
    // No params - return empty props type
    return { type: null, node: func };
  }

  const firstParam = params[0];
  const type = firstParam.getType();
  return { type, node: firstParam };
}

function extractPropsFromFunctionExpression(
  func: FunctionExpression,
): { type: Type | null; node: Node } | null {
  // Check if this looks like a React component (returns JSX)
  const returnType = func.getReturnType();
  if (!isJsxReturnType(returnType)) return null;

  const params = func.getParameters();
  if (params.length === 0) {
    // No params - return empty props type
    return { type: null, node: func };
  }

  const firstParam = params[0];
  const type = firstParam.getType();
  return { type, node: firstParam };
}

/**
 * Check if a return type looks like JSX (React.ReactElement, JSX.Element, etc.)
 */
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

/**
 * Check if a type represents a React slot (ReactNode, ReactElement, etc.)
 */
function isSlotType(typeText: string): boolean {
  // Exact patterns that indicate a slot type
  const slotPatterns = ["ReactNode", "ReactElement", "JSX.Element"];

  // Check if type is a slot type (but not a function returning ReactNode or event handler)
  const isSlot = slotPatterns.some((pattern) => typeText.includes(pattern));

  // Exclude event handlers and functions
  const isFunction =
    typeText.includes("=>") ||
    typeText.includes("EventHandler") ||
    typeText.includes("Handler<");

  return isSlot && !isFunction;
}

/**
 * Extract attributes and slots from a Type
 */
function extractAttributesAndSlots(
  type: Type | null,
  contextNode: Node,
): { attributes: WebTypeAttribute[]; slots: WebTypeSlot[] } {
  const attributes: WebTypeAttribute[] = [];
  const slots: WebTypeSlot[] = [];

  // Handle null type (components with no props)
  if (!type) {
    return { attributes, slots };
  }

  type.getProperties().forEach((prop: TsSymbol) => {
    const propName = prop.getName();

    // Skip internal React props
    if (["key", "ref"].includes(propName)) return;

    const propType = prop.getTypeAtLocation(contextNode);
    const typeText = cleanTypeText(propType.getText());
    const description = getPropertyDescription(prop);
    const required = !prop.isOptional();

    // Check if this prop is a slot (ReactNode type)
    if (isSlotType(typeText)) {
      // "children" becomes the "default" slot
      const slotName = propName === "children" ? "default" : propName;
      slots.push({
        name: slotName,
        description: description || `Content for the ${slotName} slot`,
      });
      return;
    }

    // Skip children if it's not a ReactNode (e.g., string children)
    if (propName === "children") return;

    // Regular attribute
    const attr: WebTypeAttribute = {
      name: toKebabCase(propName),
      description: description || undefined,
      required,
    };

    // Check for boolean types first (including optional booleans)
    if (typeText === "boolean" || typeText === "boolean | undefined") {
      // Boolean attributes can be used without value
      attr.value = {
        kind: "no-value",
        type: "boolean",
      };
    } else if (typeText.includes("|")) {
      // Parse union types for enum-like values
      const values = typeText
        .split("|")
        .map((v: string) => v.trim())
        .filter((v: string) => v !== "undefined" && v !== "null");

      // Check if all values are string literals (quoted strings only)
      // Exclude primitive types like boolean, string, number, etc.
      const primitiveTypes = [
        "boolean",
        "string",
        "number",
        "object",
        "any",
        "unknown",
        "never",
      ];
      const stringLiteralValues = values.filter((v: string) =>
        /^["'].*["']$/.test(v),
      );

      const hasOnlyStringLiterals =
        stringLiteralValues.length === values.length && values.length > 0;

      const hasOnlyPrimitives = values.every((v: string) =>
        primitiveTypes.includes(v),
      );

      if (hasOnlyStringLiterals) {
        attr.value = {
          kind: "plain",
          type: typeText,
        };
        // Add enum values for better autocomplete
        attr.values = stringLiteralValues
          .map((v: string) => v.replace(/['"]/g, ""))
          .map((v: string) => ({ name: v }));
      } else if (
        hasOnlyPrimitives ||
        values.some((v: string) => v.includes("=>"))
      ) {
        // Function types or primitive unions
        attr.value = {
          kind: "expression",
          type: typeText,
        };
      } else {
        attr.value = {
          kind: "plain",
          type: typeText,
        };
      }
    } else {
      attr.value = {
        kind: "plain",
        type: typeText,
      };
    }

    attributes.push(attr);
  });

  return { attributes, slots };
}

/**
 * Clean up type text for display
 */
function cleanTypeText(text: string): string {
  // Remove import(...) paths
  return text
    .replace(/import\([^)]+\)\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Try to extract JSDoc description from a property
 */
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
