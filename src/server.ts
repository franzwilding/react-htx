import React, { ElementType, PropsWithChildren } from "react";
import { renderToString as reactRenderToString } from "react-dom/server";
import { ReactolithComponent } from "./ReactolithComponent";
import { AppProvider } from "./provider/AppProvider";
import type { App, MercureConfig } from "./App";
import type { Router } from "./Router";
import type { Mercure } from "./Mercure";

export type RenderToStringOptions = {
  /**
   * Custom React provider used to wrap the tree. Defaults to the built-in
   * `AppProvider`. Custom providers receive the same `{ app }` prop.
   */
  appProvider?: ElementType<PropsWithChildren<{ app: App }>>;
  /**
   * Document used to host the root element. Defaults to `rootElement.ownerDocument`.
   */
  doc?: Document;
};

/**
 * Build a minimal App-shaped object for server rendering. Most fields are
 * no-ops because the client-only side effects (event listeners, history,
 * createRoot) never run during `react-dom/server.renderToString`.
 */
function createServerApp(
  rootElement: Element,
  doc: Document,
  component: ElementType,
): App {
  const noopUnsubscribe = () => {};

  const router = {
    on: () => noopUnsubscribe,
    off: () => {},
  } as unknown as Router;

  const mercure = {
    on: () => noopUnsubscribe,
    off: () => {},
    subscribe: () => {},
    subscribeRaw: () => noopUnsubscribe,
    close: () => {},
    connected: false,
    url: null,
    lastEventId: undefined,
  } as unknown as Mercure;

  const stub = {
    element: rootElement as HTMLElement,
    router,
    mercure,
    component,
    doc,
    hideUntilHydrated: false,
    hiddenClass: "hidden",
    mercureConfig: undefined as MercureConfig | undefined,
    onMercureConfigChange: () => noopUnsubscribe,
    notifyHydrated: () => {},
    onHydrated: () => noopUnsubscribe,
    render: () => false,
    renderElement: () => {},
    // Streaming is a client-only mechanism: on the server there is no
    // "later", so a placeholder renders its skeleton. Every method still has
    // to exist — a missing one is a runtime TypeError, not a type error.
    streaming: false,
    sendFragmentNames: false,
    fragment: () => undefined,
    replace: () => false,
    applyFragments: () => [],
    isFragmentPayload: () => false,
    pendingFragments: () => [],
    fragmentNames: () => [],
    adoptStream: () => {},
    acceptFragments: () => {},
    endStream: () => {},
    unmount: () => {},
    destroy: () => {},
  };

  return stub as unknown as App;
}

/**
 * Render a reactolith app to an HTML string for server-side rendering.
 *
 * Walks the children of `rootElement` the same way the client `App` does,
 * wraps them in the supplied `appProvider`, and pipes the tree through
 * `react-dom/server`'s `renderToString`.
 *
 * Mercure and Router side effects are skipped — both rely on `useEffect`,
 * which does not run on the server.
 */
export function renderToString(
  rootElement: Element,
  component: ElementType,
  options: RenderToStringOptions = {},
): string {
  const doc =
    options.doc ??
    rootElement.ownerDocument ??
    (typeof document !== "undefined"
      ? document
      : (null as unknown as Document));

  if (!doc) {
    throw new Error(
      "renderToString: rootElement has no ownerDocument and no global document is available.",
    );
  }

  const Provider = options.appProvider ?? AppProvider;
  const app = createServerApp(rootElement, doc, component);

  const children = Array.from(rootElement.children).map((child, key) =>
    React.createElement(ReactolithComponent, {
      key,
      element: child,
      component,
    }),
  );

  return reactRenderToString(React.createElement(Provider, { app }, children));
}
