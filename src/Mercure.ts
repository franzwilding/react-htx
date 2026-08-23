import { App } from "./App";
import { EventEmitter } from "./util/EventEmitter";
import type { Handler } from "./util/EventEmitter";

export type { Handler };

export type MercureEventMap = {
  "sse:connected": [url: string];
  "sse:disconnected": [url: string];
  "sse:message": [event: MessageEvent, html: string];
  /**
   * Fires for SSE messages with a named event type (`event: foo\ndata: …`).
   * Subscribe to a name via `events` in MercureOptions to start receiving them.
   */
  "sse:named": [name: string, event: MessageEvent, data: string];
  /**
   * A push that carried only `<template data-fragment="…">` was applied to the
   * live tree. No page render happened.
   */
  "fragments:applied": [event: MessageEvent, names: string[]];
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

export type RawMessageListener = (data: string, event: MessageEvent) => void;
export type RawErrorListener = (error: Event) => void;

type RawEntry = {
  source: EventSource | null;
  messageListeners: Set<RawMessageListener>;
  errorListeners: Set<RawErrorListener>;
};

export class Mercure extends EventEmitter<MercureEventMap> {
  private readonly app: App;
  private eventSource: EventSource | null = null;
  private currentUrl: string | null = null;
  private currentTopic: string | null = null;
  private options: MercureOptions | null = null;
  private routerUnsubscribe: (() => void) | null = null;
  private _lastEventId: string | undefined;
  private rawSources = new Map<string, RawEntry>();
  private rawConfigUnsubscribe: (() => void) | null = null;

  constructor(app: App) {
    super();
    this.app = app;
  }

  /**
   * Build a Mercure subscription URL for a given topic. Centralizes URL
   * construction so all consumers (path-based `subscribe` and per-topic
   * `subscribeRaw`) agree on the wire format.
   */
  private buildTopicUrl(
    hubUrl: string,
    topic: string,
    lastEventId?: string,
  ): string {
    const url = new URL(hubUrl);
    url.searchParams.append("topic", topic);
    if (lastEventId) {
      url.searchParams.set("lastEventID", lastEventId);
    }
    return url.toString();
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
    this.routerUnsubscribe?.();

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
    this.closeEventSource();

    const { hubUrl, withCredentials = false } = this.options;

    this.currentUrl = this.buildTopicUrl(hubUrl, topic, this._lastEventId);
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

          if (response.cancelled) {
            // Superseded by a newer visit (e.g. another empty message
            // arrived while this refetch was in flight). The newer visit
            // will report success/failure on its own.
            return;
          }

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

      // A push that is nothing but fragment templates updates just those
      // parts — the rest of the tree is not even walked. A page that merely
      // contains a template still renders as a page.
      if (this.app.streaming && this.app.isFragmentPayload(html)) {
        const applied = this.app.applyFragments(html);
        this.emit("fragments:applied", event, applied);
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
   * Subscribe to raw SSE messages on a single Mercure topic, sharing one
   * EventSource per topic across all listeners.
   *
   * - URL is built from `app.mercureConfig`. If the config is missing, a
   *   warning is logged and a no-op unsubscribe is returned.
   * - When `app.mercureConfig` changes, all open raw connections are closed
   *   and re-opened with the new config — listeners stay registered.
   * - The EventSource is closed automatically when the last listener for a
   *   topic unsubscribes.
   *
   * Returns an unsubscribe function. Always call it on cleanup.
   */
  subscribeRaw(
    topic: string,
    onMessage: RawMessageListener,
    onError?: RawErrorListener,
  ): () => void {
    let entry = this.rawSources.get(topic);
    if (!entry) {
      entry = {
        source: null,
        messageListeners: new Set(),
        errorListeners: new Set(),
      };
      this.rawSources.set(topic, entry);
      this.openRawSource(entry, topic);
    }

    entry.messageListeners.add(onMessage);
    if (onError) entry.errorListeners.add(onError);

    this.ensureRawConfigListener();

    return () => {
      const e = this.rawSources.get(topic);
      if (!e) return;
      e.messageListeners.delete(onMessage);
      if (onError) e.errorListeners.delete(onError);
      if (e.messageListeners.size === 0 && e.errorListeners.size === 0) {
        e.source?.close();
        this.rawSources.delete(topic);
        if (this.rawSources.size === 0 && this.rawConfigUnsubscribe) {
          this.rawConfigUnsubscribe();
          this.rawConfigUnsubscribe = null;
        }
      }
    };
  }

  private openRawSource(entry: RawEntry, topic: string): void {
    const config = this.app.mercureConfig;
    if (!config) {
      console.warn(
        `Mercure.subscribeRaw: app.mercureConfig is not set. ` +
          `Add a "data-mercure-hub-url" attribute to your root element ` +
          `or assign "app.mercureConfig" before subscribing to "${topic}".`,
      );
      return;
    }

    const url = this.buildTopicUrl(config.hubUrl, topic);
    const source = new EventSource(url, {
      withCredentials: config.withCredentials ?? false,
    });

    source.onmessage = (event: MessageEvent) => {
      entry.messageListeners.forEach((l) => l(event.data, event));
    };
    source.onerror = (error: Event) => {
      entry.errorListeners.forEach((l) => l(error));
    };

    entry.source = source;
  }

  private ensureRawConfigListener(): void {
    if (this.rawConfigUnsubscribe) return;
    this.rawConfigUnsubscribe = this.app.onMercureConfigChange(() => {
      // Config changed: close all open raw connections and reopen with the
      // new config. Listeners stay registered.
      for (const [topic, entry] of this.rawSources) {
        entry.source?.close();
        entry.source = null;
        this.openRawSource(entry, topic);
      }
    });
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

    this.closeEventSource();
    this.options = null;
  }

  /**
   * Close the active EventSource (if any), emit `sse:disconnected`, and reset
   * the connection state.
   */
  private closeEventSource(): void {
    if (!this.eventSource) return;
    this.eventSource.close();
    if (this.currentUrl) {
      this.emit("sse:disconnected", this.currentUrl);
    }
    this.eventSource = null;
    this.currentUrl = null;
    this.currentTopic = null;
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
