import { useEffect, useRef } from "react";
import { useApp } from "./provider/AppContext";

/**
 * Generic hook for subscribing to a Mercure topic and receiving raw message data.
 * This is a low-level hook that handles EventSource connection management.
 *
 * Re-subscribes automatically when `app.mercureConfig` is reassigned, so it is
 * safe to set the config after mount (e.g. once your auth flow finishes).
 *
 * Callbacks are tracked via refs, so passing inline functions (the idiomatic
 * React style) does **not** cause the underlying EventSource to be torn down
 * and rebuilt on every render. Multiple subscribers to the same topic share a
 * single EventSource via `app.mercure.subscribeRaw`.
 *
 * @param topic - The Mercure topic to subscribe to
 * @param onMessage - Callback when a message is received
 * @param onError - Optional callback when an error occurs
 *
 * @internal This is a low-level hook. Use useMercureTopic or MercureLive instead.
 */
export function useMercureEventSource(
  topic: string,
  onMessage: (data: string, event: MessageEvent) => void,
  onError?: (error: Event) => void,
): void {
  const app = useApp();
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    return app.mercure.subscribeRaw(
      topic,
      (data, event) => onMessageRef.current(data, event),
      (error) => onErrorRef.current?.(error),
    );
  }, [topic, app]);
}
