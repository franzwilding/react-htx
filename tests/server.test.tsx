import { describe, it, expect } from "vitest";
import { renderToString } from "../src/server";

function TestComponent({
  is,
  children,
  variant,
}: {
  is: string;
  children?: React.ReactNode;
  variant?: string;
}) {
  return (
    <pre data-is={is} data-variant={variant ?? ""}>
      {children}
    </pre>
  );
}

describe("renderToString", () => {
  it("renders reactolith elements to an HTML string", () => {
    document.body.innerHTML = `<div id="root">
      <my-component variant="primary">Hello SSR</my-component>
    </div>`;
    const root = document.getElementById("root")!;

    const html = renderToString(root, TestComponent);

    expect(html).toContain("Hello SSR");
    expect(html).toContain('data-is="my-component"');
    expect(html).toContain('data-variant="primary"');
  });

  it("renders multiple top-level elements", () => {
    document.body.innerHTML = `<div id="root">
      <my-component>One</my-component>
      <my-component>Two</my-component>
    </div>`;
    const root = document.getElementById("root")!;

    const html = renderToString(root, TestComponent);

    expect(html).toContain("One");
    expect(html).toContain("Two");
  });

  it("does not throw without a global document when ownerDocument is set", () => {
    document.body.innerHTML = `<div id="root">
      <my-component>Hi</my-component>
    </div>`;
    const root = document.getElementById("root")!;

    expect(() => renderToString(root, TestComponent)).not.toThrow();
  });
});
