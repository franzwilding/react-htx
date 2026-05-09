import { describe, it, expect } from "vitest";
import {
  isRelativeHref,
  isSameOriginNavigation,
  hasNavBypassModifiers,
} from "../src/Router";

describe("isRelativeHref", () => {
  it("returns true for relative paths", () => {
    expect(isRelativeHref("/api/data")).toBe(true);
    expect(isRelativeHref("/")).toBe(true);
    expect(isRelativeHref("page.html")).toBe(true);
    expect(isRelativeHref("./relative")).toBe(true);
    expect(isRelativeHref("../parent")).toBe(true);
    expect(isRelativeHref("path/to/page")).toBe(true);
  });

  it("returns false for null or empty href", () => {
    expect(isRelativeHref(null)).toBe(false);
    expect(isRelativeHref("")).toBe(false);
  });

  it("returns false for hash links", () => {
    expect(isRelativeHref("#section")).toBe(false);
    expect(isRelativeHref("#")).toBe(false);
  });

  it("returns false for protocol-relative URLs", () => {
    expect(isRelativeHref("//example.com/path")).toBe(false);
  });

  it("returns false for absolute URLs with protocols", () => {
    expect(isRelativeHref("http://example.com")).toBe(false);
    expect(isRelativeHref("https://example.com")).toBe(false);
    expect(isRelativeHref("mailto:test@example.com")).toBe(false);
    expect(isRelativeHref("tel:+123456789")).toBe(false);
    expect(isRelativeHref("javascript:void(0)")).toBe(false);
    expect(isRelativeHref("ftp://files.example.com")).toBe(false);
    expect(isRelativeHref("data:text/html,<h1>Test</h1>")).toBe(false);
  });

  it("handles edge cases with colons in paths", () => {
    // Paths that contain colons but are not protocols
    expect(isRelativeHref("/path:with:colons")).toBe(true);
    expect(isRelativeHref("path:8080")).toBe(false); // This looks like a protocol
  });
});

describe("isSameOriginNavigation", () => {
  // jsdom default location is http://localhost:3000/
  it("accepts relative paths", () => {
    expect(isSameOriginNavigation("/api/data", document)).toBe(true);
    expect(isSameOriginNavigation("/", document)).toBe(true);
    expect(isSameOriginNavigation("page.html", document)).toBe(true);
    expect(isSameOriginNavigation("./relative", document)).toBe(true);
    expect(isSameOriginNavigation("../parent", document)).toBe(true);
  });

  it("accepts same-origin absolute URLs", () => {
    expect(isSameOriginNavigation("http://localhost:3000/", document)).toBe(
      true,
    );
    expect(
      isSameOriginNavigation("http://localhost:3000/about", document),
    ).toBe(true);
    expect(
      isSameOriginNavigation("http://localhost:3000/path?q=1#frag", document),
    ).toBe(true);
  });

  it("rejects cross-origin URLs", () => {
    expect(isSameOriginNavigation("https://example.com", document)).toBe(false);
    expect(isSameOriginNavigation("http://example.com/foo", document)).toBe(
      false,
    );
    expect(isSameOriginNavigation("//example.com/path", document)).toBe(false);
  });

  it("rejects non-http(s) schemes", () => {
    expect(isSameOriginNavigation("mailto:test@example.com", document)).toBe(
      false,
    );
    expect(isSameOriginNavigation("tel:+123456789", document)).toBe(false);
    expect(isSameOriginNavigation("javascript:void(0)", document)).toBe(false);
    expect(isSameOriginNavigation("data:text/html,<h1>x</h1>", document)).toBe(
      false,
    );
    expect(isSameOriginNavigation("ftp://files.example.com", document)).toBe(
      false,
    );
  });

  it("rejects hash links and empty hrefs", () => {
    expect(isSameOriginNavigation(null, document)).toBe(false);
    expect(isSameOriginNavigation("", document)).toBe(false);
    expect(isSameOriginNavigation("#", document)).toBe(false);
    expect(isSameOriginNavigation("#section", document)).toBe(false);
  });

  it("preserves relative paths that contain colons", () => {
    expect(isSameOriginNavigation("/path:with:colons", document)).toBe(true);
    // path:8080 is parsed as a custom-scheme absolute URL, not same-origin
    expect(isSameOriginNavigation("path:8080", document)).toBe(false);
  });
});

describe("hasNavBypassModifiers", () => {
  const createMouseEvent = (
    overrides: Partial<MouseEvent> = {},
  ): MouseEvent => {
    return {
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      ...overrides,
    } as MouseEvent;
  };

  it("returns false for normal left click", () => {
    const event = createMouseEvent();
    expect(hasNavBypassModifiers(event)).toBe(false);
  });

  it("returns true when defaultPrevented is true", () => {
    const event = createMouseEvent({ defaultPrevented: true });
    expect(hasNavBypassModifiers(event)).toBe(true);
  });

  it("returns true for non-left button clicks", () => {
    expect(hasNavBypassModifiers(createMouseEvent({ button: 1 }))).toBe(true); // middle
    expect(hasNavBypassModifiers(createMouseEvent({ button: 2 }))).toBe(true); // right
  });

  it("returns true when metaKey is pressed", () => {
    const event = createMouseEvent({ metaKey: true });
    expect(hasNavBypassModifiers(event)).toBe(true);
  });

  it("returns true when ctrlKey is pressed", () => {
    const event = createMouseEvent({ ctrlKey: true });
    expect(hasNavBypassModifiers(event)).toBe(true);
  });

  it("returns true when shiftKey is pressed", () => {
    const event = createMouseEvent({ shiftKey: true });
    expect(hasNavBypassModifiers(event)).toBe(true);
  });

  it("returns true when altKey is pressed", () => {
    const event = createMouseEvent({ altKey: true });
    expect(hasNavBypassModifiers(event)).toBe(true);
  });

  it("returns true with multiple modifiers", () => {
    const event = createMouseEvent({ ctrlKey: true, shiftKey: true });
    expect(hasNavBypassModifiers(event)).toBe(true);
  });
});
