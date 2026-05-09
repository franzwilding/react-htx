import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { App } from "../src";
import { ReactNode, act } from "react";
import { useRouter } from "../src/provider/RouterProvider";

function testComponent({ is, children }: { is: string; children: ReactNode }) {
  const { loading, lastError, clearError } = useRouter();
  return (
    <pre
      data-is={is}
      data-loading={loading}
      data-error={lastError ? "true" : "false"}
    >
      {children}
    </pre>
  );
}

const createFetchMock = (html: string, ok = true) =>
  vi.fn(() =>
    Promise.resolve({
      ok,
      redirected: false,
      url: "/api/data",
      text: () => Promise.resolve(html),
    }),
  );

describe("Router event system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits nav:started and nav:ended events", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
      <a href="/api/data">Link</a>
    </div>`;

    const fetchMock =
      createFetchMock(`<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Bar</my-component>
    </div>`);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    const startHandler = vi.fn();
    const endHandler = vi.fn();

    app.router.on("nav:started", startHandler);
    app.router.on("nav:ended", endHandler);

    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    await fireEvent.click(root.querySelector("a")!);

    await waitFor(() => {
      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(endHandler).toHaveBeenCalledTimes(1);
    });

    expect(startHandler).toHaveBeenCalledWith(
      "/api/data",
      { method: "GET" },
      true,
    );
  });

  it("emits render:success on successful render", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock =
      createFetchMock(`<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Bar</my-component>
    </div>`);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    const successHandler = vi.fn();

    app.router.on("render:success", successHandler);

    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    // Use navigate directly instead of clicking a link
    await app.router.navigate("/api/data");

    await waitFor(() => {
      expect(successHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("emits render:failed when root element is not found", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    // Return HTML without the reactolith-app element
    const fetchMock = createFetchMock(`<div id="other-app">
      <my-component>Bar</my-component>
    </div>`);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    const failedHandler = vi.fn();

    app.router.on("render:failed", failedHandler);

    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    // Use navigate directly
    await app.router.navigate("/api/data");

    await waitFor(() => {
      expect(failedHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("can unsubscribe from events using off()", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock =
      createFetchMock(`<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Bar</my-component>
    </div>`);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    const handler = vi.fn();

    app.router.on("nav:started", handler);
    app.router.off("nav:started", handler);

    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    // Use navigate directly
    await app.router.navigate("/api/data");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("can unsubscribe using returned cleanup function", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock =
      createFetchMock(`<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Bar</my-component>
    </div>`);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    const handler = vi.fn();

    const unsubscribe = app.router.on("nav:started", handler);
    unsubscribe();

    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    // Use navigate directly
    await app.router.navigate("/api/data");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("emits nav:error and resets loading + surfaces error when fetch rejects", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchError = new Error("network down");
    const fetchMock = vi.fn(() => Promise.reject(fetchError));
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    const startHandler = vi.fn();
    const endHandler = vi.fn();
    const errorHandler = vi.fn();

    app.router.on("nav:started", startHandler);
    app.router.on("nav:ended", endHandler);
    app.router.on("nav:error", errorHandler);

    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    await act(async () => {
      await expect(app.router.navigate("/api/data")).rejects.toBe(fetchError);
    });

    expect(startHandler).toHaveBeenCalledTimes(1);
    expect(endHandler).not.toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith(
      "/api/data",
      { method: "GET" },
      true,
      fetchError,
    );

    // RouterProvider must reset its loading flag and surface the error
    // via `lastError`, even though `nav:ended` never fired.
    await waitFor(() => {
      expect(root.querySelector("pre")).toHaveAttribute("data-error", "true");
    });
    expect(root.querySelector("pre")).toHaveAttribute("data-loading", "false");
  });

  it("does not bubble unhandled rejections from navigations on fetch error", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    global.fetch = fetchMock as any;

    const unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);

    try {
      const app = new App(testComponent);
      await act(async () => {});

      const root = await screen.findByTestId("reactolith-app");
      await waitFor(() => {
        expect(root.querySelector("pre")).not.toBeNull();
      });

      // Simulate a popstate-style internal navigation (which the
      // router's bound handler triggers via `void this.visit(...)`).
      // The bound handler must swallow the rejection so consumers
      // never see an `unhandledrejection`.
      const win = document.defaultView!;
      win.dispatchEvent(new win.PopStateEvent("popstate"));

      // Wait long enough for the rejection's microtask to settle.
      await new Promise((r) => setTimeout(r, 50));

      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("unhandledrejection", unhandled);
    }
  });

  it("handles redirects correctly", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        redirected: true,
        url: "/redirected/path",
        text: () =>
          Promise.resolve(`<div id="reactolith-app" data-testid="reactolith-app">
          <my-component>Redirected</my-component>
        </div>`),
      }),
    );
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    const endHandler = vi.fn();

    app.router.on("nav:ended", endHandler);

    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    // Use navigate directly
    await app.router.navigate("/api/data");

    await waitFor(() => {
      expect(endHandler).toHaveBeenCalledTimes(1);
      // finalUrl should be the redirected URL
      expect(endHandler.mock.calls[0][5]).toBe("/redirected/path");
    });
  });
});
