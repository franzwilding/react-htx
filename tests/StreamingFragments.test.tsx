import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { vi, describe, it, expect, afterEach } from "vitest";
import { ReactNode, act, useState } from "react";
import { App } from "../src";

type Props = {
  is: string;
  header?: ReactNode;
  children?: ReactNode;
  ref?: unknown;
  [key: string]: unknown;
};

/** Renders every prop it received so tests can assert on the props object. */
function TestComponent({ is, header, children, ref, ...rest }: Props) {
  return (
    <pre data-is={is} data-props={Object.keys(rest).sort().join(",")}>
      {header ? <span data-testid={`slot-${is}`}>{header}</span> : null}
      {children}
    </pre>
  );
}

/** Same, but with local state — used to prove a swap keeps its siblings. */
function CounterComponent({ is, children }: Props) {
  const [count, setCount] = useState(0);
  return (
    <pre
      data-is={is}
      data-count={count}
      onClick={() => setCount((value) => value + 1)}
    >
      {children}
    </pre>
  );
}

const apps: App[] = [];

function mount(component = TestComponent, streaming = true): App {
  const app = new App(
    component,
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

afterEach(() => {
  // A live App keeps a click listener on `document` and a MutationObserver on
  // <body>; one left over from an earlier test swallows the next test's
  // fragments.
  while (apps.length) apps.pop()!.destroy();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("fragments", () => {
  it("replaces a placeholder with the fragment content", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-before>before</ui-before>
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
</div>`;

    const app = mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
    );

    await act(async () => {
      expect(app.replace("chart", "<ui-chart>done</ui-chart>")).toBe(true);
    });

    expect(root.querySelector('[data-is="ui-skeleton"]')).toBeNull();
    expect(root.querySelector('[data-is="ui-chart"]')).toHaveTextContent(
      "done",
    );
  });

  it("an empty fragment removes the placeholder and keeps the sibling after it", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
<ui-after>after</ui-after>
</div>`;

    const app = mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-after"]')).not.toBeNull(),
    );
    const after = root.querySelector('[data-is="ui-after"]');

    await act(async () => {
      expect(app.replace("chart", null)).toBe(true);
    });

    expect(root.querySelector('[data-is="ui-skeleton"]')).toBeNull();
    expect(root.querySelector('[data-is="ui-after"]')).toBe(after);
  });

  it("keeps the state and the identity of the components around the swap", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-one>one</ui-one>
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
<ui-two>two</ui-two>
</div>`;

    const app = mount(CounterComponent);
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-two"]')).not.toBeNull(),
    );

    const one = root.querySelector('[data-is="ui-one"]')!;
    const two = root.querySelector('[data-is="ui-two"]')!;
    await act(async () => {
      fireEvent.click(one);
      fireEvent.click(one);
      fireEvent.click(two);
    });
    expect(one).toHaveAttribute("data-count", "2");
    expect(two).toHaveAttribute("data-count", "1");

    // One node becomes two — the siblings must not re-mount.
    await act(async () => {
      app.replace(
        "chart",
        "<ui-chart-a>a</ui-chart-a><ui-chart-b>b</ui-chart-b>",
      );
    });

    expect(root.querySelector('[data-is="ui-one"]')).toBe(one);
    expect(root.querySelector('[data-is="ui-two"]')).toBe(two);
    expect(one).toHaveAttribute("data-count", "2");
    expect(two).toHaveAttribute("data-count", "1");
    expect(root.children[3]).toBe(two);
  });

  it("fills every placeholder carrying the name, not just the first", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="badge">…</ui-skeleton>
<ui-nav><ui-skeleton data-fragment="badge">…</ui-skeleton></ui-nav>
</div>`;

    const app = mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelectorAll('[data-is="ui-skeleton"]')).toHaveLength(2),
    );

    await act(async () => {
      app.replace("badge", "<ui-badge>7</ui-badge>");
    });

    expect(root.querySelectorAll('[data-is="ui-badge"]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-is="ui-skeleton"]')).toHaveLength(0);
  });

  it("applyFragments() returns every applied name", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="chart">…</ui-skeleton>
<ui-skeleton data-fragment="table">…</ui-skeleton>
</div>`;

    const app = mount();
    await screen.findByTestId("root");

    let applied: string[] = [];
    await act(async () => {
      applied = app.applyFragments(
        `<template data-fragment="chart"><ui-chart>c</ui-chart></template>
         <template data-fragment="table"><ui-table>t</ui-table></template>`,
      );
    });

    expect(applied).toEqual(["chart", "table"]);
    expect(
      screen.getByTestId("root").querySelector('[data-is="ui-chart"]'),
    ).not.toBeNull();
  });

  it("a whole page that contains a template is not a fragment payload", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="chart">…</ui-skeleton>
</div>`;
    const app = mount();
    await screen.findByTestId("root");

    expect(
      app.isFragmentPayload(
        `<template data-fragment="chart"><ui-chart>c</ui-chart></template>`,
      ),
    ).toBe(true);
    expect(
      app.isFragmentPayload(
        `\n  <template data-fragment="chart"><ui-chart>c</ui-chart></template>
         <rl-fragment data-fragment="chart"></rl-fragment>\n`,
      ),
    ).toBe(true);
    expect(
      app.isFragmentPayload(
        `<div id="reactolith-app"><template data-fragment="chart"><ui-chart>c</ui-chart></template></div>`,
      ),
    ).toBe(false);
    expect(
      app.isFragmentPayload(
        `<!doctype html><html><body><div id="reactolith-app"><ui-a>a</ui-a></div>
         <template data-fragment="chart"><ui-chart>c</ui-chart></template></body></html>`,
      ),
    ).toBe(false);
    expect(app.isFragmentPayload("   ")).toBe(false);
  });

  it("never passes data-fragment on as a prop or to the DOM", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="chart" data-size="lg">…</ui-skeleton>
<section data-fragment="native" data-size="sm">…</section>
</div>`;

    mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
    );

    const placeholder = root.querySelector('[data-is="ui-skeleton"]')!;
    expect(placeholder.getAttribute("data-props")).toBe("dataSize");
    expect(placeholder.hasAttribute("data-fragment")).toBe(false);

    const native = root.querySelector("section")!;
    expect(native.hasAttribute("data-fragment")).toBe(false);
    expect(native.getAttribute("data-size")).toBe("sm");
  });

  it("reports pending fragments and warns about a name nobody wants", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="chart">…</ui-skeleton>
</div>`;

    const app = mount();
    await screen.findByTestId("root");
    expect(app.pendingFragments()).toEqual(["chart"]);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await act(async () => {
      expect(app.replace("nobody", "<ui-x>x</ui-x>")).toBe(false);
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('data-fragment="nobody"'),
    );

    await act(async () => {
      app.replace("chart", "<ui-chart>c</ui-chart>");
    });
    expect(app.pendingFragments()).toEqual([]);

    // The unwanted fragment was remembered, not dropped.
    await act(async () => {
      expect(app.replace("nobody", "<ui-x>x</ui-x>")).toBe(false);
    });
  });

  it("emits fragment:received with the name and the content", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="chart">…</ui-skeleton>
</div>`;

    const app = mount();
    await screen.findByTestId("root");

    const received = vi.fn();
    app.on("fragment:received", received);

    await act(async () => {
      app.replace("chart", "<ui-chart>c</ui-chart>");
    });

    expect(received).toHaveBeenCalledTimes(1);
    expect(received.mock.calls[0][0]).toBe("chart");
    expect(received.mock.calls[0][1].childNodes.length).toBe(1);
  });

  it("fills a placeholder inside a slot, and a slot that is a placeholder", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-card>
  <template slot="header"><ui-skeleton data-fragment="title">…</ui-skeleton></template>
</ui-card>
<ui-panel>
  <template slot="header" data-fragment="panel-head"><ui-skeleton>…</ui-skeleton></template>
</ui-panel>
</div>`;

    const app = mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(screen.queryByTestId("slot-ui-card")).not.toBeNull(),
    );

    await act(async () => {
      expect(app.replace("title", "<ui-title>Sales</ui-title>")).toBe(true);
      expect(app.replace("panel-head", "<ui-title>Panel</ui-title>")).toBe(
        true,
      );
    });

    expect(screen.getByTestId("slot-ui-card")).toHaveTextContent("Sales");
    expect(screen.getByTestId("slot-ui-panel")).toHaveTextContent("Panel");
    expect(root.querySelectorAll('[data-is="ui-skeleton"]')).toHaveLength(0);
  });

  it("keeps a placeholder that arrives inside a fragment pending", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="outer">…</ui-skeleton>
</div>`;

    const app = mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
    );

    await act(async () => {
      app.replace(
        "outer",
        `<ui-section><ui-skeleton data-fragment="inner">…</ui-skeleton></ui-section>`,
      );
    });

    expect(app.pendingFragments()).toEqual(["inner"]);

    await act(async () => {
      expect(app.replace("inner", "<ui-inner>deep</ui-inner>")).toBe(true);
    });

    expect(root.querySelector('[data-is="ui-inner"]')).toHaveTextContent(
      "deep",
    );
    expect(app.pendingFragments()).toEqual([]);
  });

  it("handles a fragment name containing a double quote", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment='say "hi" \\ok'>…</ui-skeleton>
</div>`;

    const app = mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
    );

    expect(app.pendingFragments()).toEqual(['say "hi" \\ok']);
    await act(async () => {
      expect(app.replace('say "hi" \\ok', "<ui-quoted>q</ui-quoted>")).toBe(
        true,
      );
    });
    expect(root.querySelector('[data-is="ui-quoted"]')).toHaveTextContent("q");
  });

  it("forgets the previous page's fragments when a new page renders", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-skeleton data-fragment="chart">…</ui-skeleton>
</div>`;

    const app = mount();
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
    );

    await act(async () => {
      app.replace("chart", "<ui-chart>first page</ui-chart>");
    });
    expect(root.querySelector('[data-is="ui-chart"]')).not.toBeNull();

    await act(async () => {
      app.render(`<div id="reactolith-app">
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
</div>`);
    });

    expect(root.querySelector('[data-is="ui-chart"]')).toBeNull();
    expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull();
    expect(app.pendingFragments()).toEqual(["chart"]);
  });
});
