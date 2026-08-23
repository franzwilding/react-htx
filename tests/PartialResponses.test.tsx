import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReactNode, act, useState } from "react";
import { App, FRAGMENTS_CONTENT_TYPE, SHELL_END } from "../src";
import { Form, useFormSubmitting } from "../src/form";

function SubmitProbe() {
  const submitting = useFormSubmitting();
  return <span data-testid="submitting">{String(submitting)}</span>;
}

function TestComponent({ is, children }: { is: string; children?: ReactNode }) {
  const [count, setCount] = useState(0);
  if (is === "ui-form") {
    return (
      <Form action="/submit" method="POST" data-testid="form">
        <SubmitProbe />
        <button type="submit">Go</button>
        {children}
      </Form>
    );
  }
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

const PAGE = `<div id="reactolith-app" data-testid="root">
<ui-one>one</ui-one>
<ui-badge data-fragment="unread">0</ui-badge>
<ui-two>two</ui-two>
<ui-form></ui-form>
<a href="/other">Link</a>
</div>`;

const UNREAD = `<template data-fragment="unread"><ui-badge>7</ui-badge></template>`;

function fragmentsResponse(html = UNREAD, url = "/dashboard") {
  return {
    ok: true,
    redirected: false,
    url,
    headers: new Headers({
      "content-type": `${FRAGMENTS_CONTENT_TYPE}; charset=utf-8`,
    }),
    text: () => Promise.resolve(html),
  } as unknown as Response;
}

function pageResponse(html: string, url = "/other") {
  return {
    ok: true,
    redirected: false,
    url,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: () => Promise.resolve(html),
  } as unknown as Response;
}

const apps: App[] = [];

function mount(
  fetchImpl: unknown,
  options: { streaming?: boolean; sendFragmentNames?: boolean } = {
    streaming: true,
  },
): App {
  const app = new App(
    TestComponent,
    undefined,
    undefined,
    undefined,
    undefined,
    fetchImpl as typeof fetch,
    options,
  );
  apps.push(app);
  return app;
}

function headersOf(mock: { mock: { calls: unknown[][] } }, call = 0): Headers {
  return (mock.mock.calls[call][1] as RequestInit).headers as Headers;
}

/** Mount, and wait for React's first commit — the server's own `<a>` is
 * detached by then, so links have to be queried again afterwards. */
async function mounted(app: App): Promise<HTMLElement> {
  const root = await screen.findByTestId("root");
  await waitFor(() =>
    expect(root.querySelector('[data-is="ui-one"]')).not.toBeNull(),
  );
  await act(async () => {});
  return root;
}

beforeEach(() => {
  document.body.innerHTML = PAGE;
  window.history.replaceState(null, "", "/dashboard");
});

afterEach(() => {
  while (apps.length) apps.pop()!.destroy();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("request headers", () => {
  it("sends them on every navigation path", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(pageResponse(PAGE)));
    const app = mount(fetchMock);
    const root = await mounted(app);

    // 1. navigate()
    await act(async () => {
      await app.router.navigate("/from-navigate");
    });

    // 2. link click
    await act(async () => {
      fireEvent.click(root.querySelector("a")!);
    });

    // 3. form submit
    await act(async () => {
      fireEvent.submit(screen.getByTestId("form"));
    });

    // 4. popstate
    await act(async () => {
      window.history.pushState(null, "", "/popped");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (let call = 0; call < 4; call++) {
      const headers = headersOf(fetchMock, call);
      expect(headers.get("X-Reactolith")).toBe("1");
      expect(headers.get("X-Reactolith-From")).toBeTruthy();
      expect(headers.get("Accept")).toContain(FRAGMENTS_CONTENT_TYPE);
    }
  });

  it("reports the page the request starts on, and updates afterwards", async () => {
    const fetchMock = vi.fn((input: unknown) =>
      Promise.resolve(pageResponse(PAGE, String(input))),
    );
    const app = mount(fetchMock);
    await mounted(app);

    await act(async () => {
      await app.router.navigate("/first");
    });
    expect(headersOf(fetchMock, 0).get("X-Reactolith-From")).toBe("/dashboard");

    await act(async () => {
      await app.router.navigate("/second");
    });
    expect(headersOf(fetchMock, 1).get("X-Reactolith-From")).toBe("/first");
  });

  it("never overwrites a header the caller passed", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(pageResponse(PAGE)));
    const app = mount(fetchMock);
    await mounted(app);

    await act(async () => {
      await app.router.visit("/custom", {
        method: "GET",
        headers: { Accept: "text/html", "X-Reactolith-From": "/elsewhere" },
      });
    });

    const headers = headersOf(fetchMock);
    expect(headers.get("Accept")).toBe("text/html");
    expect(headers.get("X-Reactolith-From")).toBe("/elsewhere");
    expect(headers.get("X-Reactolith")).toBe("1");
  });

  it("does not invite fragments when streaming is off", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(pageResponse(PAGE)));
    const app = mount(fetchMock, { streaming: false });
    await mounted(app);

    await act(async () => {
      await app.router.navigate("/plain");
    });

    const headers = headersOf(fetchMock);
    expect(headers.has("Accept")).toBe(false);
    expect(headers.get("X-Reactolith")).toBe("1");
    expect(headers.get("X-Reactolith-From")).toBe("/dashboard");
  });

  it("announces the placeholder names only behind the option", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(pageResponse(PAGE)));
    const app = mount(fetchMock);
    await mounted(app);

    await act(async () => {
      await app.router.navigate("/without");
    });
    expect(headersOf(fetchMock).has("X-Reactolith-Fragments")).toBe(false);

    const second = vi.fn(() => Promise.resolve(pageResponse(PAGE)));
    document.body.innerHTML = PAGE;
    const opted = mount(second, { streaming: true, sendFragmentNames: true });
    await waitFor(() =>
      expect(
        document.querySelectorAll('[data-is="ui-badge"]').length,
      ).toBeGreaterThan(0),
    );

    await act(async () => {
      await opted.router.navigate("/with");
    });
    expect(headersOf(second).get("X-Reactolith-Fragments")).toBe("unread");
  });
});

describe("fragments-only responses", () => {
  it("leaves the rest of the page alone", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(fragmentsResponse()));
    const app = mount(fetchMock);
    const root = await mounted(app);

    const one = root.querySelector('[data-is="ui-one"]')!;
    const two = root.querySelector('[data-is="ui-two"]')!;
    await act(async () => {
      fireEvent.click(one);
      fireEvent.click(two);
      fireEvent.click(two);
    });
    expect(one).toHaveAttribute("data-count", "1");
    expect(two).toHaveAttribute("data-count", "2");

    await act(async () => {
      await app.router.navigate("/dashboard");
    });

    expect(root.querySelector('[data-is="ui-badge"]')).toHaveTextContent("7");
    // No page render: same nodes, same state.
    expect(root.querySelector('[data-is="ui-one"]')).toBe(one);
    expect(root.querySelector('[data-is="ui-two"]')).toBe(two);
    expect(one).toHaveAttribute("data-count", "1");
    expect(two).toHaveAttribute("data-count", "2");
  });

  it("applies a payload without the content type as a courtesy", async () => {
    const bare = {
      ok: true,
      redirected: false,
      url: "/dashboard",
      headers: new Headers({ "content-type": "text/html" }),
      text: () => Promise.resolve(UNREAD),
    } as unknown as Response;
    const fetchMock = vi.fn(() => Promise.resolve(bare));
    const app = mount(fetchMock);
    const root = await mounted(app);

    await act(async () => {
      await app.router.navigate("/dashboard");
    });

    expect(root.querySelector('[data-is="ui-badge"]')).toHaveTextContent("7");
  });

  it("adds a history entry only when the final URL differs", async () => {
    const fetchMock = vi.fn((input: unknown) =>
      Promise.resolve(fragmentsResponse(UNREAD, String(input))),
    );
    const pushSpy = vi.spyOn(window.history, "pushState");
    const app = mount(fetchMock);
    await mounted(app);

    await act(async () => {
      await app.router.navigate("/dashboard");
    });
    expect(pushSpy).not.toHaveBeenCalled();

    await act(async () => {
      await app.router.navigate("/elsewhere");
    });
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("never scrolls to top", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const fetchMock = vi.fn(() =>
      Promise.resolve(fragmentsResponse(UNREAD, "/elsewhere")),
    );
    const app = mount(fetchMock);
    await mounted(app);

    await act(async () => {
      // "top" is what the caller asked for — a partial answer overrides it.
      await app.router.navigate("/elsewhere", { scroll: "top" });
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("emits fragments:applied and nav:ended, but not render:success", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(fragmentsResponse()));
    const app = mount(fetchMock);
    await mounted(app);

    const applied = vi.fn();
    const ended = vi.fn();
    const success = vi.fn();
    app.router.on("fragments:applied", applied);
    app.router.on("nav:ended", ended);
    app.router.on("render:success", success);

    let result: unknown;
    await act(async () => {
      result = await app.router.visit("/dashboard");
    });

    expect(applied).toHaveBeenCalledTimes(1);
    expect(applied.mock.calls[0][6]).toEqual(["unread"]);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(result).toMatchObject({ result: true, fragments: ["unread"] });
  });

  it("retries as a full page exactly once when nothing matched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        fragmentsResponse(
          `<template data-fragment="nobody"><ui-x>x</ui-x></template>`,
          "/dashboard",
        ),
      )
      .mockResolvedValue(
        pageResponse(
          `<div id="reactolith-app" data-testid="root"><ui-fresh>fresh</ui-fresh></div>`,
          "/dashboard",
        ),
      );
    const app = mount(fetchMock);
    await mounted(app);

    await act(async () => {
      await app.router.navigate("/dashboard");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(headersOf(fetchMock, 1).get("Accept")).toBe("text/html");
    expect(warn).toHaveBeenCalled();
    expect(
      screen.getByTestId("root").querySelector('[data-is="ui-fresh"]'),
    ).toHaveTextContent("fresh");
  });

  it("cannot be made to loop when the retry answers with fragments too", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        fragmentsResponse(
          `<template data-fragment="nobody"><ui-x>x</ui-x></template>`,
        ),
      ),
    );
    const app = mount(fetchMock);
    await mounted(app);

    let result: unknown;
    await act(async () => {
      result = await app.router.visit("/dashboard");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ result: false, fragments: [] });
  });

  it("still follows a redirect to a whole page", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        redirected: true,
        url: "http://localhost:3000/redirected",
        headers: new Headers({ "content-type": "text/html" }),
        text: () =>
          Promise.resolve(
            `<div id="reactolith-app" data-testid="root"><ui-target>target</ui-target></div>`,
          ),
      } as unknown as Response),
    );
    const app = mount(fetchMock);
    await mounted(app);

    let result: { finalUrl?: string } = {};
    await act(async () => {
      result = (await app.router.visit("/submit", {
        method: "POST",
      })) as { finalUrl?: string };
    });

    expect(result.finalUrl).toBe("http://localhost:3000/redirected");
    expect(
      screen.getByTestId("root").querySelector('[data-is="ui-target"]'),
    ).toHaveTextContent("target");
  });

  it("leaves a submitting form enabled again", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(fragmentsResponse()));
    const app = mount(fetchMock);
    const root = await mounted(app);

    expect(screen.getByTestId("submitting")).toHaveTextContent("false");

    await act(async () => {
      fireEvent.submit(screen.getByTestId("form"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("submitting")).toHaveTextContent("false"),
    );
    expect(root.querySelector('[data-is="ui-badge"]')).toHaveTextContent("7");
  });

  it("never applies fragments in an app that did not ask for them", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(fragmentsResponse()));
    const app = mount(fetchMock, { streaming: false });
    const root = await mounted(app);

    const failed = vi.fn();
    app.router.on("render:failed", failed);

    await act(async () => {
      await app.router.navigate("/dashboard");
    });

    expect(failed).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-is="ui-badge"]')).toHaveTextContent("0");
  });

  it("still treats a streamed page as a page", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        redirected: false,
        url: "/streamed",
        headers: new Headers({ "content-type": "text/html" }),
        body,
      } as unknown as Response),
    );
    const app = mount(fetchMock);
    await mounted(app);

    const visiting = app.router.navigate("/streamed");
    controller.enqueue(
      encoder.encode(
        `<div id="reactolith-app" data-testid="root">
<ui-shell>shell</ui-shell>
<ui-badge data-fragment="unread">0</ui-badge>
</div>${SHELL_END}`,
      ),
    );
    await act(async () => {
      await visiting;
    });

    const root = screen.getByTestId("root");
    expect(root.querySelector('[data-is="ui-shell"]')).toHaveTextContent(
      "shell",
    );
    expect(app.pendingFragments()).toEqual(["unread"]);

    controller.enqueue(encoder.encode(`${UNREAD}<rl-fragment></rl-fragment>`));
    await waitFor(() =>
      expect(root.querySelector('[data-is="ui-badge"]')).toHaveTextContent("7"),
    );
    controller.close();
  });
});
