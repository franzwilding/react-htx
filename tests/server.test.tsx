import React, { PropsWithChildren } from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "../src/server";
import type { App } from "../src/App";

function TestComponent({
  is,
  children,
  variant,
}: {
  is: string;
  children?: React.ReactNode;
  variant?: string;
}) {
  return (
    <pre data-is={is} data-variant={variant ?? ""}>
      {children}
    </pre>
  );
}

describe("renderToString", () => {
  it("renders reactolith elements to an HTML string", () => {
    document.body.innerHTML = `<div id="root">
      <my-component variant="primary">Hello SSR</my-component>
    </div>`;
    const root = document.getElementById("root")!;

    const html = renderToString(root, TestComponent);

    expect(html).toContain("Hello SSR");
    expect(html).toContain('data-is="my-component"');
    expect(html).toContain('data-variant="primary"');
  });

  it("renders multiple top-level elements", () => {
    document.body.innerHTML = `<div id="root">
      <my-component>One</my-component>
      <my-component>Two</my-component>
    </div>`;
    const root = document.getElementById("root")!;

    const html = renderToString(root, TestComponent);

    expect(html).toContain("One");
    expect(html).toContain("Two");
  });

  it("does not throw without a global document when ownerDocument is set", () => {
    document.body.innerHTML = `<div id="root">
      <my-component>Hi</my-component>
    </div>`;
    const root = document.getElementById("root")!;

    expect(() => renderToString(root, TestComponent)).not.toThrow();
  });

  it("invokes the App stub's no-op methods through a custom provider without throwing", () => {
    document.body.innerHTML = `<div id="root">
      <my-component>Hello</my-component>
    </div>`;
    const root = document.getElementById("root")!;

    const calls: string[] = [];

    function CustomProvider({
      app,
      children,
    }: PropsWithChildren<{ app: App }>) {
      // Exercise every stubbed method exactly once. A real custom provider
      // might do this in a useEffect, but useEffect doesn't run on the server
      // so we run the side effects synchronously during render.
      const routerUnsub = app.router.on(
        "nav:started" as Parameters<App["router"]["on"]>[0],
        () => {},
      );
      routerUnsub();
      app.router.off(
        "nav:started" as Parameters<App["router"]["off"]>[0],
        () => {},
      );

      const mercureUnsub = app.mercure.on("sse:connected", () => {});
      mercureUnsub();
      app.mercure.off("sse:connected", () => {});
      app.mercure.subscribe({
        hubUrl: "https://example.com/.well-known/mercure",
      });
      const rawUnsub = app.mercure.subscribeRaw("/topic", () => {});
      rawUnsub();
      app.mercure.close();

      const hydratedUnsub = app.onHydrated(() => {
        calls.push("hydrated-listener");
      });
      hydratedUnsub();
      app.notifyHydrated();

      const cfgUnsub = app.onMercureConfigChange(() => {
        calls.push("config-listener");
      });
      cfgUnsub();

      const renderResult = app.render("<div></div>");
      calls.push(`render:${renderResult}`);
      app.renderElement(app.element);
      app.unmount();
      app.destroy();

      return <div data-server-stub="true">{children}</div>;
    }

    const html = renderToString(root, TestComponent, {
      appProvider: CustomProvider,
    });

    expect(html).toContain('data-server-stub="true"');
    expect(html).toContain("Hello");
    // The default render stub returns false so the listeners stay no-ops.
    expect(calls).toEqual(["render:false"]);
  });

  it("throws when no document is available", () => {
    const fakeRoot = {
      ownerDocument: null,
      children: [],
    } as unknown as Element;

    const originalDocument = (globalThis as { document?: Document }).document;
    // Mimic a non-jsdom environment where `document` is not defined.
    delete (globalThis as { document?: Document }).document;

    try {
      expect(() => renderToString(fakeRoot, TestComponent)).toThrow(
        /rootElement has no ownerDocument and no global document/,
      );
    } finally {
      (globalThis as { document?: Document }).document = originalDocument;
    }
  });
});
