import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "../src/server";

function TestComponent({
  is,
  children,
}: {
  is: string;
  children?: React.ReactNode;
}) {
  return <pre data-is={is}>{children}</pre>;
}

describe("renderToString with fragment placeholders", () => {
  it("renders the skeleton of a placeholder, without the attribute", () => {
    document.body.innerHTML = `<div id="root">
      <ui-skeleton data-fragment="chart" data-size="lg">loading…</ui-skeleton>
    </div>`;
    const root = document.getElementById("root")!;

    // On the server there is no "later": a placeholder renders its skeleton.
    const html = renderToString(root, TestComponent);

    expect(html).toContain("loading…");
    expect(html).toContain('data-is="ui-skeleton"');
    expect(html).not.toContain("data-fragment");
  });
});
