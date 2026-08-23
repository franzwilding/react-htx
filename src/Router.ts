import { App } from "./App";
import { ScrollRestoration } from "./ScrollRestoration";
import {
  FRAGMENTS_ACCEPT,
  FRAGMENTS_CONTENT_TYPE,
  REACTOLITH_FRAGMENTS_HEADER,
  REACTOLITH_FROM_HEADER,
  REACTOLITH_HEADER,
  REACTOLITH_VERSION,
  SHELL_END,
} from "./streaming/protocol";
import { FetchFragmentStream } from "./streaming/FetchFragmentStream";
import type { FragmentStream } from "./streaming/FragmentSink";
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
  "nav:error": [
    input: URL | string,
    init: RequestInit,
    pushState: boolean,
    error: unknown,
  ];
  /**
   * A fragments-only response was applied to the live tree. No page was
   * rendered, so `render:success` does not fire.
   */
  "fragments:applied": [
    input: URL | string,
    init: RequestInit,
    pushState: boolean,
    response: Response,
    html: string,
    finalUrl: string,
    names: string[],
  ];
  "nav:cancelled": [input: URL | string, init: RequestInit, pushState: boolean];
};

export type VisitResult =
  | {
      cancelled?: false;
      result: boolean;
      response: Response;
      html: string;
      finalUrl: string;
      /** Names applied when the response carried fragments only. */
      fragments?: string[];
    }
  | {
      cancelled: true;
      result: false;
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
  private inflight: AbortController | null = null;
  /**
   * Path (pathname + search, no hash) of the URL whose HTML the App last
   * rendered. Used by the popstate handler to recognise hash-only history
   * traversals (clicking `<a href="#section">`, going back/forward between
   * `#a` and `#b` on the same page) and skip the re-fetch that would
   * otherwise wipe out the browser's native hash scroll.
   */
  private lastVisitedPath: string;

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

    const initialLoc = doc.defaultView?.location;
    this.lastVisitedPath = initialLoc
      ? initialLoc.pathname + initialLoc.search
      : "";

    // Swallow rejections from the DOM event handlers; visit() now throws
    // on fetch failures, but consumers learn about those via the
    // `nav:error` event rather than an unhandled rejection.
    this.boundOnClick = (e) => {
      void this.onClick(e).catch(() => {});
    };
    this.boundOnSubmit = (e) => {
      void this.onSubmit(e).catch(() => {});
    };

    if (doc.defaultView) {
      const win = doc.defaultView;
      this.scrollRestoration = new ScrollRestoration(win, scrollElement);

      this.boundOnPopState = () => {
        const loc = win.location;
        const newPath = loc.pathname + loc.search;
        // Per HTML spec, clicking `<a href="#x">` traverses a new session
        // history entry and fires popstate — even though only the fragment
        // changed. Re-fetching the current page would clobber the
        // browser-native scroll-to-id, so detect the hash-only case and
        // hand it to ScrollRestoration instead.
        if (newPath === this.lastVisitedPath) {
          this.scrollRestoration?.pop();
          this.scrollRestoration?.scroll(false, undefined, newPath + loc.hash);
          return;
        }
        this.lastVisitedPath = newPath;
        void this.visit(newPath, { method: "GET" }, false).catch(() => {});
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
    this.inflight?.abort();
    this.inflight = null;
    this.scrollRestoration?.destroy();
    this.clearListeners();
  }

  public async visit(
    input: URL | string,
    init: RequestInit = { method: "GET" },
    pushState: boolean = true,
    scroll?: ScrollOption,
    replace: boolean = false,
  ): Promise<VisitResult> {
    return this.performVisit(input, init, pushState, scroll, replace, false);
  }

  /**
   * @param isFragmentsRetry `true` for the one full-page retry a
   * fragments-only response that matched nothing is given. The flag lives on
   * the visit, not in a header, so the server cannot make it loop.
   */
  private async performVisit(
    input: URL | string,
    init: RequestInit,
    pushState: boolean,
    scroll: ScrollOption | undefined,
    replace: boolean,
    isFragmentsRetry: boolean,
  ): Promise<VisitResult> {
    // Cancel any in-flight visit. Its fetch will reject with AbortError,
    // which we catch below and translate into a terminal `nav:cancelled`
    // event. This guarantees that two rapid visit() calls don't race —
    // the second one always wins, regardless of resolution order.
    this.inflight?.abort();
    const controller = new AbortController();
    this.inflight = controller;

    // Save scroll position for the entry we are leaving
    this.scrollRestoration?.save();

    this.emit("nav:started", input, init, pushState);

    let response: Response;
    let html: string;
    let stream: FragmentStream | null = null;
    try {
      response = await this.fetch(input, {
        ...init,
        headers: this.buildHeaders(init),
        signal: controller.signal,
      });
      ({ html, stream } = await this.readDocument(response));
    } catch (error) {
      if (controller.signal.aborted) {
        // Superseded by a newer visit(). Emit a terminal `nav:cancelled`
        // so listeners (Form submitting flag, etc.) can reset, but do
        // NOT emit `nav:error` and do NOT throw — the navigation was
        // intentionally abandoned.
        this.emit("nav:cancelled", input, init, pushState);
        return { cancelled: true, result: false };
      }
      // Fetch (or response.text()) failed before we ever got a usable
      // response. Emit a terminal `nav:error` so listeners that registered
      // on `nav:started` (Form submitting flag, RouterProvider loading
      // flag, …) can reset their state, then re-throw so callers awaiting
      // visit() still observe the rejection.
      this.emit("nav:error", input, init, pushState, error);
      throw error;
    }

    // Aborted between fetch resolution and render — treat as cancelled
    // so the superseded visit doesn't clobber the page that the newer
    // visit is about to render.
    if (controller.signal.aborted) {
      // The tail of a superseded response must never reach the page that
      // replaced it, so drop the stream instead of adopting it.
      stream?.cancel();
      this.emit("nav:cancelled", input, init, pushState);
      return { cancelled: true, result: false };
    }

    if (this.inflight === controller) this.inflight = null;

    const original = typeof input === "string" ? input : input.toString();
    const finalUrl = response.redirected ? response.url : original;
    // A fragments-only response updates parts of the page instead of
    // replacing it. A streamed page (shell + sentinel + tail) is a page.
    if (!stream && this.isFragmentsResponse(response, html)) {
      return this.applyPartial(
        input,
        init,
        pushState,
        scroll,
        replace,
        isFragmentsRetry,
        response,
        html,
        finalUrl,
      );
    }

    // Adopt before rendering: the App starts the stream once the render it
    // serves has happened.
    if (stream) this.app.adoptStream(stream);
    const result = this.app.render(html);

    if (result && pushState && replace) {
      const state = this.scrollRestoration?.replace() ?? {};
      this.doc.defaultView?.history.replaceState(state, "", finalUrl);
    } else if (result && pushState) {
      const state = this.scrollRestoration?.push() ?? {};
      this.doc.defaultView?.history.pushState(state, "", finalUrl);
    } else if (result && !pushState) {
      this.scrollRestoration?.pop();
    }

    if (result) {
      this.scrollRestoration?.scroll(pushState, scroll, finalUrl);
      try {
        const u = new URL(finalUrl, this.doc.baseURI);
        this.lastVisitedPath = u.pathname + u.search;
      } catch {
        // Malformed finalUrl — leave lastVisitedPath alone.
      }
    }

    const event = result ? "render:success" : "render:failed";
    this.emit(event, input, init, pushState, response, html, finalUrl);
    this.emit("nav:ended", input, init, pushState, response, html, finalUrl);
    return { result, response, html, finalUrl };
  }

  /**
   * Merge reactolith's navigation headers into the caller's `init`. The
   * caller always wins: a header that is already set is never overwritten.
   */
  private buildHeaders(init: RequestInit): Headers {
    const headers = new Headers(init.headers);
    const setDefault = (name: string, value: string) => {
      if (!headers.has(name)) headers.set(name, value);
    };

    // Same-origin, so no CORS preflight — and a backend that ignores them
    // sees no change at all.
    setDefault(REACTOLITH_HEADER, REACTOLITH_VERSION);
    setDefault(REACTOLITH_FROM_HEADER, this.lastVisitedPath);

    // Only an app that can apply fragments may invite them.
    if (this.app.streaming) {
      setDefault("Accept", FRAGMENTS_ACCEPT);
    }

    if (this.app.sendFragmentNames) {
      const names = this.app.fragmentNames();
      if (names.length > 0) {
        setDefault(REACTOLITH_FRAGMENTS_HEADER, names.join(","));
      }
    }

    return headers;
  }

  /**
   * Whether a response carries fragments instead of a page. The content type
   * is the contract; as a courtesy a payload that is nothing but fragment
   * templates counts too. Both require `streaming` — an app that never asked
   * for fragments must not have them applied behind its back.
   */
  private isFragmentsResponse(response: Response, html: string): boolean {
    if (!this.app.streaming) return false;

    let contentType = "";
    try {
      contentType = response.headers?.get("content-type") ?? "";
    } catch {
      // Test doubles and opaque responses may not expose headers at all.
    }
    if (contentType.toLowerCase().includes(FRAGMENTS_CONTENT_TYPE)) return true;

    return this.app.isFragmentPayload(html);
  }

  /**
   * Apply a fragments-only response: no page render, no scroll to top, and a
   * history entry only when the final URL differs from the one in the address
   * bar. `nav:ended` still fires — a form that never learns it is done stays
   * disabled forever.
   */
  private async applyPartial(
    input: URL | string,
    init: RequestInit,
    pushState: boolean,
    scroll: ScrollOption | undefined,
    replace: boolean,
    isFragmentsRetry: boolean,
    response: Response,
    html: string,
    finalUrl: string,
  ): Promise<VisitResult> {
    const applied = this.app.applyFragments(html);

    if (applied.length === 0) {
      console.warn(
        `reactolith: the response for "${finalUrl}" carried fragments only, ` +
          `but none of them matched a placeholder in the current page.` +
          (isFragmentsRetry ? "" : " Retrying as a full page."),
      );
      if (!isFragmentsRetry) {
        const headers = new Headers(init.headers);
        headers.set("Accept", "text/html");
        return this.performVisit(
          input,
          { ...init, headers },
          pushState,
          scroll,
          replace,
          true,
        );
      }
    }

    const win = this.doc.defaultView;
    const currentPath = win
      ? win.location.pathname + win.location.search
      : this.lastVisitedPath;
    const targetPath = this.toPath(finalUrl);
    const addressChanged = targetPath !== null && targetPath !== currentPath;

    if (pushState && replace) {
      const state = this.scrollRestoration?.replace() ?? {};
      win?.history.replaceState(state, "", finalUrl);
    } else if (pushState && addressChanged) {
      // A submit answered with fragments for the page you are already on adds
      // nothing to the history.
      const state = this.scrollRestoration?.push() ?? {};
      win?.history.pushState(state, "", finalUrl);
    }

    if (pushState && (replace || addressChanged) && targetPath !== null) {
      this.lastVisitedPath = targetPath;
    }

    // Never scroll to top on a partial response.
    this.scrollRestoration?.scroll(pushState, "preserve", finalUrl);

    this.emit(
      "fragments:applied",
      input,
      init,
      pushState,
      response,
      html,
      finalUrl,
      applied,
    );
    this.emit("nav:ended", input, init, pushState, response, html, finalUrl);

    return {
      result: applied.length > 0,
      response,
      html,
      finalUrl,
      fragments: applied,
    };
  }

  /** `pathname + search` of a URL resolved against the document, if valid. */
  private toPath(url: string): string | null {
    try {
      const resolved = new URL(url, this.doc.baseURI);
      return resolved.pathname + resolved.search;
    } catch {
      return null;
    }
  }

  /**
   * Read a response body into the HTML the App renders.
   *
   * Without streaming — or without a readable body — this is plain
   * `response.text()`. Otherwise the body is read until `<!--rl-shell-end-->`
   * shows up: everything before it is the shell, and the still-open reader
   * (plus whatever already followed the sentinel) becomes a
   * `FetchFragmentStream`. A body that ends without the sentinel is returned
   * whole, so a backend that does not stream needs no response header.
   *
   * Doing this here instead of wrapping `fetch` keeps the real `Response`, so
   * `response.redirected` and `response.url` still decide the final URL.
   */
  private async readDocument(
    response: Response,
  ): Promise<{ html: string; stream: FragmentStream | null }> {
    if (!this.app.streaming || !response.body) {
      return { html: await response.text(), stream: null };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });

      const index = buffer.indexOf(SHELL_END);
      if (index !== -1) {
        const shell = buffer.slice(0, index);
        const rest = buffer.slice(index + SHELL_END.length);
        return {
          html: shell,
          stream: new FetchFragmentStream(this.app, reader, rest, decoder),
        };
      }

      if (done) return { html: buffer, stream: null };
    }
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

    // Per HTML spec, a submitter button's formaction/formmethod attributes
    // override the corresponding attributes on the <form>. The browser does
    // this automatically for full-page submits; we have to do it ourselves.
    const submitter = event.submitter as
      HTMLButtonElement | HTMLInputElement | null;

    const actionAttr =
      submitter?.getAttribute("formaction") ?? form.getAttribute("action");
    const isSameOriginAction =
      actionAttr === null || isSameOriginNavigation(actionAttr, this.doc);

    if (form.target && form.target.toLowerCase() !== "_self") return;
    if (!isSameOriginAction) return;

    event.preventDefault();
    event.stopPropagation();

    const formData = new FormData(form);

    if (submitter && "name" in submitter && submitter.name) {
      if (submitter instanceof HTMLButtonElement) {
        formData.append(submitter.name, submitter.value || "");
      } else if (
        submitter instanceof HTMLInputElement &&
        (submitter.type === "submit" || submitter.type === "image")
      ) {
        formData.append(submitter.name, submitter.value || "");
      }
    }

    const method = (
      submitter?.getAttribute("formmethod") ||
      form.method ||
      "GET"
    ).toUpperCase();
    let body: BodyInit | null = null;
    let url = actionAttr ?? "";

    if (method === "GET") {
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        if (typeof value === "string") params.append(key, value);
      });
      // Per RFC 3986, the query must precede the fragment. Split off any
      // trailing `#fragment` before merging form params, then re-attach.
      const hashIdx = url.indexOf("#");
      const fragment = hashIdx >= 0 ? url.slice(hashIdx) : "";
      let base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
      // Normalize a bare trailing `?` so we don't emit `?&x=1`.
      if (base.endsWith("?")) base = base.slice(0, -1);
      const q = params.toString();
      const sep = base.includes("?") ? (q ? "&" : "") : q ? "?" : "";
      url = `${base}${sep}${q}${fragment}`;
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
    options?: { scroll?: ScrollOption; replace?: boolean },
  ): Promise<void> {
    await this.visit(
      path,
      { method: "GET" },
      true,
      options?.scroll,
      options?.replace,
    );
  }
}
