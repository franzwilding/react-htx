import { screen, waitFor } from "@testing-library/dom";
import { vi, describe, it, expect, afterEach } from "vitest";
import { ReactNode, act } from "react";
import { App, Mercure, SHELL_END } from "../src";

function TestComponent({ is, children }: { is: string; children?: ReactNode }) {
  return <pre data-is={is}>{children}</pre>;
}

const apps: App[] = [];

function mount(fetchImpl: unknown, streaming = true): App {
  const app = new App(
    TestComponent,
    undefined,
    undefined,
    undefined,
    undefined,
    fetchImpl as typeof fetch,
    { streaming },
  );
  apps.push(app);
  return app;
}

/**
 * A response whose body is a stream we control. Pushing after the reader was
 * cancelled throws ("Controller is already closed") — which is usually the
 * assertion you actually wanted.
 */
function streamedResponse(url = "/streamed") {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: { ok: true, redirected: false, url, body } as unknown as Response,
    push: (text: string) => controller.enqueue(encoder.encode(text)),
    close: () => controller.close(),
  };
}

function pageResponse(html: string, url = "/page") {
  return {
    ok: true,
    redirected: false,
    url,
    text: () => Promise.resolve(html),
  } as unknown as Response;
}

const SHELL = `<div id="reactolith-app" data-testid="root">
<ui-before>before</ui-before>
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
</div>`;

const FRAGMENT = `<template data-fragment="chart"><ui-chart>done</ui-chart></template><rl-fragment data-fragment="chart"></rl-fragment>`;

afterEach(() => {
  while (apps.length) apps.pop()!.destroy();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("streamed navigation", () => {
  it("paints the shell before the tail arrives, then swaps the fragment in", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-home>home</ui-home>
</div>`;

    const streamed = streamedResponse("/dashboard");
    const fetchMock = vi.fn(() => Promise.resolve(streamed.response));
    const app = mount(fetchMock);
    await screen.findByTestId("root");

    const visiting = app.router.visit("/dashboard");
    streamed.push(SHELL + SHELL_END);
    await act(async () => {
      await visiting;
    });

    const root = screen.getByTestId("root");
    expect(root.querySelector('[data-is="ui-skeleton"]')).toHaveTextContent(
      "loading",
    );
    expect(root.querySelector('[data-is="ui-chart"]')).toBeNull();
    expect(app.pendingFragments()).toEqual(["chart"]);

    streamed.push(FRAGMENT);
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-chart"]')).toHaveTextContent(
        "done",
      ),
    );
    expect(root.querySelector('[data-is="ui-skeleton"]')).toBeNull();
    streamed.close();
  });

  it("reports what never came when the stream closes with a hole", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-home>home</ui-home>
</div>`;

    const streamed = streamedResponse();
    const fetchMock = vi.fn(() => Promise.resolve(streamed.response));
    const app = mount(fetchMock);
    await screen.findByTestId("root");

    const ended = vi.fn();
    app.on("stream:ended", ended);

    const visiting = app.router.visit("/dashboard");
    streamed.push(SHELL + SHELL_END);
    await act(async () => {
      await visiting;
    });

    streamed.close();
    await waitFor(() => expect(ended).toHaveBeenCalled());
    expect(ended.mock.calls[0][0]).toEqual(["chart"]);
  });

  it("drops the tail of a response the user navigated away from", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-home>home</ui-home>
</div>`;

    const streamed = streamedResponse("/dashboard");
    const second = `<div id="reactolith-app" data-testid="root">
<ui-other>other page</ui-other>
<ui-skeleton data-fragment="chart">still loading…</ui-skeleton>
</div>`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamed.response)
      .mockResolvedValue(pageResponse(second, "/other"));

    const app = mount(fetchMock);
    await screen.findByTestId("root");

    const visiting = app.router.visit("/dashboard");
    streamed.push(SHELL + SHELL_END);
    await act(async () => {
      await visiting;
    });

    await act(async () => {
      await app.router.visit("/other");
    });

    const root = screen.getByTestId("root");
    expect(root.querySelector('[data-is="ui-other"]')).not.toBeNull();

    // The abandoned response's reader was cancelled, so the late fragment
    // cannot even be written any more — and it never reaches the tree.
    expect(() => streamed.push(FRAGMENT)).toThrow();

    await act(async () => {});
    expect(root.querySelector('[data-is="ui-chart"]')).toBeNull();
    expect(app.pendingFragments()).toEqual(["chart"]);
  });

  it("takes fragments that follow the closing body and html tags", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-home>home</ui-home>
</div>`;

    const streamed = streamedResponse();
    const fetchMock = vi.fn(() => Promise.resolve(streamed.response));
    const app = mount(fetchMock);
    await screen.findByTestId("root");

    const visiting = app.router.visit("/dashboard");
    streamed.push(SHELL + SHELL_END);
    await act(async () => {
      await visiting;
    });

    streamed.push(`</body></html>\n${FRAGMENT}`);
    await waitFor(() =>
      expect(
        screen.getByTestId("root").querySelector('[data-is="ui-chart"]'),
      ).toHaveTextContent("done"),
    );
    streamed.close();
  });

  it("renders a response without a sentinel as one whole page", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-home>home</ui-home>
</div>`;

    const streamed = streamedResponse();
    const fetchMock = vi.fn(() => Promise.resolve(streamed.response));
    const app = mount(fetchMock);
    await screen.findByTestId("root");

    const visiting = app.router.visit("/plain");
    streamed.push(`<div id="reactolith-app" data-testid="root">
<ui-plain>whole page</ui-plain>
</div>`);
    streamed.close();
    let result: unknown;
    await act(async () => {
      result = await visiting;
    });

    expect((result as { result: boolean }).result).toBe(true);
    expect(
      screen.getByTestId("root").querySelector('[data-is="ui-plain"]'),
    ).toHaveTextContent("whole page");
  });
});

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  readyState = MockEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  constructor(
    public url: string,
    public options?: { withCredentials?: boolean },
  ) {
    current = this;
  }
  close() {
    this.readyState = MockEventSource.CLOSED;
  }
  addEventListener() {}
  send(data: string) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
}

let current: MockEventSource | null = null;

describe("mercure pushes", () => {
  const originalEventSource = global.EventSource;

  afterEach(() => {
    global.EventSource = originalEventSource;
    current = null;
  });

  it("applies a template-only push and still renders a whole page", async () => {
    global.EventSource = MockEventSource as unknown as typeof EventSource;
    document.body.innerHTML = `<div id="reactolith-app" data-testid="root">
<ui-before>before</ui-before>
<ui-skeleton data-fragment="chart">loading…</ui-skeleton>
</div>`;

    const app = mount(vi.fn());
    const root = await screen.findByTestId("root");
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-skeleton"]')).not.toBeNull(),
    );

    const mercure = new Mercure(app);
    const applied = vi.fn();
    mercure.on("fragments:applied", applied);
    mercure.subscribe({ hubUrl: "https://hub.example/.well-known/mercure" });

    const before = root.querySelector('[data-is="ui-before"]');

    await act(async () => {
      current!.send(FRAGMENT);
    });

    expect(applied).toHaveBeenCalledWith(expect.anything(), ["chart"]);
    expect(root.querySelector('[data-is="ui-chart"]')).toHaveTextContent(
      "done",
    );
    // Nothing else in the tree was even walked.
    expect(root.querySelector('[data-is="ui-before"]')).toBe(before);

    await act(async () => {
      current!.send(`<div id="reactolith-app" data-testid="root">
<ui-page>a whole page</ui-page>
<template data-fragment="chart"><ui-chart>ignored</ui-chart></template>
</div>`);
    });

    expect(
      screen.getByTestId("root").querySelector('[data-is="ui-page"]'),
    ).toHaveTextContent("a whole page");
    mercure.close();
  });
});
