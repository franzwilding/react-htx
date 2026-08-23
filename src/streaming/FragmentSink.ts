import type { FragmentEntry } from "./fragments";

/**
 * A source of out-of-band fragments. Streams are inert until `start()` is
 * called — the App starts the stream that belongs to a render *after* that
 * render, so the fragments cannot be wiped by the very page they belong to.
 */
export interface FragmentStream {
  /** Begin producing fragments. Called at most once. */
  start(): void;
  /** Stop producing and release the underlying resource. */
  cancel(): void;
}

/**
 * The consumer side, implemented by `App`. Streams talk to the sink instead of
 * importing `App`, so the transports stay free of a runtime dependency on it.
 */
export interface FragmentSink {
  /** Document the app lives in. */
  readonly doc: Document;
  /** Root element the app renders into (never a source of fragments). */
  readonly element: HTMLElement;
  /** Hand over fragments. Ignored unless `stream` is the current stream. */
  acceptFragments(stream: FragmentStream, fragments: FragmentEntry[]): void;
  /** Report that no more fragments will arrive on `stream`. */
  endStream(stream: FragmentStream): void;
}
