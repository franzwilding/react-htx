import { App } from "./App";

export type Handler<Args extends readonly unknown[]> = (...args: Args) => void;

export type MercureEventMap = {
  "sse:connected": [url: string];
  "sse:disconnected": [url: string];
  "sse:message": [event: MessageEvent, html: string];
  /**
   * Fires for SSE messages with a named event type (`event: foo\ndata: …`).
   * Subscribe to a name via `events` in MercureOptions to start receiving them.
   */
  "sse:named": [name: string, event: MessageEvent, data: string];
  "render:success": [event: MessageEvent, html: string];
  "render:failed": [event: MessageEvent, html: string];
  "refetch:started": [event: MessageEvent];
  "refetch:success": [event: MessageEvent, html: string];
  "refetch:failed": [event: MessageEvent, error: Error];
  "sse:error": [error: Event];
};

export type MercureOptions = {
  /** The Mercure hub URL to connect to */
  hubUrl: string;
  /** Optional: Last-Event-ID for reconnection */
  lastEventId?: string;
  /** Optional: Whether to include credentials (cookies) */
  withCredentials?: boolean;
  /**
   * Optional: a function returning the topic to subscribe to.
   * Defaults to the current pathname (`window.location.pathname`).
   * Re-evaluated whenever the router emits `render:success`.
   */
  getTopic?: () => string;
  /**
   * Optional: SSE event names to listen for in addition to the default
   * `message` event. Each named event is delivered through the `sse:named`
   * listener as `(name, event, data)`. The default `message` event continues
   * to flow through `sse:message` and the HTML render pipeline as before.
   */
  events?: string[];
};

export class Mercure {
  private readonly app: App;
  private eventSource: EventSource | null = null;
  private listeners: Partial<
    Record<
      keyof MercureEventMap,
      Set<Handler<MercureEventMap[keyof MercureEventMap]>>
    >
  > = {};
  private currentUrl: string | null = null;
  private currentTopic: string | null = null;
  private options: MercureOptions | null = null;
  private routerUnsubscribe: (() => void) | null = null;
  private _lastEventId: string | undefined;

  constructor(app: App) {
    this.app = app;
  }

  private ensureSet<K extends keyof MercureEventMap>(
    type: K,
  ): Set<Handler<MercureEventMap[K]>> {
    const existing = this.listeners[type] as
      | Set<Handler<MercureEventMap[K]>>
      | undefined;
    if (existing) return existing;

    const created = new Set<Handler<MercureEventMap[K]>>();
    this.listeners[type] = created as unknown as Set<
      Handler<MercureEventMap[keyof MercureEventMap]>
    >;
    return created;
  }

  protected emit<K extends keyof MercureEventMap>(
    type: K,
    ...args: MercureEventMap[K]
  ): void {
    this.listeners[type]?.forEach((h) => h(...args));
  }

  on<K extends keyof MercureEventMap>(
    type: K,
    handler: Handler<MercureEventMap[K]>,
  ): () => void {
    const set = this.ensureSet(type);
    set.add(handler);
    return () => this.off(type, handler);
  }

  off<K extends keyof MercureEventMap>(
    type: K,
    handler: Handler<MercureEventMap[K]>,
  ): void {
    this.listeners[type]?.delete(
      handler as Handler<MercureEventMap[keyof MercureEventMap]>,
    );
  }

  /**
   * Subscribe to a Mercure hub for real-time updates.
   * Automatically subscribes to the current pathname and re-subscribes on route changes.
   */
  subscribe(options: MercureOptions): void {
    // Store options for re-subscription
    this.options = options;
    if (options.lastEventId) {
      this._lastEventId = options.lastEventId;
    }

    // Unsubscribe from previous router listener
    if (this.routerUnsubscribe) {
      this.routerUnsubscribe();
    }

    // Listen to router navigation to re-subscribe with new pathname
    this.routerUnsubscribe = this.app.router.on("render:success", () => {
      this.connectToCurrentPath();
    });

    // Connect to current path
    this.connectToCurrentPath();
  }

  private getTopic(): string {
    if (this.options?.getTopic) return this.options.getTopic();
    return this.app.doc.defaultView?.location.pathname ?? "/";
  }

  /**
   * Connect to EventSource with the configured topic.
   * If we're already connected to the same topic, do nothing.
   */
  private connectToCurrentPath(): void {
    if (!this.options) return;

    const topic = this.getTopic();

    // Skip if we're already connected to this topic
    if (
      this.eventSource &&
      this.eventSource.readyState !== EventSource.CLOSED &&
      this.currentTopic === topic
    ) {
      return;
    }

    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
      if (this.currentUrl) {
        this.emit("sse:disconnected", this.currentUrl);
      }
      this.eventSource = null;
    }

    const { hubUrl, withCredentials = false } = this.options;

    // Build the subscription URL with current topic
    const url = new URL(hubUrl);
    url.searchParams.append("topic", topic);

    if (this._lastEventId) {
      url.searchParams.set("lastEventID", this._lastEventId);
    }

    this.currentUrl = url.toString();
    this.currentTopic = topic;

    // Create EventSource connection
    this.eventSource = new EventSource(this.currentUrl, {
      withCredentials,
    });

    this.eventSource.onopen = () => {
      this.emit("sse:connected", this.currentUrl!);
    };

    this.eventSource.onmessage = async (event: MessageEvent) => {
      const html = event.data;
      // Track last event id for reconnection
      if (event.lastEventId) {
        this._lastEventId = event.lastEventId;
      }
      this.emit("sse:message", event, html);

      // If message is empty or only whitespace, refetch the current route
      if (!html || html.trim() === "") {
        this.emit("refetch:started", event);
        try {
          const win = this.app.doc.defaultView;
          const path = win ? win.location.pathname + win.location.search : "/";
          const response = await this.app.router.visit(
            path,
            { method: "GET" },
            false, // Don't push state, we're already on this page
          );

          if (response.result) {
            this.emit("refetch:success", event, response.html);
          } else {
            this.emit(
              "refetch:failed",
              event,
              new Error("Failed to render refetched content"),
            );
          }
        } catch (error) {
          this.emit("refetch:failed", event, error as Error);
        }
        return;
      }

      // Process the HTML through the app's render method
      const result = this.app.render(html);

      if (result) {
        this.emit("render:success", event, html);
      } else {
        this.emit("render:failed", event, html);
      }
    };

    this.eventSource.onerror = (error: Event) => {
      this.emit("sse:error", error);

      // If the connection is closed, emit disconnected
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.emit("sse:disconnected", this.currentUrl!);
      }
    };

    // Named SSE events: register listeners for each requested event name.
    const names = this.options.events;
    if (names && names.length > 0) {
      const source = this.eventSource;
      for (const name of names) {
        source.addEventListener(name, (event) => {
          const messageEvent = event as MessageEvent;
          if (messageEvent.lastEventId) {
            this._lastEventId = messageEvent.lastEventId;
          }
          this.emit("sse:named", name, messageEvent, messageEvent.data);
        });
      }
    }
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    // Unsubscribe from router events
    if (this.routerUnsubscribe) {
      this.routerUnsubscribe();
      this.routerUnsubscribe = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      if (this.currentUrl) {
        this.emit("sse:disconnected", this.currentUrl);
      }
      this.eventSource = null;
      this.currentUrl = null;
      this.currentTopic = null;
    }

    this.options = null;
  }

  /**
   * Check if currently connected
   */
  get connected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get the current connection URL
   */
  get url(): string | null {
    return this.currentUrl;
  }

  /**
   * Get the last event ID seen on this connection (useful for reconnection).
   */
  get lastEventId(): string | undefined {
    return this._lastEventId;
  }
}
