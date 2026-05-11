import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { vi } from "vitest";
import { App } from "../src";
import { ReactNode, act } from "react";
import { useRouter } from "../src/provider/RouterProvider";

function TestComponent({ is, children }: { is: string; children: ReactNode }) {
  const { loading } = useRouter();
  return (
    <pre data-is={is} data-loading={loading}>
      {children}
    </pre>
  );
}

describe("Test app router", () => {
  it("clicking on a link should fetch the content", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
<my-component>Foo</my-component>
<a href="/api/data">Link</a>
</div>`;

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(`<div id="reactolith-app" data-testid="reactolith-app">
<my-component>Baa</my-component>
<a href="/api/data">Link</a>
</div>`),
      }),
    );
    global.fetch = fetchMock as any;

    new App(TestComponent);
    const root = await screen.findByTestId("reactolith-app");

    // Give React a tick so the Provider's useEffect subscribes
    await act(async () => {});

    await waitFor(() => {
      expect(root.querySelector("pre")).not.toBeNull();
    });

    expect(root.querySelector("pre")).toHaveTextContent("Foo");
    expect(root.querySelector("pre")).toHaveAttribute("data-loading", "false");

    await fireEvent.click(root.querySelector("a"));

    expect(root.querySelector("pre")).toHaveAttribute("data-loading", "true");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(root.querySelector("pre")).toHaveTextContent("Baa");
    });

    expect(root.querySelector("pre")).toHaveAttribute("data-loading", "false");
    expect(root.querySelector("pre")).toHaveTextContent("Baa");
  });

  it("visit({ replace: true }) replaces the history entry instead of pushing", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
<my-component>Foo</my-component>
</div>`;

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        redirected: false,
        url: "/replaced",
        text: () =>
          Promise.resolve(`<div id="reactolith-app" data-testid="reactolith-app">
<my-component>Replaced</my-component>
</div>`),
      }),
    );
    global.fetch = fetchMock as any;

    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const pushSpy = vi.spyOn(window.history, "pushState");

    const app = new App(TestComponent);
    await screen.findByTestId("reactolith-app");

    await app.router.visit(
      "/replaced",
      { method: "GET" },
      true,
      undefined,
      true,
    );

    expect(replaceSpy).toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();

    replaceSpy.mockRestore();
    pushSpy.mockRestore();
  });

  it("visit() accepts a URL object (not just a string) as input", async () => {
    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app">
<my-component>Foo</my-component>
</div>`;

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        redirected: false,
        url: "http://localhost:3000/from-url",
        text: () =>
          Promise.resolve(`<div id="reactolith-app" data-testid="reactolith-app">
<my-component>From URL</my-component>
</div>`),
      }),
    );
    global.fetch = fetchMock as any;

    const app = new App(TestComponent);
    const root = await screen.findByTestId("reactolith-app");

    const url = new URL("http://localhost:3000/from-url");
    const result = await app.router.visit(url, { method: "GET" }, true);

    expect(result.result).toBe(true);
    // Underlying fetch must receive the URL itself.
    expect(fetchMock.mock.calls[0][0]).toBe(url);
    await waitFor(() => {
      expect(root.querySelector("pre")).toHaveTextContent("From URL");
    });
  });
});
