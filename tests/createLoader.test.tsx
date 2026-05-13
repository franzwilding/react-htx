import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/dom";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { createLoader } from "../src/createLoader";

async function renderLoader(
  Loader: React.ElementType<{ is: string; [key: string]: unknown }>,
  is: string,
  children?: React.ReactNode,
): Promise<{ container: HTMLElement; root: Root }> {
  const container = document.createElement("div");
  container.setAttribute("data-testid", "container");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Loader is={is}>{children}</Loader>);
  });
  return { container, root };
}

describe("createLoader", () => {
  it("resolves a tag to a named export by PascalCase conversion", async () => {
    const Loader = createLoader({
      modules: {
        "/src/components/ui/button.tsx": () =>
          Promise.resolve({
            Button: ({ children }: { children?: React.ReactNode }) => (
              <button data-testid="resolved-button">{children}</button>
            ),
          }),
      },
      prefix: "ui-",
    });

    await renderLoader(Loader, "ui-button", "Click me");

    await waitFor(() => {
      expect(screen.getByTestId("resolved-button")).toBeInTheDocument();
    });
    expect(screen.getByTestId("resolved-button")).toHaveTextContent("Click me");
  });

  it("falls back to a parent file for nested kebab names", async () => {
    const Loader = createLoader({
      modules: {
        "/src/components/ui/accordion.tsx": () =>
          Promise.resolve({
            Accordion: () => <div data-testid="acc">acc</div>,
            AccordionItem: () => <div data-testid="acc-item">item</div>,
          }),
      },
      prefix: "ui-",
    });

    await renderLoader(Loader, "ui-accordion-item");

    await waitFor(() => {
      expect(screen.getByTestId("acc-item")).toBeInTheDocument();
    });
  });

  it("uses default export when present", async () => {
    const Loader = createLoader({
      modules: {
        "/src/components/my-thing.tsx": () =>
          Promise.resolve({
            default: ({ children }: { children?: React.ReactNode }) => (
              <div data-testid="resolved-default">{children}</div>
            ),
          }),
      },
    });

    await renderLoader(Loader, "my-thing", "hello");

    await waitFor(() => {
      expect(screen.getByTestId("resolved-default")).toBeInTheDocument();
    });
  });

  it("supports multiple module maps with priority order", async () => {
    const Loader = createLoader({
      modules: [
        {
          "/src/components/custom/button.tsx": () =>
            Promise.resolve({
              default: () => <span data-testid="custom-button">custom</span>,
            }),
        },
        {
          "/src/components/ui/button.tsx": () =>
            Promise.resolve({
              Button: () => <button data-testid="shadcn-button">shadcn</button>,
            }),
        },
      ],
      prefix: "ui-",
    });

    await renderLoader(Loader, "ui-button");

    await waitFor(() => {
      expect(screen.getByTestId("custom-button")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("shadcn-button")).toBeNull();
  });

  it("works without a prefix", async () => {
    const Loader = createLoader({
      modules: {
        "/src/components/card.tsx": () =>
          Promise.resolve({
            Card: () => <section data-testid="card">card</section>,
            CardHeader: () => <header data-testid="card-header">header</header>,
          }),
      },
    });

    await renderLoader(Loader, "card-header");

    await waitFor(() => {
      expect(screen.getByTestId("card-header")).toBeInTheDocument();
    });
  });

  it("invokes onMissing for unknown components", async () => {
    const Missing = ({ is }: { is?: string }) => (
      <span data-testid="missing">missing:{is}</span>
    );
    const Loader = createLoader({
      modules: {
        "/src/components/ui/button.tsx": () =>
          Promise.resolve({
            Button: () => <button>btn</button>,
          }),
      },
      prefix: "ui-",
      onMissing: () => Missing,
    });

    await renderLoader(Loader, "ui-unknown");

    await waitFor(() => {
      expect(screen.getByTestId("missing")).toBeInTheDocument();
    });
    expect(screen.getByTestId("missing")).toHaveTextContent(
      "missing:ui-unknown",
    );
  });

  it("retries a failed lazy load on the next render", async () => {
    let attempts = 0;
    const loader = () => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new Error("network down"));
      }
      return Promise.resolve({
        Flaky: () => <div data-testid="flaky-resolved">flaky</div>,
      });
    };

    const Loader = createLoader({
      modules: {
        "/src/components/ui/flaky.tsx": loader,
      },
      prefix: "ui-",
    });

    type BoundaryState = { error: Error | null };
    type BoundaryProps = { children: React.ReactNode };
    class Boundary extends React.Component<BoundaryProps, BoundaryState> {
      state: BoundaryState = { error: null };
      static getDerivedStateFromError(error: Error): BoundaryState {
        return { error };
      }
      reset = () => this.setState({ error: null });
      render() {
        if (this.state.error) {
          return (
            <button data-testid="retry" onClick={this.reset}>
              {this.state.error.message}
            </button>
          );
        }
        return this.props.children;
      }
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      await act(async () => {
        root.render(
          <Boundary>
            <Loader is="ui-flaky" />
          </Boundary>,
        );
      });

      const retry = await waitFor(() => screen.getByTestId("retry"));
      expect(retry).toHaveTextContent("network down");
      expect(attempts).toBe(1);

      await act(async () => {
        retry.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("flaky-resolved")).toBeInTheDocument();
      });
      expect(attempts).toBe(2);
    } finally {
      consoleError.mockRestore();
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("falls back to a case-insensitive export match", async () => {
    const Loader = createLoader({
      modules: {
        "/src/components/ui/field-label.tsx": () =>
          Promise.resolve({
            // Casing intentionally does not match the kebab→Pascal conversion
            // ("FieldLabel"). The loader should still resolve via the
            // case-insensitive fallback in findExport().
            fieldlabel: ({ children }: { children?: React.ReactNode }) => (
              <span data-testid="case-insensitive">{children}</span>
            ),
          }),
      },
      prefix: "ui-",
    });

    await renderLoader(Loader, "ui-field-label", "label");

    await waitFor(() => {
      expect(screen.getByTestId("case-insensitive")).toBeInTheDocument();
    });
    expect(screen.getByTestId("case-insensitive")).toHaveTextContent("label");
  });

  it("resolves modules whose paths have no extension", async () => {
    const Loader = createLoader({
      // Paths like these come up when bundlers strip extensions in import maps.
      modules: {
        "/src/components/ui/widget": () =>
          Promise.resolve({
            Widget: () => <div data-testid="extensionless">widget</div>,
          }),
      },
      prefix: "ui-",
    });

    await renderLoader(Loader, "ui-widget");

    await waitFor(() => {
      expect(screen.getByTestId("extensionless")).toBeInTheDocument();
    });
  });

  it("throws when onMissing returns null", async () => {
    const Loader = createLoader({
      modules: {
        "/src/components/ui/button.tsx": () =>
          Promise.resolve({
            Button: () => <button>btn</button>,
          }),
      },
      prefix: "ui-",
      onMissing: () => null,
    });

    type BoundaryState = { error: Error | null };
    type BoundaryProps = { children: React.ReactNode };
    class Boundary extends React.Component<BoundaryProps, BoundaryState> {
      state: BoundaryState = { error: null };
      static getDerivedStateFromError(error: Error): BoundaryState {
        return { error };
      }
      render() {
        if (this.state.error) {
          return <span data-testid="boundary">{this.state.error.message}</span>;
        }
        return this.props.children;
      }
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      await act(async () => {
        root.render(
          <Boundary>
            <Loader is="ui-unknown" />
          </Boundary>,
        );
      });

      const boundary = await waitFor(() => screen.getByTestId("boundary"));
      expect(boundary.textContent).toContain("Could not resolve component");
      expect(boundary.textContent).toContain("unknown");
    } finally {
      consoleError.mockRestore();
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("ignores non-component object exports when resolving", async () => {
    // A module that exports a co-located plain config object whose name
    // happens to match the requested tag. Without the `$$typeof` brand check
    // the loader used to return this object as a component, which then crashed
    // deep inside React.createElement — see issue #59.
    const Loader = createLoader({
      modules: {
        "/src/components/my-config.tsx": () =>
          Promise.resolve({
            MyConfig: { foo: 1, bar: "baz" },
          }),
      },
    });

    type BoundaryState = { error: Error | null };
    type BoundaryProps = { children: React.ReactNode };
    class Boundary extends React.Component<BoundaryProps, BoundaryState> {
      state: BoundaryState = { error: null };
      static getDerivedStateFromError(error: Error): BoundaryState {
        return { error };
      }
      render() {
        if (this.state.error) {
          return <span data-testid="boundary">{this.state.error.message}</span>;
        }
        return this.props.children;
      }
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      await act(async () => {
        root.render(
          <Boundary>
            <Loader is="my-config" />
          </Boundary>,
        );
      });

      const boundary = await waitFor(() => screen.getByTestId("boundary"));
      expect(boundary.textContent).toContain("Could not resolve component");
      expect(boundary.textContent).toContain("my-config");
    } finally {
      consoleError.mockRestore();
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("resolves forwardRef components", async () => {
    const ForwardedButton = React.forwardRef<
      HTMLButtonElement,
      { children?: React.ReactNode }
    >(({ children }, ref) => (
      <button ref={ref} data-testid="forwarded-button">
        {children}
      </button>
    ));
    ForwardedButton.displayName = "ForwardedButton";

    const Loader = createLoader({
      modules: {
        "/src/components/ui/button.tsx": () =>
          Promise.resolve({
            Button: ForwardedButton,
          }),
      },
      prefix: "ui-",
    });

    await renderLoader(Loader, "ui-button", "Click me");

    await waitFor(() => {
      expect(screen.getByTestId("forwarded-button")).toBeInTheDocument();
    });
    expect(screen.getByTestId("forwarded-button")).toHaveTextContent(
      "Click me",
    );
  });

  it("resolves memo components", async () => {
    const MemoCard = React.memo(({ label }: { label?: string }) => (
      <div data-testid="memo-card">{label}</div>
    ));
    MemoCard.displayName = "MemoCard";

    const Loader = createLoader({
      modules: {
        "/src/components/card.tsx": () =>
          Promise.resolve({
            Card: MemoCard,
          }),
      },
    });

    await renderLoader(Loader, "card");
    // re-render with a label prop
    const container = screen.getByTestId("memo-card");
    expect(container).toBeInTheDocument();
  });

  it("dispatches to the matching group by prefix", async () => {
    const Loader = createLoader({
      groups: [
        {
          modules: {
            "/src/components/ui/button.tsx": () =>
              Promise.resolve({
                Button: () => <button data-testid="ui-btn">ui</button>,
              }),
          },
          prefix: "ui-",
        },
        {
          modules: {
            "/src/components/flow/node.tsx": () =>
              Promise.resolve({
                Node: () => <div data-testid="flow-node">flow</div>,
              }),
          },
          prefix: "flow-",
        },
      ],
    });

    await renderLoader(Loader, "flow-node");
    await waitFor(() => {
      expect(screen.getByTestId("flow-node")).toBeInTheDocument();
    });

    await renderLoader(Loader, "ui-button");
    await waitFor(() => {
      expect(screen.getByTestId("ui-btn")).toBeInTheDocument();
    });
  });

  it("treats a group without prefix as a catch-all", async () => {
    const Loader = createLoader({
      groups: [
        {
          modules: {
            "/src/components/ui/button.tsx": () =>
              Promise.resolve({
                Button: () => <button data-testid="ui-btn">ui</button>,
              }),
          },
          prefix: "ui-",
        },
        {
          modules: {
            "/src/components/widget.tsx": () =>
              Promise.resolve({
                Widget: () => <div data-testid="catch-all">widget</div>,
              }),
          },
        },
      ],
    });

    await renderLoader(Loader, "widget");
    await waitFor(() => {
      expect(screen.getByTestId("catch-all")).toBeInTheDocument();
    });
  });

  it("calls onMissing when no group prefix matches", async () => {
    const Missing = ({ is }: { is?: string }) => (
      <span data-testid="group-miss">{is}</span>
    );
    const Loader = createLoader({
      groups: [
        {
          modules: {
            "/src/components/ui/button.tsx": () =>
              Promise.resolve({
                Button: () => <button>btn</button>,
              }),
          },
          prefix: "ui-",
        },
      ],
      onMissing: () => Missing,
    });

    await renderLoader(Loader, "flow-node");
    await waitFor(() => {
      expect(screen.getByTestId("group-miss")).toBeInTheDocument();
    });
    expect(screen.getByTestId("group-miss")).toHaveTextContent("flow-node");
  });

  it("rejects mixing `modules` and `groups`", () => {
    expect(() =>
      createLoader({
        modules: {},
        groups: [{ modules: {}, prefix: "ui-" }],
      }),
    ).toThrow(/mutually exclusive/);
  });

  it("renders the fallback while loading and resolves afterwards", async () => {
    let resolveFn: ((m: Record<string, unknown>) => void) | null = null;
    const slow = () =>
      new Promise<Record<string, unknown>>((resolve) => {
        resolveFn = resolve;
      });

    const Loader = createLoader({
      modules: {
        "/src/components/ui/slow.tsx": slow,
      },
      prefix: "ui-",
      fallback: <div data-testid="fallback">loading…</div>,
    });

    await renderLoader(Loader, "ui-slow");

    expect(screen.getByTestId("fallback")).toBeInTheDocument();

    await act(async () => {
      resolveFn!({
        Slow: () => <div data-testid="slow-resolved">slow done</div>,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("slow-resolved")).toBeInTheDocument();
    });
  });
});
