import { screen, waitFor } from "@testing-library/dom";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { App, useMercureEventSource } from "../src";
import React, { useState } from "react";

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

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials || false;
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  simulateMessage(data: string, id?: string) {
    if (this.onmessage) {
      const event = new MessageEvent("message", { data, lastEventId: id });
      this.onmessage(event);
    }
  }
}

describe("useMercureEventSource", () => {
  let eventSourceCalls: Array<[string, any?]> = [];
  let eventSources: MockEventSource[] = [];

  beforeEach(() => {
    eventSourceCalls = [];
    eventSources = [];

    const TrackedEventSource: any = class extends MockEventSource {
      constructor(url: string, options?: { withCredentials?: boolean }) {
        super(url, options);
        eventSources.push(this);
        eventSourceCalls.push([url, options]);
      }
    };
    TrackedEventSource.CONNECTING = 0;
    TrackedEventSource.OPEN = 1;
    TrackedEventSource.CLOSED = 2;

    global.EventSource = TrackedEventSource;
  });

  afterEach(() => {
    eventSources = [];
  });

  it("does NOT reconnect when an inline message callback re-identities on every render", async () => {
    // Re-rendering parent forces a fresh `onMessage` reference into the hook —
    // the regression scenario from the bug report. We must still see only one
    // EventSource instance because callbacks are tracked via refs.
    function Subscriber({ is }: { is: string }) {
      const [_, setTick] = useState(0);
      // Inline callback: a brand-new function on every render.
      useMercureEventSource("/topic", (data) => {
        if (data === "force-rerender") setTick((t) => t + 1);
      });
      return (
        <div data-testid="my-subscriber" data-is={is}>
          ok
        </div>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app">
      <my-subscriber></my-subscriber>
    </div>`;

    const app = new App(Subscriber);
    app.mercureConfig = {
      hubUrl: "https://example.com/.well-known/mercure",
    };

    await screen.findByTestId("my-subscriber");

    await waitFor(() => {
      expect(eventSourceCalls.length).toBe(1);
    });

    eventSources[0].simulateMessage("force-rerender");
    eventSources[0].simulateMessage("force-rerender");
    eventSources[0].simulateMessage("force-rerender");

    // Wait a tick for any potential reconnect to surface.
    await new Promise((r) => setTimeout(r, 20));

    // Still exactly one EventSource — no reconnects from new callback identity.
    expect(eventSourceCalls.length).toBe(1);
  });

  it("delivers messages to the latest callback even after re-renders", async () => {
    let receivedCount = 0;
    function Subscriber({ is }: { is: string }) {
      const [tick, setTick] = useState(0);
      useMercureEventSource("/topic", () => {
        receivedCount += 1;
        setTick((t) => t + 1);
      });
      return (
        <div data-testid="my-subscriber" data-is={is} data-tick={tick}>
          ok
        </div>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app">
      <my-subscriber></my-subscriber>
    </div>`;

    const app = new App(Subscriber);
    app.mercureConfig = {
      hubUrl: "https://example.com/.well-known/mercure",
    };

    await screen.findByTestId("my-subscriber");
    await waitFor(() => expect(eventSources.length).toBe(1));

    eventSources[0].simulateMessage("hello");
    eventSources[0].simulateMessage("world");

    await waitFor(() => expect(receivedCount).toBe(2));
  });

  it("shares a single EventSource between two hooks subscribing to the same topic", async () => {
    let aMessages = 0;
    let bMessages = 0;

    function CompA({ is }: { is: string }) {
      useMercureEventSource("/shared", () => {
        aMessages += 1;
      });
      return <div data-testid="comp-a" data-is={is} />;
    }
    function CompB({ is }: { is: string }) {
      useMercureEventSource("/shared", () => {
        bMessages += 1;
      });
      return <div data-testid="comp-b" data-is={is} />;
    }

    function Wrapper({ is }: { is: string }) {
      if (is === "comp-a") return <CompA is={is} />;
      if (is === "comp-b") return <CompB is={is} />;
      return null;
    }

    document.body.innerHTML = `<div id="reactolith-app">
      <comp-a></comp-a>
      <comp-b></comp-b>
    </div>`;

    const app = new App(Wrapper);
    app.mercureConfig = {
      hubUrl: "https://example.com/.well-known/mercure",
    };

    await screen.findByTestId("comp-a");
    await screen.findByTestId("comp-b");

    // Only one EventSource should exist for the shared topic.
    await waitFor(() => {
      expect(eventSourceCalls.length).toBe(1);
    });
    expect(eventSourceCalls[0][0]).toContain("topic=%2Fshared");

    // A single message should be delivered to both subscribers.
    eventSources[0].simulateMessage("hi");

    await waitFor(() => {
      expect(aMessages).toBe(1);
      expect(bMessages).toBe(1);
    });
  });

  it("closes the shared EventSource only after the last subscriber unmounts", async () => {
    function CompA({ is }: { is: string }) {
      useMercureEventSource("/shared", () => {});
      return <div data-testid="comp-a" data-is={is} />;
    }
    function CompB({ is }: { is: string }) {
      useMercureEventSource("/shared", () => {});
      return <div data-testid="comp-b" data-is={is} />;
    }

    function Wrapper({ is }: { is: string }) {
      if (is === "comp-a") return <CompA is={is} />;
      if (is === "comp-b") return <CompB is={is} />;
      return null;
    }

    document.body.innerHTML = `<div id="reactolith-app">
      <comp-a></comp-a>
      <comp-b></comp-b>
    </div>`;

    const app = new App(Wrapper);
    app.mercureConfig = {
      hubUrl: "https://example.com/.well-known/mercure",
    };

    await screen.findByTestId("comp-a");
    await screen.findByTestId("comp-b");

    await waitFor(() => expect(eventSources.length).toBe(1));
    const source = eventSources[0];

    // Re-render with only `comp-a` — `comp-b` should unmount.
    app.render(`<div id="reactolith-app">
      <comp-a></comp-a>
    </div>`);

    // Source must remain open while `comp-a` still subscribes.
    await new Promise((r) => setTimeout(r, 20));
    expect(source.readyState).not.toBe(MockEventSource.CLOSED);

    // Now drop `comp-a` too — last subscriber gone.
    app.render(`<div id="reactolith-app"></div>`);

    await waitFor(() => {
      expect(source.readyState).toBe(MockEventSource.CLOSED);
    });
  });

  it("survives EventSource errors when no onError callback is provided", async () => {
    // No onError handler is passed: the optional-callback branch must not
    // throw when the underlying EventSource emits an error event.
    function Subscriber({ is }: { is: string }) {
      useMercureEventSource("/topic", () => {});
      return <div data-testid="my-subscriber" data-is={is} />;
    }

    document.body.innerHTML = `<div id="reactolith-app">
      <my-subscriber></my-subscriber>
    </div>`;

    const app = new App(Subscriber);
    app.mercureConfig = {
      hubUrl: "https://example.com/.well-known/mercure",
    };

    await screen.findByTestId("my-subscriber");
    await waitFor(() => expect(eventSources.length).toBe(1));

    // Calling the EventSource error handler must not throw even though
    // the hook was registered without an onError callback.
    expect(() => {
      eventSources[0].onerror?.(new Event("error"));
    }).not.toThrow();
  });

  it("uses app.mercureConfig to build the subscription URL", async () => {
    function Subscriber({ is }: { is: string }) {
      useMercureEventSource("/notifications", () => {});
      return <div data-testid="my-subscriber" data-is={is} />;
    }

    const div = document.createElement("div");
    div.id = "reactolith-app";
    div.setAttribute(
      "data-mercure-hub-url",
      "https://hub.example.com/.well-known/mercure",
    );
    div.setAttribute("data-mercure-with-credentials", "");
    div.innerHTML = "<my-subscriber></my-subscriber>";
    document.body.innerHTML = "";
    document.body.appendChild(div);

    const app = new App(Subscriber);

    await screen.findByTestId("my-subscriber");

    await waitFor(() => {
      const call = eventSourceCalls.find(
        (c) =>
          c[0].includes("hub.example.com") &&
          c[0].includes("topic=%2Fnotifications") &&
          c[1]?.withCredentials === true,
      );
      expect(call).toBeDefined();
    });
  });
});
