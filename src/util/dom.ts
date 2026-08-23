/**
 * Small DOM node predicates shared by the component walker and the streaming
 * fragment parser. Both need the same three checks; keeping them here avoids
 * repeating raw `nodeType` numbers across modules.
 */

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;

export function isElement(node: Node): node is Element {
  return node.nodeType === ELEMENT_NODE;
}

export function isTextNode(node: Node): node is Text {
  return node.nodeType === TEXT_NODE;
}

export function isCommentNode(node: Node): node is Comment {
  return node.nodeType === COMMENT_NODE;
}

export function isTemplateElement(el: Element): el is HTMLTemplateElement {
  return el.tagName === "TEMPLATE" && "content" in el;
}
