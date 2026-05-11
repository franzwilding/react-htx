import React, { ElementType, JSX, ReactNode, Ref, useContext } from "react";
import { AppContext } from "./provider/AppContext";
import type { App } from "./App";

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

// Lowercase HTML attribute names that React expects in camelCase on native
// intrinsic elements. Keys are matched case-insensitively against the raw
// attribute name. Anything not listed here is passed through unchanged.
// `aria-*` and `data-*` are not included because React accepts them verbatim.
const HTML_TO_REACT_NATIVE_ATTR: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  colspan: "colSpan",
  rowspan: "rowSpan",
  maxlength: "maxLength",
  minlength: "minLength",
  readonly: "readOnly",
  enctype: "encType",
  crossorigin: "crossOrigin",
  viewbox: "viewBox",
  autoplay: "autoPlay",
  autofocus: "autoFocus",
  autocomplete: "autoComplete",
  autocapitalize: "autoCapitalize",
  novalidate: "noValidate",
  formaction: "formAction",
  formenctype: "formEncType",
  formmethod: "formMethod",
  formnovalidate: "formNoValidate",
  formtarget: "formTarget",
  inputmode: "inputMode",
  spellcheck: "spellCheck",
  contenteditable: "contentEditable",
  srcdoc: "srcDoc",
  srclang: "srcLang",
  srcset: "srcSet",
  charset: "charSet",
  usemap: "useMap",
  accesskey: "accessKey",
  itemprop: "itemProp",
  itemref: "itemRef",
  itemid: "itemId",
  itemtype: "itemType",
  itemscope: "itemScope",
  hreflang: "hrefLang",
  datetime: "dateTime",
  "accept-charset": "acceptCharset",
  "http-equiv": "httpEquiv",
  allowfullscreen: "allowFullScreen",
  referrerpolicy: "referrerPolicy",
};

function getKey(element: Element): string | undefined {
  return element.attributes.getNamedItem("key")?.value;
}

function getProps(
  element: Element,
  component: ElementType,
  isReactComponent: boolean = true,
  app?: App,
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
      const propName = normalizePropName(attr.name);
      try {
        props[propName] = JSON.parse(attr.value);
      } catch (err) {
        // Set the prop explicitly to undefined so consumers can distinguish
        // "the backend didn't send it" from "it was sent but malformed" by
        // listening on the App-level "json-parse:failed" event.
        props[propName] = undefined;
        const error = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `reactolith: failed to parse JSON for "${attr.name}" on <${element.tagName.toLowerCase()}>:`,
          err,
        );
        app?.emitJsonParseFailed?.(error, {
          attrName: attr.name,
          value: attr.value,
          element,
        });
      }
    } else if (
      !isReactComponent &&
      (attr.name.startsWith("data-") || attr.name.startsWith("aria-"))
    ) {
      // React accepts data-* and aria-* attributes verbatim on intrinsic
      // elements; keep the hyphenated name so they land on the DOM as-is.
      props[attr.name] = attr.value;
    } else {
      // Special case: empty attribute value is treated as boolean true. This
      // matches HTML boolean-attribute semantics (`<input readonly>`,
      // `<my-button disabled>`).
      if (typeof value === "string" && value.length === 0) {
        value = true;
      }

      let propName: string;
      if (!isReactComponent) {
        // Native intrinsic element: prefer the known alias, then fall back to
        // camelCase for hyphenated names (so `read-only` still becomes
        // `readOnly`), otherwise pass through unchanged.
        const lower = attr.name.toLowerCase();
        if (lower in HTML_TO_REACT_NATIVE_ATTR) {
          propName = HTML_TO_REACT_NATIVE_ATTR[lower];
        } else if (attr.name.includes("-")) {
          propName = normalizePropName(attr.name);
        } else {
          propName = attr.name;
        }
      } else {
        propName =
          attr.name === "class" ? "className" : normalizePropName(attr.name);
      }

      props[propName] = value;
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
  const app = useContext(AppContext);
  if (!element) return null;

  const tagName = element.tagName.toLowerCase();
  const children = getChildren(element, Component);

  const isReactComponent = isReactComponentTag(element);

  const type: React.ElementType = isReactComponent
    ? Component
    : (tagName as keyof JSX.IntrinsicElements);

  const allProps = {
    ...getProps(element, Component, isReactComponent, app),
    ...getSlots(element, Component),
    key: getKey(element),
    ...(isReactComponent ? { is: tagName } : {}),
    ...props,
    ref,
  };

  return React.createElement(type, allProps, ...children);
}
