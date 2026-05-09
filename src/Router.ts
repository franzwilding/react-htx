import { App } from "./App";
import { ScrollRestoration } from "./ScrollRestoration";
import { EventEmitter } from "./util/EventEmitter";
import type { Handler } from "./util/EventEmitter";

export type ScrollOption = "top" | "preserve";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type { Handler };

export type RouterEventMap = {
  "nav:started": [input: URL | string, init: RequestInit, pushState: boolean];
  "nav:ended": [
    input: URL | string,
    init: RequestInit,
    pushState: boolean,
    response: Response,
    html: string,
    finalUrl: string,
  ];
  "render:success": [
    input: URL | string,
    init: RequestInit,
    pushState: boolean,
    response: Response,
    html: string,
    finalUrl: string,
  ];
  "render:failed": [
    input: URL | string,
    init: RequestInit,
    pushState: boolean,
    response: Response,
    html: string,
    finalUrl: string,
  ];
};

export const isRelativeHref = (href: string | null): href is string => {
  if (!href) return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("//")) return false;
  return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);
};

/**
 * Decide whether a given href should be intercepted by the SPA router.
 *
 * Resolves the candidate against the document's base URL and compares origins
 * against the current location. Returns `true` for relative paths and for
 * absolute URLs that share the page's origin; returns `false` for hash links,
 * non-http(s) schemes (mailto:, tel:, javascript:, data:), and cross-origin URLs.
 */
export const isSameOriginNavigation = (
  href: string | null,
  doc: Document,
): href is string => {
  if (!href) return false;
  if (href.startsWith("#")) return false;

  const win = doc.defaultView;
  const pageOrigin = win?.location.origin ?? doc.location?.origin;
  if (!pageOrigin) return false;

  try {
    const target = new URL(href, doc.baseURI);
    return target.origin === pageOrigin;
  } catch {
    return false;
  }
};

export const hasNavBypassModifiers = (e: MouseEvent) =>
  e.defaultPrevented ||
  e.button !== 0 ||
  e.metaKey ||
  e.ctrlKey ||
  e.shiftKey ||
  e.altKey;

export class Router extends EventEmitter<RouterEventMap> {
  private readonly app: App;
  private readonly fetch: FetchLike;
  private readonly scrollRestoration?: ScrollRestoration;
  private readonly doc: Document;
  private readonly boundOnClick: (e: MouseEvent) => void;
  private readonly boundOnSubmit: (e: SubmitEvent) => void;
  private readonly boundOnPopState?: () => void;

  constructor(
    app: App,
    doc: Document = document,
    fetchImpl: FetchLike = fetch,
    scrollElement: Element | null = null,
  ) {
    super();
    this.app = app;
    this.doc = doc;
    this.fetch = (input, init) => fetchImpl(input, init);

    this.boundOnClick = (e) => this.onClick(e);
    this.boundOnSubmit = (e) => this.onSubmit(e);

    if (doc.defaultView) {
      const win = doc.defaultView;
      this.scrollRestoration = new ScrollRestoration(win, scrollElement);

      this.boundOnPopState = () => {
        const loc = win.location;
        void this.visit(loc.pathname + loc.search, { method: "GET" }, false);
      };
      win.addEventListener("popstate", this.boundOnPopState);
    }

    doc.addEventListener("click", this.boundOnClick);
    doc.addEventListener("submit", this.boundOnSubmit);
  }

  destroy(): void {
    this.doc.removeEventListener("click", this.boundOnClick);
    this.doc.removeEventListener("submit", this.boundOnSubmit);
    if (this.boundOnPopState && this.doc.defaultView) {
      this.doc.defaultView.removeEventListener(
        "popstate",
        this.boundOnPopState,
      );
    }
    this.scrollRestoration?.destroy();
    this.clearListeners();
  }

  public async visit(
    input: URL | string,
    init: RequestInit = { method: "GET" },
    pushState: boolean = true,
    scroll?: ScrollOption,
  ): Promise<{
    result: boolean;
    response: Response;
    html: string;
    finalUrl: string;
  }> {
    // Save scroll position for the entry we are leaving
    this.scrollRestoration?.save();

    this.emit("nav:started", input, init, pushState);
    const response = await this.fetch(input, init);
    const html = await response.text();

    const original = typeof input === "string" ? input : input.toString();
    const finalUrl = response.redirected ? response.url : original;
    const result = this.app.render(html);

    if (result && pushState) {
      const state = this.scrollRestoration?.push() ?? {};
      this.doc.defaultView?.history.pushState(state, "", finalUrl);
    } else if (result && !pushState) {
      this.scrollRestoration?.pop();
    }

    if (result) {
      this.scrollRestoration?.scroll(pushState, scroll, finalUrl);
    }

    const event = result ? "render:success" : "render:failed";
    this.emit(event, input, init, pushState, response, html, finalUrl);
    this.emit("nav:ended", input, init, pushState, response, html, finalUrl);
    return { result, response, html, finalUrl };
  }

  public async onClick(event: MouseEvent) {
    // Ignore modified clicks, right/middle clicks, already-handled events
    if (hasNavBypassModifiers(event)) return;

    const link = (event.target as HTMLElement | null)?.closest("a");
    if (!link) return;

    const hrefAttr = link.getAttribute("href");
    if (!isSameOriginNavigation(hrefAttr, this.doc)) return;

    // Respect targets like _blank or any non-_self
    if (link.target && link.target.toLowerCase() !== "_self") return;

    // Respect downloads and explicit external hints
    if (link.hasAttribute("download")) return;
    const rel = link.getAttribute("rel") || "";
    if (/\bexternal\b/i.test(rel)) return;

    event.preventDefault();
    event.stopPropagation();

    const scroll = link.dataset.scroll as ScrollOption | undefined;
    await this.visit(hrefAttr, { method: "GET" }, true, scroll);
  }

  public async onSubmit(event: SubmitEvent) {
    const form = event.target as HTMLFormElement;
    if (!form) return;

    const actionAttr = form.getAttribute("action");
    const isSameOriginAction =
      actionAttr === null || isSameOriginNavigation(actionAttr, this.doc);

    if (form.target && form.target.toLowerCase() !== "_self") return;
    if (!isSameOriginAction) return;

    event.preventDefault();
    event.stopPropagation();

    const formData = new FormData(form);

    if (event.submitter instanceof HTMLButtonElement && event.submitter.name) {
      formData.append(event.submitter.name, event.submitter.value || "");
    }

    const method = (form.method || "GET").toUpperCase();
    let body: BodyInit | null = null;
    let url = actionAttr ?? "";

    if (method === "GET") {
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        if (typeof value === "string") params.append(key, value);
      });
      const q = params.toString();
      const sep = url.includes("?") ? (q ? "&" : "") : q ? "?" : "";
      url = `${url}${sep}${q}`;
    } else {
      body = formData;
    }

    const scroll = form.dataset.scroll as ScrollOption | undefined;
    const win = this.doc.defaultView;
    const fallbackUrl = win ? win.location.pathname + win.location.search : "";
    await this.visit(url || fallbackUrl, { method, body }, true, scroll);
  }

  public async navigate(
    path: string,
    options?: { scroll?: ScrollOption },
  ): Promise<void> {
    await this.visit(path, { method: "GET" }, true, options?.scroll);
  }
}
