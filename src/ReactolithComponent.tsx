import React, { ElementType, JSX, ReactNode, Ref, useContext } from "react";
import { AppContext } from "./provider/AppContext";
import { kebabToPascal } from "./util/casing";
import { isElement, isTemplateElement, isTextNode } from "./util/dom";
import { FRAGMENT_ATTRIBUTE } from "./streaming/protocol";
import type { App } from "./App";

const normalizePropName = (name: string) => {
  if (name.startsWith("json-")) {
    name = name.substring(5);
  }
  name = kebabToPascal(name);
  return name.substring(0, 1).toLowerCase() + name.substring(1);
};

// Lowercase HTML attribute names that React expects in camelCase on native
// intrinsic elements. Keys are matched case-insensitively against the raw
// attribute name. Anything not listed here is passed through unchanged.
// `aria-*` and `data-*` are not included because React accepts them verbatim.
// A Map (rather than a plain object) so that attribute names colliding with
// Object.prototype members ("constructor", "toString", …) can never match.
const HTML_TO_REACT_NATIVE_ATTR = new Map<string, string>([
  ["class", "className"],
  ["for", "htmlFor"],
  ["tabindex", "tabIndex"],
  ["colspan", "colSpan"],
  ["rowspan", "rowSpan"],
  ["maxlength", "maxLength"],
  ["minlength", "minLength"],
  ["readonly", "readOnly"],
  ["enctype", "encType"],
  ["crossorigin", "crossOrigin"],
  ["viewbox", "viewBox"],
  ["autoplay", "autoPlay"],
  ["autofocus", "autoFocus"],
  ["autocomplete", "autoComplete"],
  ["autocapitalize", "autoCapitalize"],
  ["novalidate", "noValidate"],
  ["formaction", "formAction"],
  ["formenctype", "formEncType"],
  ["formmethod", "formMethod"],
  ["formnovalidate", "formNoValidate"],
  ["formtarget", "formTarget"],
  ["inputmode", "inputMode"],
  ["spellcheck", "spellCheck"],
  ["contenteditable", "contentEditable"],
  ["srcdoc", "srcDoc"],
  ["srclang", "srcLang"],
  ["srcset", "srcSet"],
  ["charset", "charSet"],
  ["usemap", "useMap"],
  ["accesskey", "accessKey"],
  ["itemprop", "itemProp"],
  ["itemref", "itemRef"],
  ["itemid", "itemId"],
  ["itemtype", "itemType"],
  ["itemscope", "itemScope"],
  ["hreflang", "hrefLang"],
  ["datetime", "dateTime"],
  ["accept-charset", "acceptCharset"],
  ["http-equiv", "httpEquiv"],
  ["allowfullscreen", "allowFullScreen"],
  ["referrerpolicy", "referrerPolicy"],
]);

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
  // Attribute names come from server-controlled HTML. A computed key of
  // `__proto__` would rebind the object's prototype instead of creating a
  // property (and would poison React's props copy downstream) — drop it.
  const setProp = (name: string, value: unknown) => {
    if (name === "__proto__") return;
    props[name] = value;
  };
  Array.from(element.attributes).forEach((attr) => {
    if (
      attr.name === "key" ||
      attr.name === FRAGMENT_ATTRIBUTE ||
      attr.name.startsWith("#")
    ) {
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
        setProp(propName, JSON.parse(attr.value));
      } catch (err) {
        // Set the prop explicitly to undefined so consumers can distinguish
        // "the backend didn't send it" from "it was sent but malformed" by
        // listening on the App-level "json-parse:failed" event.
        setProp(propName, undefined);
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
      setProp(attr.name, attr.value);
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
        const alias = HTML_TO_REACT_NATIVE_ATTR.get(attr.name.toLowerCase());
        if (alias) {
          propName = alias;
        } else if (attr.name.includes("-")) {
          propName = normalizePropName(attr.name);
        } else {
          propName = attr.name;
        }
      } else {
        propName =
          attr.name === "class" ? "className" : normalizePropName(attr.name);
      }

      setProp(propName, value);
    }
  });
  return props;
}

function getSlots(
  element: Element,
  component: ElementType,
  app?: App,
): Record<string, ReactNode[]> {
  const slots: Record<string, ReactNode[]> = {};
  Array.from(element.childNodes).forEach((child) => {
    if (!isElement(child)) return;

    const slotName = child.getAttribute("slot");
    if (!slotName) return;

    // A slot that is itself a placeholder hands its whole content over to the
    // fragment once that arrived.
    const fragment = getFragment(child, app);
    if (fragment) {
      slots[slotName] = getChildren(fragment, component);
      return;
    }

    const root: Element | DocumentFragment = isTemplateElement(child)
      ? child.content
      : child;
    slots[slotName] = getChildren(root, component);
  });
  return slots;
}

/**
 * Content that replaces `element`, if it carries `data-fragment` and the app
 * has already received a fragment under that name.
 */
function getFragment(
  element: Element,
  app?: App,
): DocumentFragment | undefined {
  const name = element.getAttribute(FRAGMENT_ATTRIBUTE);
  if (name === null) return undefined;
  return app?.fragment?.(name);
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

  // A placeholder with content renders the fragment instead of its skeleton.
  // The component itself keeps the key its parent gave it, so the siblings
  // around it keep their identity no matter how many nodes move in.
  const fragment = getFragment(element, app);
  if (fragment) {
    return <>{getChildren(fragment, Component)}</>;
  }

  const tagName = element.tagName.toLowerCase();
  const children = getChildren(element, Component);

  const isReactComponent = isReactComponentTag(element);

  const type: React.ElementType = isReactComponent
    ? Component
    : (tagName as keyof JSX.IntrinsicElements);

  const allProps = {
    ...getProps(element, Component, isReactComponent, app),
    ...getSlots(element, Component, app),
    key: getKey(element),
    ...(isReactComponent ? { is: tagName } : {}),
    ...props,
    ref,
  };

  return React.createElement(type, allProps, ...children);
}
