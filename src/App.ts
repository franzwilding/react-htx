import { createRoot, Root } from "react-dom/client";
import React, { ElementType, PropsWithChildren } from "react";
import { AppProvider } from "./provider/AppProvider";
import { FetchLike, Router } from "./Router";
import { Mercure } from "./Mercure";
import { ReactolithComponent } from "./ReactolithComponent";
import { detectScrollContainer } from "./ScrollRestoration";
import { EventEmitter } from "./util/EventEmitter";
import {
  collectFragmentNames,
  isFragmentPayload,
  parseFragments,
  toFragment,
  type FragmentContent,
  type FragmentEntry,
} from "./streaming/fragments";
import type { FragmentSink, FragmentStream } from "./streaming/FragmentSink";
import { DocumentFragmentStream } from "./streaming/DocumentFragmentStream";

export type MercureConfig = {
  hubUrl: string;
  withCredentials?: boolean;
};

export type JsonParseFailureDetail = {
  /** Original attribute name (e.g. `"json-config"`). */
  attrName: string;
  /** Raw attribute value that failed to parse. */
  value: string;
  /** The element on which the attribute was set. */
  element: Element;
};

export type AppEventMap = {
  /**
   * Emitted when a `json-*` attribute on a custom element fails `JSON.parse`.
   * The corresponding prop is passed to the component as `undefined`.
   */
  "json-parse:failed": [error: Error, detail: JsonParseFailureDetail];
  /**
   * Emitted for every fragment the app takes in, whether or not a placeholder
   * was waiting for it.
   */
  "fragment:received": [name: string, content: DocumentFragment];
  /**
   * Emitted when the fragment stream of the current render is over. `pending`
   * lists the placeholders that never got content.
   */
  "stream:ended": [pending: string[]];
};

export type AppOptions = {
  /**
   * Remove a class (default `"hidden"`) from the root element after the React
   * tree first commits. Lets backends emit a hidden root to avoid FOUC.
   * Set `false` to disable. Default `true`.
   */
  hideUntilHydrated?: boolean;
  /** Class name removed when `hideUntilHydrated` is enabled. Default `"hidden"`. */
  hiddenClass?: string;
  /**
   * Accept out-of-band HTML fragments (`<template data-fragment="…">`) that
   * arrive after the page they belong to. Off by default: with the option off
   * nothing observes the document and the Router reads responses exactly as
   * it always did.
   */
  streaming?: boolean;
};

export class App extends EventEmitter<AppEventMap> implements FragmentSink {
  public readonly element: HTMLElement;
  public readonly router: Router;
  public readonly mercure: Mercure;
  public readonly component: ElementType;
  public readonly doc: Document;
  public readonly hideUntilHydrated: boolean;
  public readonly hiddenClass: string;
  /** Whether this app accepts out-of-band fragments. */
  public readonly streaming: boolean;
  private _mercureConfig?: MercureConfig;
  private readonly mercureConfigListeners = new Set<() => void>();
  private readonly hydratedListeners = new Set<() => void>();
  private hydrated = false;
  private readonly appProvider: ElementType<PropsWithChildren<{ app: App }>>;
  private readonly selector: (doc: Document) => HTMLElement | null;
  private readonly root: Root;
  /**
   * The elements the current page was rendered from. React empties the
   * container on its first commit, so re-reading `element.children` afterwards
   * finds nothing — these detached nodes stay valid and are what makes a later
   * fragment swap possible at all.
   */
  private sourceChildren: HTMLElement[] = [];
  private readonly fragments = new Map<string, DocumentFragment>();
  private stream: FragmentStream | null = null;
  private nextStream: FragmentStream | null = null;

  constructor(
    component: ElementType,
    appProvider: ElementType<PropsWithChildren<{ app: App }>> = AppProvider,
    selector:
      ((doc: Document) => HTMLElement | null) | string = "#reactolith-app",
    root?: Root,
    doc: Document = document,
    fetchImp: FetchLike = fetch,
    options: AppOptions = {},
  ) {
    super();
    this.component = component;
    this.appProvider = appProvider;
    this.doc = doc;
    this.hideUntilHydrated = options.hideUntilHydrated ?? true;
    this.hiddenClass = options.hiddenClass ?? "hidden";
    this.streaming = options.streaming ?? false;

    if (typeof selector === "string") {
      const selStr = selector;
      selector = (doc) => doc.querySelector(selStr);
    }
    this.selector = selector;

    const element = this.selector(doc);
    if (!element) {
      throw new Error(
        "Could not find root element in document. Please check your selector!",
      );
    }

    this.element = element;
    this.root = root || createRoot(this.element);

    // Determine scroll container: explicit attribute > auto-detection > window
    const scrollContainerSelector = this.element.getAttribute(
      "data-scroll-container",
    );
    const scrollElement = scrollContainerSelector
      ? doc.querySelector(scrollContainerSelector)
      : detectScrollContainer(this.element, doc);

    this.router = new Router(this, doc, fetchImp, scrollElement);
    this.mercure = new Mercure(this);

    // Auto-configure Mercure from data-mercure-hub-url attribute
    const mercureHubUrl = this.element.getAttribute("data-mercure-hub-url");
    if (mercureHubUrl) {
      this._mercureConfig = {
        hubUrl: mercureHubUrl,
        withCredentials: this.element.hasAttribute(
          "data-mercure-with-credentials",
        ),
      };
    }

    // The fragments of the first page arrive through the document itself.
    // Adopted (not started) here — `renderElement` starts it after the render
    // they belong to.
    if (this.streaming) {
      this.adoptStream(new DocumentFragmentStream(this));
    }

    this.renderElement(this.element);
  }

  public get mercureConfig(): MercureConfig | undefined {
    return this._mercureConfig;
  }

  public set mercureConfig(value: MercureConfig | undefined) {
    this._mercureConfig = value;
    this.mercureConfigListeners.forEach((listener) => listener());
  }

  /**
   * Subscribe to changes of `mercureConfig`. The callback fires every time the
   * config is reassigned, including when it is set or cleared after mount.
   * Returns a cleanup function to remove the listener.
   */
  public onMercureConfigChange(listener: () => void): () => void {
    this.mercureConfigListeners.add(listener);
    return () => {
      this.mercureConfigListeners.delete(listener);
    };
  }

  /**
   * Called by `AppProvider` (or a custom provider) once the React tree has
   * committed. Removes the configured hidden class to reveal the app and
   * notifies `onHydrated` listeners. Idempotent.
   */
  public notifyHydrated(): void {
    if (this.hideUntilHydrated) {
      this.element.classList.remove(this.hiddenClass);
    }
    if (this.hydrated) return;
    this.hydrated = true;
    this.hydratedListeners.forEach((listener) => listener());
  }

  /**
   * Subscribe to the first hydration of the app. If hydration has already
   * happened, the callback fires synchronously.
   */
  public onHydrated(listener: () => void): () => void {
    if (this.hydrated) {
      listener();
      return () => {};
    }
    this.hydratedListeners.add(listener);
    return () => {
      this.hydratedListeners.delete(listener);
    };
  }

  public render(document: string | Document): boolean {
    if (typeof document === "string") {
      const parser = new DOMParser();
      document = parser.parseFromString(document, "text/html");
    }

    // Try to find the root element in the document
    const element = this.selector(document);

    if (!element) {
      // Nothing was rendered, so a stream adopted for this render has no page
      // to fill. Drop it here or it would attach to the *next* render.
      this.adoptStream(null);
      return false;
    }

    this.renderElement(element);

    return true;
  }

  public renderElement(element: HTMLElement): void {
    // A new page: the previous page's fragments address placeholders that no
    // longer exist. Clearing first also keeps a stream from writing into the
    // very render it belongs to.
    this.fragments.clear();
    this.sourceChildren = Array.from(element.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    this.paint();
    // Last — binding starts the stream.
    this.bindStream();
  }

  /** Render the current source children (with fragments applied). */
  private paint(): void {
    this.root.render(
      React.createElement(
        this.appProvider,
        {
          app: this,
        },
        this.sourceChildren.map((element, key) =>
          React.createElement(ReactolithComponent, {
            key,
            element,
            component: this.component,
          }),
        ),
      ),
    );
  }

  /**
   * @internal Content currently held for a fragment name, if any. Used by
   * `ReactolithComponent` to substitute a placeholder.
   */
  public fragment(name: string): DocumentFragment | undefined {
    return this.fragments.get(name);
  }

  /**
   * Replace every placeholder carrying `name` with `content`.
   *
   * Returns `false` (and warns) when no placeholder currently carries the
   * name — the content is remembered either way, so a fragment that arrives
   * before its placeholder is not lost.
   */
  public replace(name: string, content: FragmentContent): boolean {
    return this.applyEntries([[name, toFragment(content, this.doc)]]).includes(
      name,
    );
  }

  /**
   * Apply every `<template data-fragment="…">` found in `html`.
   * Returns the names that actually landed on a placeholder.
   */
  public applyFragments(html: string): string[] {
    return this.applyEntries(parseFragments(html, this.doc));
  }

  /**
   * True when `html` is nothing but fragment templates — whitespace, comments
   * and `<rl-fragment>` markers aside. A page that merely *contains* a
   * template is not a fragment payload.
   */
  public isFragmentPayload(html: string): boolean {
    return isFragmentPayload(html, this.doc);
  }

  /** Fragment names addressed by the current tree that have no content yet. */
  public pendingFragments(): string[] {
    return Array.from(this.fragmentNameSet()).filter(
      (name) => !this.fragments.has(name),
    );
  }

  /**
   * @internal Adopt the stream that serves the *next* render. Call before the
   * render it belongs to; `null` drops a stream that will never be served.
   */
  public adoptStream(stream: FragmentStream | null): void {
    if (this.nextStream && this.nextStream !== stream) {
      this.nextStream.cancel();
    }
    this.nextStream = stream;
  }

  /**
   * @internal Called by a stream. Fragments from a stream that is no longer
   * the current one belong to a page that has been replaced — drop them.
   */
  public acceptFragments(
    stream: FragmentStream,
    fragments: FragmentEntry[],
  ): void {
    if (stream !== this.stream) return;
    this.applyEntries(fragments);
  }

  /** @internal Called by a stream when no more fragments will arrive. */
  public endStream(stream: FragmentStream): void {
    if (stream !== this.stream) return;
    this.stream = null;
    this.emit("stream:ended", this.pendingFragments());
  }

  /**
   * Hand the adopted stream the page it serves. Starting is the last thing a
   * render does: a stream started earlier would have its first fragments
   * wiped by the very render they belong to.
   */
  private bindStream(): void {
    const next = this.nextStream;
    this.nextStream = null;
    if (this.stream && this.stream !== next) {
      this.stream.cancel();
    }
    this.stream = next;
    next?.start();
  }

  /** All fragment names addressed by the tree, filled or not. */
  private fragmentNameSet(): Set<string> {
    return collectFragmentNames(this.sourceChildren, (name) =>
      this.fragments.get(name),
    );
  }

  /**
   * Store fragments, then repaint once. Returns the names that matched a
   * placeholder — checked after all of them are stored, so a fragment that
   * brings the placeholder of another one still counts.
   */
  private applyEntries(entries: FragmentEntry[]): string[] {
    if (entries.length === 0) return [];

    for (const [name, content] of entries) {
      this.fragments.set(name, content);
      this.emit("fragment:received", name, content);
    }

    const names = this.fragmentNameSet();
    const applied: string[] = [];
    for (const [name] of entries) {
      if (names.has(name)) {
        applied.push(name);
      } else {
        console.warn(
          `reactolith: received fragment "${name}" but no element carries ` +
            `data-fragment="${name}". It is kept in case a placeholder shows up later.`,
        );
      }
    }

    this.paint();
    return applied;
  }

  public unmount(): void {
    this.root.unmount();
  }

  /**
   * @internal Used by `ReactolithComponent` to report a `json-*` parse
   * failure. Prefer subscribing via `app.on("json-parse:failed", …)`.
   */
  public emitJsonParseFailed(
    error: Error,
    detail: JsonParseFailureDetail,
  ): void {
    this.emit("json-parse:failed", error, detail);
  }

  /** Tear down event listeners and unmount the React tree. */
  public destroy(): void {
    this.router.destroy();
    this.stream?.cancel();
    this.stream = null;
    this.nextStream?.cancel();
    this.nextStream = null;
    this.root.unmount();
    this.clearListeners();
  }
}
