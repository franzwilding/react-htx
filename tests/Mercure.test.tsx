import { screen, waitFor } from "@testing-library/dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { App, Mercure } from "../src";
import { ReactNode } from "react";

function TestComponent({ is, children }: { is: string; children: ReactNode }) {
  return <pre data-is={is}>{children}</pre>;
}

// Mock EventSource
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  withCredentials: boolean;
  readyState: number = MockEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  namedListeners: Record<string, Array<(event: MessageEvent) => void>> = {};

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials || false;
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  addEventListener(name: string, listener: (event: MessageEvent) => void) {
    (this.namedListeners[name] ||= []).push(listener);
  }

  // Helper methods for testing
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) {
      this.onopen(new Event("open"));
    }
  }

  simulateMessage(data: string, id?: string) {
    if (this.onmessage) {
      const event = new MessageEvent("message", {
        data,
        lastEventId: id,
      });
      this.onmessage(event);
    }
  }

  simulateNamed(name: string, data: string, id?: string) {
    const event = new MessageEvent(name, { data, lastEventId: id });
    (this.namedListeners[name] || []).forEach((l) => l(event));
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

describe("Mercure SSE integration", () => {
  let mockEventSource: MockEventSource | null = null;
  const originalEventSource = global.EventSource;
  const originalLocation = window.location;
  let appInstances: App[] = [];
  let eventSourceCalls: Array<[string, any?]> = [];

  beforeEach(() => {
    appInstances = [];
    eventSourceCalls = [];

    // Mock EventSource globally with a proper constructor function
    const TrackedEventSource: any = class extends MockEventSource {
      constructor(url: string, options?: { withCredentials?: boolean }) {
        super(url, options);
        mockEventSource = this;
        eventSourceCalls.push([url, options]);
      }
    };
    TrackedEventSource.CONNECTING = 0;
    TrackedEventSource.OPEN = 1;
    TrackedEventSource.CLOSED = 2;

    global.EventSource = TrackedEventSource;

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { pathname: "/dashboard" },
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up all app instances
    appInstances.forEach((app) => {
      try {
        app.unmount();
      } catch (e) {
        // Ignore unmount errors in cleanup
      }
    });
    appInstances = [];

    // Don't reset global.EventSource here - let each test's beforeEach handle it
    mockEventSource = null;
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("creates a Mercure instance", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    appInstances.push(app);
    const mercure = new Mercure(app);

    expect(mercure).toBeInstanceOf(Mercure);
    expect(mercure.connected).toBe(false);
  });

  it("subscribes to Mercure hub using current pathname", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    expect(eventSourceCalls.length).toBe(1);
    expect(eventSourceCalls[0][0]).toBe(
      "https://example.com/.well-known/mercure?topic=%2Fdashboard",
    );
    expect(eventSourceCalls[0][1]).toEqual({ withCredentials: false });
  });

  it("uses different pathnames as topics", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    // Change pathname
    Object.defineProperty(window, "location", {
      value: { pathname: "/users/123" },
      writable: true,
    });

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    expect(eventSourceCalls.length).toBe(1);
    const calledUrl = eventSourceCalls[0][0];
    expect(calledUrl).toContain("topic=%2Fusers%2F123");
  });

  it("emits sse:connected when connection opens", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const connectedHandler = vi.fn();

    mercure.on("sse:connected", connectedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    expect(connectedHandler).toHaveBeenCalledTimes(1);
    expect(mercure.connected).toBe(true);
  });

  it("processes incoming HTML and renders it", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    expect(root.querySelector("pre")).toHaveTextContent("Initial");

    // Simulate receiving an SSE message with new HTML
    mockEventSource!.simulateMessage(`<div id="reactolith-app">
      <my-component>Updated via SSE</my-component>
    </div>`);

    await waitFor(() => {
      expect(root.querySelector("pre")).toHaveTextContent("Updated via SSE");
    });
  });

  it("emits render:success on successful render", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const successHandler = vi.fn();

    mercure.on("render:success", successHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    await screen.findByTestId("reactolith-app");

    mockEventSource!.simulateMessage(`<div id="reactolith-app">
      <my-component>Updated</my-component>
    </div>`);

    await waitFor(() => {
      expect(successHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("emits render:failed when root element not found in HTML", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const failedHandler = vi.fn();

    mercure.on("render:failed", failedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    await screen.findByTestId("reactolith-app");

    // Send HTML without the reactolith-app root
    mockEventSource!.simulateMessage(`<div id="other-app">
      <my-component>No root</my-component>
    </div>`);

    await waitFor(() => {
      expect(failedHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("emits sse:message for every message", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const messageHandler = vi.fn();

    mercure.on("sse:message", messageHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    const html = `<div id="reactolith-app"><my-component>Updated</my-component></div>`;
    mockEventSource!.simulateMessage(html);

    expect(messageHandler).toHaveBeenCalledTimes(1);
    expect(messageHandler.mock.calls[0][1]).toBe(html);
  });

  it("emits sse:error on connection error", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const errorHandler = vi.fn();

    mercure.on("sse:error", errorHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateError();

    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  it("closes connection and emits sse:disconnected", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const disconnectedHandler = vi.fn();

    mercure.on("sse:disconnected", disconnectedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();
    expect(mercure.connected).toBe(true);

    mercure.close();

    expect(disconnectedHandler).toHaveBeenCalledTimes(1);
    expect(mercure.connected).toBe(false);
  });

  it("can unsubscribe from events using off()", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const handler = vi.fn();

    mercure.on("sse:connected", handler);
    mercure.off("sse:connected", handler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    expect(handler).not.toHaveBeenCalled();
  });

  it("can unsubscribe using returned cleanup function", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const handler = vi.fn();

    const unsubscribe = mercure.on("sse:connected", handler);
    unsubscribe();

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    expect(handler).not.toHaveBeenCalled();
  });

  it("re-subscribes when router navigates", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const disconnectedHandler = vi.fn();

    mercure.on("sse:disconnected", disconnectedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    const firstEventSource = mockEventSource;
    mockEventSource!.simulateOpen();

    // Simulate route change
    Object.defineProperty(window, "location", {
      value: { pathname: "/new-route" },
      writable: true,
    });

    // Emit router's render:success event (cast to any for testing protected method)
    (app.router as any).emit(
      "render:success",
      "/new-route",
      {},
      true,
      new Response(),
      "<html></html>",
      "/new-route",
    );

    expect(firstEventSource!.readyState).toBe(MockEventSource.CLOSED);
    expect(disconnectedHandler).toHaveBeenCalledTimes(1);

    // Verify new subscription uses new pathname
    expect(eventSourceCalls.length).toBe(2);
    const calledUrl = eventSourceCalls[1][0];
    expect(calledUrl).toContain("topic=%2Fnew-route");
  });

  it("includes withCredentials option", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
      withCredentials: true,
    });

    expect(eventSourceCalls.length).toBe(1);
    expect(eventSourceCalls[0][1]).toEqual({ withCredentials: true });
  });

  it("includes lastEventId in URL", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
      lastEventId: "abc123",
    });

    expect(eventSourceCalls.length).toBe(1);
    const calledUrl = eventSourceCalls[0][0];
    expect(calledUrl).toContain("lastEventID=abc123");
  });

  it("exposes current URL", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    expect(mercure.url).toBeNull();

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    expect(mercure.url).toContain("example.com");
    expect(mercure.url).toContain("topic=%2Fdashboard");
  });

  it("cleans up router listener on close", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();
    mercure.close();

    // Simulate route change after close - should not create new connection
    Object.defineProperty(window, "location", {
      value: { pathname: "/new-route" },
      writable: true,
    });

    (app.router as any).emit(
      "render:success",
      "/new-route",
      {},
      true,
      new Response(),
      "<html></html>",
      "/new-route",
    );

    // Should still only have 1 call (the initial one)
    expect(eventSourceCalls.length).toBe(1);
  });

  it("auto-refetches current route when receiving empty message", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    // Mock fetch to return updated HTML
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      redirected: false,
      text: async () => `<div id="reactolith-app">
        <my-component>Refetched content</my-component>
      </div>`,
    });

    const app = new App(
      TestComponent,
      undefined,
      undefined,
      undefined,
      undefined,
      mockFetch as any,
    );
    appInstances.push(app);
    const mercure = new Mercure(app);

    const refetchStartedHandler = vi.fn();
    const refetchSuccessHandler = vi.fn();

    mercure.on("refetch:started", refetchStartedHandler);
    mercure.on("refetch:success", refetchSuccessHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    expect(root.querySelector("pre")).toHaveTextContent("Initial");

    // Simulate receiving an empty SSE message
    mockEventSource!.simulateMessage("");

    // Should trigger refetch
    await waitFor(() => {
      expect(refetchStartedHandler).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        window.location.pathname + window.location.search,
        expect.objectContaining({ method: "GET" }),
      );
    });

    await waitFor(() => {
      expect(refetchSuccessHandler).toHaveBeenCalledTimes(1);
    });

    // Content should be updated
    await waitFor(() => {
      expect(root.querySelector("pre")).toHaveTextContent("Refetched content");
    });
  });

  it("auto-refetches current route when receiving whitespace-only message", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    // Mock fetch to return updated HTML
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      redirected: false,
      text: async () => `<div id="reactolith-app">
        <my-component>Refetched content</my-component>
      </div>`,
    });

    const app = new App(
      TestComponent,
      undefined,
      undefined,
      undefined,
      undefined,
      mockFetch as any,
    );
    appInstances.push(app);
    const mercure = new Mercure(app);

    const refetchStartedHandler = vi.fn();
    const refetchSuccessHandler = vi.fn();

    mercure.on("refetch:started", refetchStartedHandler);
    mercure.on("refetch:success", refetchSuccessHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    expect(root.querySelector("pre")).toHaveTextContent("Initial");

    // Simulate receiving a whitespace-only SSE message
    mockEventSource!.simulateMessage("   \n\t  ");

    // Should trigger refetch
    await waitFor(() => {
      expect(refetchStartedHandler).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalled();
      expect(refetchSuccessHandler).toHaveBeenCalledTimes(1);
    });

    // Content should be updated
    await waitFor(() => {
      expect(root.querySelector("pre")).toHaveTextContent("Refetched content");
    });
  });

  it("emits refetch:failed when refetch fails", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    // Mock fetch to reject
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const app = new App(
      TestComponent,
      undefined,
      undefined,
      undefined,
      undefined,
      mockFetch as any,
    );
    appInstances.push(app);
    const mercure = new Mercure(app);

    const refetchFailedHandler = vi.fn();

    mercure.on("refetch:failed", refetchFailedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    // Simulate receiving an empty SSE message
    mockEventSource!.simulateMessage("");

    // Should emit refetch:failed
    await waitFor(() => {
      expect(refetchFailedHandler).toHaveBeenCalledTimes(1);
      expect(refetchFailedHandler.mock.calls[0][1]).toBeInstanceOf(Error);
      expect(refetchFailedHandler.mock.calls[0][1].message).toBe(
        "Network error",
      );
    });
  });

  it("does not emit refetch:failed when a refetch is superseded by a newer empty message", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    // First fetch: deferred so it stays in-flight while the second arrives.
    // Once the second visit() aborts the first, the slow promise rejects with
    // AbortError; the router translates that into { cancelled: true, result: false }.
    let resolveSlow!: (value: any) => void;
    let rejectSlow!: (reason?: unknown) => void;
    const slowPromise = new Promise<any>((res, rej) => {
      resolveSlow = res;
      rejectSlow = rej;
    });

    const mockFetch = vi
      .fn()
      .mockImplementationOnce((_input: unknown, init: RequestInit) => {
        init?.signal?.addEventListener("abort", () => {
          rejectSlow(new DOMException("Aborted", "AbortError"));
        });
        return slowPromise;
      })
      .mockResolvedValueOnce({
        ok: true,
        redirected: false,
        text: async () => `<div id="reactolith-app">
          <my-component>Refetched content</my-component>
        </div>`,
      });

    const app = new App(
      TestComponent,
      undefined,
      undefined,
      undefined,
      undefined,
      mockFetch as any,
    );
    appInstances.push(app);
    const mercure = new Mercure(app);

    const refetchStartedHandler = vi.fn();
    const refetchSuccessHandler = vi.fn();
    const refetchFailedHandler = vi.fn();

    mercure.on("refetch:started", refetchStartedHandler);
    mercure.on("refetch:success", refetchSuccessHandler);
    mercure.on("refetch:failed", refetchFailedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    // First empty message: starts a refetch that will hang on the slow fetch.
    mockEventSource!.simulateMessage("");
    await waitFor(() => {
      expect(refetchStartedHandler).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Second empty message: triggers another refetch that aborts the first.
    mockEventSource!.simulateMessage("");
    await waitFor(() => {
      expect(refetchStartedHandler).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Resolve the slow first fetch *after* it has been aborted. Without the
    // cancelled-aware branch in Mercure.onmessage, this would mistakenly emit
    // refetch:failed for the superseded refetch.
    resolveSlow({
      ok: true,
      redirected: false,
      text: async () => "<div></div>",
    });

    await waitFor(() => {
      expect(refetchSuccessHandler).toHaveBeenCalledTimes(1);
    });

    expect(refetchFailedHandler).not.toHaveBeenCalled();
  });

  it("does not refetch when receiving normal HTML content", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const mockFetch = vi.fn();

    const app = new App(
      TestComponent,
      undefined,
      undefined,
      undefined,
      undefined,
      mockFetch as any,
    );
    appInstances.push(app);
    const mercure = new Mercure(app);

    const refetchStartedHandler = vi.fn();

    mercure.on("refetch:started", refetchStartedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();

    // Simulate receiving normal HTML content
    mockEventSource!.simulateMessage(`<div id="reactolith-app">
      <my-component>Updated via SSE</my-component>
    </div>`);

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).toHaveTextContent("Updated via SSE");
    });

    // Should NOT trigger refetch
    expect(refetchStartedHandler).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("delivers named SSE events through sse:named", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const namedHandler = vi.fn();

    mercure.on("sse:named", namedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
      events: ["notification", "sidebar"],
    });

    mockEventSource!.simulateOpen();
    mockEventSource!.simulateNamed("notification", '{"count":1}', "evt-1");
    mockEventSource!.simulateNamed("sidebar", "<aside>x</aside>");

    expect(namedHandler).toHaveBeenCalledTimes(2);
    expect(namedHandler.mock.calls[0][0]).toBe("notification");
    expect(namedHandler.mock.calls[0][2]).toBe('{"count":1}');
    expect(mercure.lastEventId).toBe("evt-1");
    expect(namedHandler.mock.calls[1][0]).toBe("sidebar");
    expect(namedHandler.mock.calls[1][2]).toBe("<aside>x</aside>");
  });

  it("uses a custom getTopic option to derive the subscription topic", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    const getTopic = vi.fn(() => "/custom-topic");

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
      getTopic,
    });

    expect(getTopic).toHaveBeenCalled();
    expect(eventSourceCalls.length).toBe(1);
    expect(eventSourceCalls[0][0]).toContain("topic=%2Fcustom-topic");
  });

  it("tracks the last event id from incoming messages", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();
    mockEventSource!.simulateMessage(
      `<div id="reactolith-app"><my-component>x</my-component></div>`,
      "evt-42",
    );

    await waitFor(() => {
      expect(mercure.lastEventId).toBe("evt-42");
    });
  });

  it("emits refetch:failed when the refetched HTML cannot render", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    // Refetch resolves successfully but returns HTML without a #reactolith-app
    // root, so app.render(html) returns false and Mercure must report failure.
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      redirected: false,
      text: async () => `<div id="other-root"></div>`,
    });

    const app = new App(
      TestComponent,
      undefined,
      undefined,
      undefined,
      undefined,
      mockFetch as any,
    );
    appInstances.push(app);
    const mercure = new Mercure(app);

    const refetchFailedHandler = vi.fn();
    mercure.on("refetch:failed", refetchFailedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    mockEventSource!.simulateOpen();
    mockEventSource!.simulateMessage("");

    await waitFor(() => {
      expect(refetchFailedHandler).toHaveBeenCalledTimes(1);
      expect(refetchFailedHandler.mock.calls[0][1]).toBeInstanceOf(Error);
      expect(refetchFailedHandler.mock.calls[0][1].message).toMatch(
        /failed to render/i,
      );
    });
  });

  it("re-subscribing closes the previous router listener", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });
    expect(eventSourceCalls.length).toBe(1);

    // Subscribe again — should tear down the previous router listener and
    // make a fresh subscription. Without the unsubscribe-the-previous path,
    // the next router event would fire two reconnections.
    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
      getTopic: () => "/route-b",
    });

    Object.defineProperty(window, "location", {
      value: { pathname: "/somewhere-else" },
      writable: true,
    });

    (app.router as any).emit(
      "render:success",
      "/somewhere-else",
      {},
      true,
      new Response(),
      "<html></html>",
      "/somewhere-else",
    );

    // Each EventSource creation reflects exactly one connect; the old
    // router listener must not have produced an extra connect.
    const routeBCalls = eventSourceCalls.filter((c) =>
      c[0].includes("topic=%2Froute-b"),
    );
    expect(routeBCalls.length).toBe(1);
  });

  it("emits sse:disconnected on error when the EventSource is CLOSED", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const disconnectedHandler = vi.fn();

    mercure.on("sse:disconnected", disconnectedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
    });

    // Simulate the EventSource transitioning to CLOSED before the error fires.
    mockEventSource!.readyState = MockEventSource.CLOSED;
    mockEventSource!.simulateError();

    expect(disconnectedHandler).toHaveBeenCalledTimes(1);
  });

  it("subscribeRaw forwards EventSource errors to registered error listeners", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    app.mercureConfig = {
      hubUrl: "https://example.com/.well-known/mercure",
    };

    const onMessage = vi.fn();
    const onError = vi.fn();

    const unsubscribe = app.mercure.subscribeRaw(
      "/raw-topic",
      onMessage,
      onError,
    );

    // openRawSource constructs an EventSource — assert and trigger its onerror.
    expect(mockEventSource).not.toBeNull();
    mockEventSource!.simulateError();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Event);

    // Unsubscribing twice must not throw — second call hits the early-return
    // path when the entry has already been cleaned up.
    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("subscribeRaw reopens connections when app.mercureConfig is reassigned", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    app.mercureConfig = {
      hubUrl: "https://hub-a.example.com/.well-known/mercure",
    };

    const onMessage = vi.fn();
    app.mercure.subscribeRaw("/raw-topic", onMessage);

    // First connection uses hub-a.
    expect(eventSourceCalls.length).toBe(1);
    expect(eventSourceCalls[0][0]).toContain("hub-a.example.com");
    const firstSource = mockEventSource;

    // Reassigning the config must close the old EventSource and open a new
    // one against the new hub URL. Listeners stay registered.
    app.mercureConfig = {
      hubUrl: "https://hub-b.example.com/.well-known/mercure",
    };

    expect(firstSource!.readyState).toBe(MockEventSource.CLOSED);
    expect(eventSourceCalls.length).toBe(2);
    expect(eventSourceCalls[1][0]).toContain("hub-b.example.com");

    // The new EventSource still drives the original message listener.
    mockEventSource!.simulateMessage("hello");
    expect(onMessage).toHaveBeenCalledWith("hello", expect.anything());
  });

  it("does not deliver named events for unsubscribed names", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const app = new App(TestComponent);
    appInstances.push(app);
    const mercure = new Mercure(app);
    const namedHandler = vi.fn();

    mercure.on("sse:named", namedHandler);

    mercure.subscribe({
      hubUrl: "https://example.com/.well-known/mercure",
      events: ["notification"],
    });

    mockEventSource!.simulateOpen();
    mockEventSource!.simulateNamed("sidebar", "ignored");

    expect(namedHandler).not.toHaveBeenCalled();
  });
});
