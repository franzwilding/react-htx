import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { App } from "../src";
import { ReactNode, act } from "react";
import { useRouter } from "../src/provider/RouterProvider";
import { ScrollRestoration } from "../src/ScrollRestoration";

function testComponent({ is, children }: { is: string; children: ReactNode }) {
  const { loading } = useRouter();
  return (
    <pre data-is={is} data-loading={loading}>
      {children}
    </pre>
  );
}

const createFetchMock = (html: string) =>
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      redirected: false,
      url: "/api/data",
      text: () => Promise.resolve(html),
    }),
  );

const responseHtml = `<div id="reactolith-app" data-testid="reactolith-app">
  <my-component>Bar</my-component>
  <a href="/page">Link</a>
</div>`;

describe("Router scroll restoration", () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    history.replaceState(null, "");
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("scrolls to top after forward navigation (navigate)", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.navigate("/page");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  it("scrolls to top after forward navigation (link click)", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
      <a href="/page">Link</a>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    // Use the same reliable pattern as Router.links.test.tsx
    const link = root.querySelector("a")!;
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    Object.defineProperty(clickEvent, "target", { value: link });
    await app.router.onClick(clickEvent);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  it("does not scroll to top when link has data-scroll='preserve'", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
      <a href="/page" data-scroll="preserve">Link</a>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    const link = root.querySelector("a")!;
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    Object.defineProperty(clickEvent, "target", { value: link });
    await app.router.onClick(clickEvent);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // scrollTo should not be called for "preserve"
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("does not scroll to top when form has data-scroll='preserve'", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
      <form action="/search" method="GET" data-scroll="preserve">
        <input type="text" name="q" default-value="test" read-only />
        <button type="submit">Go</button>
      </form>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    const root = await screen.findByTestId("reactolith-app");
    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    const form = root.querySelector("form")!;
    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    }) as SubmitEvent;
    Object.defineProperty(submitEvent, "target", { value: form });
    Object.defineProperty(submitEvent, "submitter", { value: null });
    await app.router.onSubmit(submitEvent);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("navigate with { scroll: 'preserve' } does not scroll", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.navigate("/page", { scroll: "preserve" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("stores restorationId in history.state on push", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    // Initial entry should have a restorationId (set by ScrollRestoration constructor)
    expect(history.state).toHaveProperty("restorationId");
    const initialId = history.state.restorationId;

    await app.router.navigate("/page");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // After navigation, history.state should have a new restorationId
    expect(history.state).toHaveProperty("restorationId");
    expect(history.state.restorationId).not.toBe(initialId);
  });

  it("restores scroll position on pop navigation (back)", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    // Simulate scroll position on initial page
    Object.defineProperty(window, "scrollX", {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 500,
      writable: true,
      configurable: true,
    });

    const initialId = history.state.restorationId;

    // Navigate forward (push)
    await app.router.navigate("/page");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    scrollToSpy.mockClear();

    // Simulate pop (back): visit with pushState=false and the old restorationId
    history.replaceState({ restorationId: initialId }, "");
    await app.router.visit("/original", { method: "GET" }, false);

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith(0, 500);
    });
  });

  it("scrolls to hash element when URL contains #fragment", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    // First set up a target element in the document
    const target = document.createElement("div");
    target.id = "target";
    document.body.appendChild(target);
    const scrollIntoViewSpy = vi.fn();
    target.scrollIntoView = scrollIntoViewSpy;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    // Navigate to a URL with hash - test via visit() directly
    await app.router.visit("/page#target", { method: "GET" }, true);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Hash element scroll takes priority over scroll-to-top
    expect(scrollIntoViewSpy).toHaveBeenCalled();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("falls back to scroll-to-top when hash element is not found", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.visit("/page#nonexistent", { method: "GET" }, true);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  it("does not scroll when render fails", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    // Return HTML without reactolith-app → render fails
    const fetchMock = createFetchMock(`<div id="other">Bar</div>`);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    scrollToSpy.mockClear();

    await app.router.visit("/page", { method: "GET" }, true);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // No scrolling should happen on failed render
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("uses data-scroll-container for explicit scroll container", async () => {
    const scrollDiv = document.createElement("div");
    scrollDiv.id = "main-scroll";
    scrollDiv.style.overflowY = "auto";
    scrollDiv.style.height = "100vh";
    document.body.appendChild(scrollDiv);

    scrollDiv.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app"
      data-scroll-container="#main-scroll">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(
      `<div id="reactolith-app" data-testid="reactolith-app"
        data-scroll-container="#main-scroll">
        <my-component>Bar</my-component>
      </div>`,
    );
    global.fetch = fetchMock as any;

    const scrollElSpy = vi.fn();
    scrollDiv.scrollTo = scrollElSpy;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.navigate("/page");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(scrollElSpy).toHaveBeenCalledWith(0, 0);
    });

    // window.scrollTo should NOT have been called
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("auto-detects scroll container from DOM", async () => {
    const scrollDiv = document.createElement("div");
    scrollDiv.id = "auto-scroller";
    scrollDiv.style.overflowY = "auto";
    scrollDiv.style.height = "100vh";
    document.body.appendChild(scrollDiv);

    scrollDiv.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const scrollElSpy = vi.fn();
    scrollDiv.scrollTo = scrollElSpy;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.navigate("/page");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(scrollElSpy).toHaveBeenCalledWith(0, 0);
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("saves scroll position before navigation begins", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    Object.defineProperty(window, "scrollX", {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 777,
      writable: true,
      configurable: true,
    });

    const savedId = history.state.restorationId;

    // Push navigation
    await app.router.navigate("/page");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    scrollToSpy.mockClear();

    // Simulate back navigation - position should be restored
    history.replaceState({ restorationId: savedId }, "");
    await app.router.visit("/original", { method: "GET" }, false);

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith(0, 777);
    });
  });

  it("visit with explicit scroll='top' scrolls to top", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.visit("/page", { method: "GET" }, true, "top");

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  it("navigate({ replace: true }) calls history.replaceState (not pushState)", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    const pushSpy = vi.spyOn(history, "pushState");
    const replaceSpy = vi.spyOn(history, "replaceState");

    const initialLength = history.length;
    const initialId = history.state.restorationId;

    await app.router.navigate("/dashboard", { replace: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
    // history length is unchanged when replacing
    expect(history.length).toBe(initialLength);
    // restorationId rotated even though we replaced
    expect(history.state.restorationId).not.toBe(initialId);

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it("navigate({ replace: true }) updates the URL to the final URL", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    const replaceSpy = vi.spyOn(history, "replaceState");

    await app.router.navigate("/dashboard", { replace: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Verify replaceState was called with the target URL
    const lastCall = replaceSpy.mock.calls[replaceSpy.mock.calls.length - 1];
    expect(lastCall[2]).toBe("/dashboard");

    replaceSpy.mockRestore();
  });

  it("navigate({ replace: true, scroll: 'preserve' }) does not scroll", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.navigate("/list?q=x", {
      replace: true,
      scroll: "preserve",
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("navigate({ replace: true }) scrolls to top by default", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    await app.router.navigate("/dashboard", { replace: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  it("replaced entry is not reachable via Back: its scroll position is gone", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    // Pretend the user scrolled the original entry to y=600 before we
    // replace it.
    Object.defineProperty(window, "scrollX", {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 600,
      writable: true,
      configurable: true,
    });

    const originalId = history.state.restorationId;

    await app.router.navigate("/replacement", { replace: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    scrollToSpy.mockClear();

    // Simulate something forcing currentId back to the original id (this
    // can't happen via real Back since the entry was replaced — we do it
    // here to prove the saved position was discarded).
    history.replaceState({ restorationId: originalId }, "");
    await app.router.visit("/replacement", { method: "GET" }, false);

    // No saved position for originalId → no scroll restoration happens.
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("visit() with replace=true forwards to history.replaceState", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = createFetchMock(responseHtml);
    global.fetch = fetchMock as any;

    const app = new App(testComponent);
    await act(async () => {});

    const pushSpy = vi.spyOn(history, "pushState");
    const replaceSpy = vi.spyOn(history, "replaceState");

    await app.router.visit("/page", { method: "GET" }, true, undefined, true);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it("popstate followed by a failed visit does not corrupt scroll-state ids", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
      <my-component>Foo</my-component>
    </div>`;

    const fetchMock = vi
      .fn()
      // 1) Forward push to /b succeeds
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          redirected: false,
          url: "/b",
          text: () => Promise.resolve(responseHtml),
        }),
      )
      // 2) Popstate-triggered visit back to /a fails (network error)
      .mockImplementationOnce(() => Promise.reject(new Error("network down")))
      // 3) Subsequent successful back-navigation to /a
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          redirected: false,
          url: "/a",
          text: () => Promise.resolve(responseHtml),
        }),
      );
    global.fetch = fetchMock as any;

    const popSpy = vi.spyOn(ScrollRestoration.prototype, "pop");

    const app = new App(testComponent);
    await act(async () => {});

    // Simulate scroll position on /a *before* leaving it.
    Object.defineProperty(window, "scrollX", {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 250,
      writable: true,
      configurable: true,
    });

    const aId = history.state.restorationId;

    // Forward push: ScrollRestoration saves y=250 against aId, advances
    // currentId to a fresh bId.
    await app.router.navigate("/b");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(popSpy).not.toHaveBeenCalled();
    scrollToSpy.mockClear();

    // Browser pops back to /a — the previous history entry's state still
    // carries aId.
    history.replaceState({ restorationId: aId }, "");

    // Simulate the user having scrolled to top on /b before the failed
    // back-navigation. This makes the assertion below sensitive to the
    // bug: if pop() were wrongly called on failure, currentId would
    // already be aId by the time the *successful* retry runs save(),
    // which would overwrite aId's saved y=250 with the current y=0.
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });

    await expect(
      app.router.visit("/a", { method: "GET" }, false),
    ).rejects.toThrow("network down");

    // Failure path must not have triggered scroll restoration.
    expect(popSpy).not.toHaveBeenCalled();
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Successful retry: pop() runs exactly once, currentId resyncs with
    // history.state.restorationId === aId, and the original scroll
    // position is restored.
    await app.router.visit("/a", { method: "GET" }, false);

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith(0, 250);
    });
    expect(popSpy).toHaveBeenCalledTimes(1);

    popSpy.mockRestore();
  });
});
