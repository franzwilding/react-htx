import { FRAGMENT_ATTRIBUTE, FRAGMENT_READY_TAG } from "./protocol";
import {
  isCommentNode,
  isElement,
  isTemplateElement,
  isTextNode,
} from "../util/dom";

/** A fragment name together with the content that replaces its placeholders. */
export type FragmentEntry = [name: string, content: DocumentFragment];

/** Content accepted by `App.replace()`. */
export type FragmentContent = string | Node | Node[] | null;

function isNode(value: unknown): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Node).nodeType === "number"
  );
}

function parseInTemplate(html: string, doc: Document): DocumentFragment {
  // Parsing through a detached <template> puts the parser in "template"
  // insertion mode, so a fragment of `<tr>`s or `<option>`s survives instead
  // of being dropped as stray content.
  const template = doc.createElement("template");
  template.innerHTML = html;
  return template.content;
}

/** Normalize anything `App.replace()` accepts into a DocumentFragment. */
export function toFragment(
  content: FragmentContent,
  doc: Document,
): DocumentFragment {
  if (content === null) return doc.createDocumentFragment();
  if (typeof content === "string") return parseInTemplate(content, doc);

  const fragment = doc.createDocumentFragment();
  const nodes = Array.isArray(content) ? content : [content];
  for (const node of nodes) {
    if (!isNode(node)) continue;
    if (node.nodeType === 11) {
      // Already a DocumentFragment — take its children as they are.
      Array.from(node.childNodes).forEach((child) =>
        fragment.appendChild(child.cloneNode(true)),
      );
      continue;
    }
    // Clone so passing a node that is currently in the document does not
    // rip it out of the page.
    fragment.appendChild(node.cloneNode(true));
  }
  return fragment;
}

/**
 * Pull every `<template data-fragment="…">` out of an HTML payload.
 * `querySelectorAll` does not descend into template content, so a placeholder
 * carried *inside* a fragment is not mistaken for a fragment definition.
 */
export function parseFragments(html: string, doc: Document): FragmentEntry[] {
  const parsed = parseInTemplate(html, doc);
  const entries: FragmentEntry[] = [];
  parsed
    .querySelectorAll(`template[${FRAGMENT_ATTRIBUTE}]`)
    .forEach((element) => {
      if (!isTemplateElement(element)) return;
      const name = element.getAttribute(FRAGMENT_ATTRIBUTE);
      if (name === null) return;
      entries.push([name, doc.importNode(element.content, true)]);
    });
  return entries;
}

/**
 * True when `html` is nothing but fragment templates. Whitespace, comments and
 * `<rl-fragment>` markers are allowed; any other node makes it a page — a page
 * that merely *contains* a template still has to render as a page.
 */
export function isFragmentPayload(html: string, doc: Document): boolean {
  const parsed = parseInTemplate(html, doc);
  let found = false;
  for (const node of Array.from(parsed.childNodes)) {
    if (isTextNode(node)) {
      if (node.textContent && node.textContent.trim() !== "") return false;
      continue;
    }
    if (isCommentNode(node)) continue;
    if (!isElement(node)) return false;
    if (isTemplateElement(node) && node.hasAttribute(FRAGMENT_ATTRIBUTE)) {
      found = true;
      continue;
    }
    if (node.tagName.toLowerCase() === FRAGMENT_READY_TAG) continue;
    return false;
  }
  return found;
}

/**
 * Every fragment name addressed by the tree that would be rendered from
 * `roots`. Where a placeholder has content, the walk continues through that
 * content (not through the skeleton it replaced), so a fragment carrying a
 * placeholder of its own is counted too.
 */
export function collectFragmentNames(
  roots: Iterable<Node>,
  resolve: (name: string) => DocumentFragment | undefined,
): Set<string> {
  const names = new Set<string>();

  const visit = (node: Node): void => {
    if (!isElement(node)) return;

    const name = node.getAttribute(FRAGMENT_ATTRIBUTE);
    if (name !== null) {
      names.add(name);
      const content = resolve(name);
      if (content) {
        Array.from(content.childNodes).forEach(visit);
        return;
      }
    }

    const scope: ParentNode = isTemplateElement(node) ? node.content : node;
    Array.from(scope.childNodes).forEach(visit);
  };

  for (const root of roots) visit(root);
  return names;
}
