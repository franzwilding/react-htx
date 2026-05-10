// @vitest-environment node
import { describe, it, expect } from "vitest";

describe("MercureLive (Node import)", () => {
  it("does not reference DOMParser at module load time", async () => {
    // Sanity check: this file runs in the node environment, so DOMParser is not
    // a global. Importing the main `reactolith` entry must not throw.
    expect(typeof (globalThis as { DOMParser?: unknown }).DOMParser).toBe(
      "undefined",
    );

    await expect(import("../src")).resolves.toBeDefined();
  });

  it("exposes MercureLive as a function without constructing a parser", async () => {
    const mod = await import("../src/MercureLive");
    expect(typeof mod.MercureLive).toBe("function");
  });
});
