import { screen, waitFor } from "@testing-library/dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { App } from "../src";
import { ReactNode, act } from "react";
import { useRouter } from "../src/provider/RouterProvider";

function testComponent({ is, children }: { is: string; children: ReactNode }) {
  const { loading } = useRouter();
  return (
    <pre data-is={is} data-loading={loading}>
      {children}
    </pre>
  );
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const responseFor = (html: string, url = "/api/data") => ({
  ok: true,
  redirected: false,
  url,
  text: () => Promise.resolve(html),
});

const htmlWith = (label: string) =>
  `<div id="reactolith-app" data-testid="reactolith-app">
  <my-component>${label}</my-component>
</div>`;

describe("Router overlapping visit() calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    history.replaceState(null, "");
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("the second of two overlapping visit() calls wins", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const slow = deferred<Response>();

    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_input, init: RequestInit | undefined) => {
        // First call: slow promise that rejects when its signal aborts.
        const signal = init?.signal;
        signal?.addEventListener("abort", () => {
          slow.reject(new DOMException("Aborted", "AbortError"));
        });
        return slow.promise;
      })
      .mockImplementationOnce(() =>
        Promise.resolve(responseFor(htmlWith("B"), "/b")),
      );
    global.fetch = fetchMock as never;

    const app = new App(testComponent);
    await act(async () => {});

    const a = app.router.visit("/a");
    const b = app.router.visit("/b");

    // Resolve the slow first response *after* the second visit started.
    // Because /a was aborted by /b, this resolution should be ignored —
    // /b's content must end up on the page.
    slow.resolve(responseFor(htmlWith("A"), "/a") as unknown as Response);

    const [resA, resB] = await Promise.all([a, b]);

    expect(resA.cancelled).toBe(true);
    expect(resA.result).toBe(false);
    expect(resB.cancelled).toBeFalsy();
    expect(resB.result).toBe(true);

    await waitFor(() => {
      const root = screen.getByTestId("reactolith-app");
      expect(root).toHaveTextContent("B");
    });

    expect(document.querySelector("#reactolith-app")?.textContent).toContain(
      "B",
    );
    expect(
      document.querySelector("#reactolith-app")?.textContent,
    ).not.toContain("A");
  });

  it("emits nav:cancelled (not nav:error) when a visit is superseded", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const slow = deferred<Response>();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_input, init: RequestInit | undefined) => {
        init?.signal?.addEventListener("abort", () => {
          slow.reject(new DOMException("Aborted", "AbortError"));
        });
        return slow.promise;
      })
      .mockImplementationOnce(() =>
        Promise.resolve(responseFor(htmlWith("B"), "/b")),
      );
    global.fetch = fetchMock as never;

    const app = new App(testComponent);
    await act(async () => {});

    const cancelled = vi.fn();
    const error = vi.fn();
    const ended = vi.fn();
    app.router.on("nav:cancelled", cancelled);
    app.router.on("nav:error", error);
    app.router.on("nav:ended", ended);

    const a = app.router.visit("/a");
    const b = app.router.visit("/b");

    await Promise.all([a, b]);

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(cancelled).toHaveBeenCalledWith("/a", expect.any(Object), true);
    expect(error).not.toHaveBeenCalled();
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended.mock.calls[0][0]).toBe("/b");
  });

  it("does not surface a superseded visit as an unhandled rejection", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Initial</my-component>
    </div>`;

    const slow = deferred<Response>();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_input, init: RequestInit | undefined) => {
        init?.signal?.addEventListener("abort", () => {
          slow.reject(new DOMException("Aborted", "AbortError"));
        });
        return slow.promise;
      })
      .mockImplementationOnce(() =>
        Promise.resolve(responseFor(htmlWith("B"), "/b")),
      );
    global.fetch = fetchMock as never;

    const unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);

    try {
      const app = new App(testComponent);
      await act(async () => {});

      const a = app.router.visit("/a");
      const b = app.router.visit("/b");
      await Promise.all([a, b]);

      // Allow microtasks to settle so any stray rejection has a chance to fire.
      await new Promise((r) => setTimeout(r, 50));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("unhandledrejection", unhandled);
    }
  });
});
