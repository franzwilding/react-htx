import { createRoot, Root } from "react-dom/client";
import React, { ElementType, PropsWithChildren } from "react";
import { AppProvider } from "./provider/AppProvider";
import { FetchLike, Router } from "./Router";
import { ReactolithComponent } from "./ReactolithComponent";
import { detectScrollContainer } from "./ScrollRestoration";

export type MercureConfig = {
  hubUrl: string;
  withCredentials?: boolean;
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
};

export class App {
  public readonly element: HTMLElement;
  public readonly router: Router;
  public readonly component: ElementType;
  public readonly doc: Document;
  public readonly hideUntilHydrated: boolean;
  public readonly hiddenClass: string;
  private _mercureConfig?: MercureConfig;
  private readonly mercureConfigListeners = new Set<() => void>();
  private readonly hydratedListeners = new Set<() => void>();
  private hydrated = false;
  private readonly appProvider: ElementType<PropsWithChildren<{ app: App }>>;
  private readonly selector: (doc: Document) => HTMLElement | null;
  private readonly root: Root;

  constructor(
    component: ElementType,
    appProvider: ElementType<PropsWithChildren<{ app: App }>> = AppProvider,
    selector:
      | ((doc: Document) => HTMLElement | null)
      | string = "#reactolith-app",
    root?: Root,
    doc: Document = document,
    fetchImp: FetchLike = fetch,
    options: AppOptions = {},
  ) {
    this.component = component;
    this.appProvider = appProvider;
    this.doc = doc;
    this.hideUntilHydrated = options.hideUntilHydrated ?? true;
    this.hiddenClass = options.hiddenClass ?? "hidden";

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
      return false;
    }

    this.renderElement(element);

    return true;
  }

  public renderElement(element: HTMLElement): void {
    this.root.render(
      React.createElement(
        this.appProvider,
        {
          app: this,
        },
        Array.from(element.children)
          .filter((child) => child instanceof HTMLElement)
          .map((element, key) =>
            React.createElement(ReactolithComponent, {
              key,
              element,
              component: this.component,
            }),
          ),
      ),
    );
  }

  public unmount(): void {
    this.root.unmount();
  }

  /** Tear down event listeners and unmount the React tree. */
  public destroy(): void {
    this.router.destroy();
    this.root.unmount();
  }
}
