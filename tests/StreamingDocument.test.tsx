import { screen, waitFor } from "@testing-library/dom";
import { vi, describe, it, expect, afterEach } from "vitest";
import { ReactNode, act } from "react";
import { App } from "../src";

function TestComponent({
  is,
  header,
  children,
}: {
  is: string;
  header?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <pre data-is={is}>
      {header}
      {children}
    </pre>
  );
}

const apps: App[] = [];

function mount(streaming = true): App {
  const app = new App(
    TestComponent,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { streaming },
  );
  apps.push(app);
  return app;
}

const SHELL = `<div id="reactolith-app" data-testid="root">
<ui-before>before</ui-before>
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
</div>`;

const FRAGMENT = `<template data-fragment="chart"><ui-chart>done</ui-chart></template><rl-fragment data-fragment="chart"></rl-fragment>`;

/** Pretend the parser is still writing the document. */
function stubLoading(): () => void {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    get: () => "loading",
  });
  return () => {
    delete (document as unknown as { readyState?: unknown }).readyState;
  };
}

afterEach(() => {
  while (apps.length) apps.pop()!.destroy();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("document stream", () => {
  it("takes fragments that are already in the document when the app boots", async () => {
    document.body.innerHTML = `${SHELL}\n${FRAGMENT}`;

    const app = mount();
    const root = await screen.findByTestId("root");

    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-chart"]')).toHaveTextContent(
        "done",
      ),
    );
    expect(root.querySelector('[data-is="ui-skeleton"]')).toBeNull();
    expect(app.pendingFragments()).toEqual([]);
    // Collecting takes the template and its marker out of the document.
    expect(document.querySelector("template[data-fragment]")).toBeNull();
    expect(document.querySelector("rl-fragment")).toBeNull();
  });

  it("takes fragments appended while the document is still loading", async () => {
    const restore = stubLoading();
    try {
      document.body.innerHTML = SHELL;

      const app = mount();
      const root = await screen.findByTestId("root");
      await waitFor(() =>
        expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
      );
      expect(app.pendingFragments()).toEqual(["chart"]);

      await act(async () => {
        document.body.insertAdjacentHTML("beforeend", FRAGMENT);
      });

      await waitFor(() =>
        expect(root.querySelector('[data-is="ui-chart"]')).toHaveTextContent(
          "done",
        ),
      );
      expect(document.querySelector("template[data-fragment]")).toBeNull();
    } finally {
      restore();
    }
  });

  it("waits for the marker before taking a template", async () => {
    const restore = stubLoading();
    try {
      document.body.innerHTML = SHELL;

      const app = mount();
      const root = await screen.findByTestId("root");
      await waitFor(() =>
        expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
      );

      // A <template> in the DOM is not finished — its content is still
      // arriving. Without the marker behind it nothing may be taken.
      await act(async () => {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<template data-fragment="chart"><ui-chart>half</ui-chart></template>`,
        );
      });
      await act(async () => {});
      expect(app.pendingFragments()).toEqual(["chart"]);
      expect(document.querySelector("template[data-fragment]")).not.toBeNull();

      await act(async () => {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<rl-fragment data-fragment="chart"></rl-fragment>`,
        );
      });
      await waitFor(() =>
        expect(root.querySelector('[data-is="ui-chart"]')).toHaveTextContent(
          "half",
        ),
      );
    } finally {
      restore();
    }
  });

  it("ends the stream on DOMContentLoaded and reports what is missing", async () => {
    const restore = stubLoading();
    try {
      document.body.innerHTML = SHELL;

      const app = mount();
      await screen.findByTestId("root");

      const ended = vi.fn();
      app.on("stream:ended", ended);
      expect(ended).not.toHaveBeenCalled();

      await act(async () => {
        document.dispatchEvent(new Event("DOMContentLoaded"));
      });

      expect(ended).toHaveBeenCalledTimes(1);
      expect(ended.mock.calls[0][0]).toEqual(["chart"]);
    } finally {
      restore();
    }
  });

  it("never mistakes the app's own markup for a fragment", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-panel><template slot="header" data-fragment="panel-head"><ui-title>Panel</ui-title></template></ui-panel>
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
</div>
${FRAGMENT}`;

    const app = mount();
    const root = await screen.findByTestId("root");

    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-chart"]')).toHaveTextContent(
        "done",
      ),
    );

    // A slot may legally be a `<template data-fragment="…">` placeholder; the
    // stream must not swallow it just because a marker follows further down.
    expect(app.pendingFragments()).toEqual(["panel-head"]);
    expect(root.querySelector('[data-is="ui-title"]')).toHaveTextContent(
      "Panel",
    );
  });

  it("collects nothing when streaming is off", async () => {
    document.body.innerHTML = `${SHELL}\n${FRAGMENT}`;

    const app = mount(false);
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
    );
    await act(async () => {});

    expect(root.querySelector('[data-is="ui-chart"]')).toBeNull();
    expect(root.querySelector('[data-is="ui-skeleton"]')).toHaveTextContent(
      "loading",
    );
    expect(document.querySelector("template[data-fragment]")).not.toBeNull();
    expect(app.pendingFragments()).toEqual(["chart"]);
  });
});
