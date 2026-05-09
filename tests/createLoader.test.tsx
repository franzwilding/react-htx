import { describe, it, expect } from "vitest";
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
              default: () => (
                <span data-testid="custom-button">custom</span>
              ),
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
            CardHeader: () => (
              <header data-testid="card-header">header</header>
            ),
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
    expect(screen.getByTestId("missing")).toHaveTextContent("missing:ui-unknown");
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
