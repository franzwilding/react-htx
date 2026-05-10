import React, { ElementType, JSX, ReactNode, Ref } from "react";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

function isElement(node: Node): node is Element {
  return node.nodeType === ELEMENT_NODE;
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === TEXT_NODE;
}

function isTemplateElement(el: Element): el is HTMLTemplateElement {
  return el.tagName === "TEMPLATE" && "content" in el;
}

const toPascalCase = (str: string) => {
  return str.replace(/(^\w|-\w)/g, (match) =>
    match.replace(/-/, "").toUpperCase(),
  );
};

const normalizePropName = (name: string) => {
  if (name.startsWith("json-")) {
    name = name.substring(5);
  }
  name = toPascalCase(name);
  return name.substring(0, 1).toLowerCase() + name.substring(1);
};

function getKey(element: Element): string | undefined {
  return element.attributes.getNamedItem("key")?.value;
}

function getProps(
  element: Element,
  component: ElementType,
  isReactComponent: boolean = true,
): { [key: string]: unknown } {
  const props: { [key: string]: unknown } = {};
  Array.from(element.attributes).forEach((attr) => {
    if (attr.name === "key" || attr.name.startsWith("#")) {
      return;
    }

    let value: ReactNode = attr.value;
    if (
      typeof value === "string" &&
      attr.value.startsWith("{") &&
      attr.value.endsWith("}")
    ) {
      value = React.createElement(component, {
        is: value.substring(1, value.length - 1),
      });
    }

    if (attr.name.startsWith("json-")) {
      try {
        props[normalizePropName(attr.name)] = JSON.parse(attr.value);
      } catch (err) {
        console.warn(
          `reactolith: failed to parse JSON for "${attr.name}" on <${element.tagName.toLowerCase()}>:`,
          err,
        );
      }
    } else if (!isReactComponent && attr.name.startsWith("data-")) {
      props[attr.name] = attr.value;
    } else {
      // Special case: empty value on a custom-component attribute is treated as boolean true
      if (typeof value === "string" && value.length === 0) {
        value = true;
      }

      props[
        attr.name === "class" ? "className" : normalizePropName(attr.name)
      ] = value;
    }
  });
  return props;
}

function getSlots(
  element: Element,
  component: ElementType,
): Record<string, ReactNode[]> {
  const slots: Record<string, ReactNode[]> = {};
  Array.from(element.childNodes).forEach((child) => {
    if (!isElement(child)) return;

    const slotName = child.getAttribute("slot");
    if (!slotName) return;

    const root: Element | DocumentFragment = isTemplateElement(child)
      ? child.content
      : child;
    slots[slotName] = getChildren(root, component);
  });
  return slots;
}

function getChildren(
  element: Element | DocumentFragment,
  component: ElementType,
): ReactNode[] {
  return Array.from(element.childNodes)
    .map((child, index) => {
      if (isElement(child) && child.hasAttribute("slot")) {
        return null;
      }

      if (isTextNode(child)) {
        return child.textContent;
      }

      if (isElement(child)) {
        const key = child.hasAttribute("key")
          ? child.getAttribute("key")
          : index;
        return (
          <ReactolithComponent
            key={key}
            element={child}
            component={component}
          />
        );
      }
      return null;
    })
    .filter(Boolean);
}

type ReactolithProps = React.HTMLAttributes<Element> & {
  element?: Element;
  component: React.ElementType;
  ref?: Ref<Element>;
};

/**
 * Detect if the given element refers to a custom React component.
 *
 * - Tag names containing a hyphen (`my-button`) are always custom components.
 * - SVG elements are kept as native intrinsic elements.
 * - Anything else with the standard HTML element interface is a native element.
 */
function isReactComponentTag(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  if (tagName.includes("-")) return true;

  // Standard HTML / SVG namespaces should render as intrinsic elements
  const namespace = element.namespaceURI;
  if (
    namespace === "http://www.w3.org/1999/xhtml" ||
    namespace === "http://www.w3.org/2000/svg" ||
    namespace === "http://www.w3.org/1998/Math/MathML"
  ) {
    return false;
  }

  // Unknown namespace or document without one - assume custom component
  return true;
}

export function ReactolithComponent({
  element,
  component: Component,
  ref,
  ...props
}: ReactolithProps) {
  if (!element) return null;

  const tagName = element.tagName.toLowerCase();
  const children = getChildren(element, Component);

  const isReactComponent = isReactComponentTag(element);

  const type: React.ElementType = isReactComponent
    ? Component
    : (tagName as keyof JSX.IntrinsicElements);

  const allProps = {
    ...getProps(element, Component, isReactComponent),
    ...getSlots(element, Component),
    key: getKey(element),
    ...(isReactComponent ? { is: tagName } : {}),
    ...props,
    ref,
  };

  return React.createElement(type, allProps, ...children);
}
