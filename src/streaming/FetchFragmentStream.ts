import { FRAGMENT_READY_END } from "./protocol";
import { parseFragments, type FragmentEntry } from "./fragments";
import type { FragmentSink, FragmentStream } from "./FragmentSink";

/**
 * Fragments of a router navigation: the tail of a response whose shell was
 * already handed to `App.render()`.
 *
 * The reader is pumped in the background and complete units are cut out of the
 * buffer on `</rl-fragment>` — the closing tag is the only boundary a byte
 * stream can be split on safely.
 */
export class FetchFragmentStream implements FragmentStream {
  private readonly sink: FragmentSink;
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly decoder: TextDecoder;
  private buffer: string;
  private cancelled = false;
  private started = false;

  constructor(
    sink: FragmentSink,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    buffer = "",
    decoder: TextDecoder = new TextDecoder(),
  ) {
    this.sink = sink;
    this.reader = reader;
    this.buffer = buffer;
    this.decoder = decoder;
  }

  start(): void {
    if (this.started || this.cancelled) return;
    this.started = true;
    void this.pump();
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    void Promise.resolve(this.reader.cancel()).catch(() => {});
  }

  private async pump(): Promise<void> {
    // Whatever arrived together with the shell is already in the buffer.
    this.flush();

    try {
      for (;;) {
        const { done, value } = await this.reader.read();
        if (this.cancelled) return;
        if (value) this.buffer += this.decoder.decode(value, { stream: true });
        this.flush();
        if (done) break;
      }
    } catch {
      // Reader cancelled or the connection died: whatever we applied stays,
      // the rest is reported as pending by `endStream`.
    }

    if (!this.cancelled) this.sink.endStream(this);
  }

  private flush(): void {
    const entries: FragmentEntry[] = [];
    for (;;) {
      const index = this.buffer.indexOf(FRAGMENT_READY_END);
      if (index === -1) break;
      const end = index + FRAGMENT_READY_END.length;
      const chunk = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end);
      entries.push(...parseFragments(chunk, this.sink.doc));
    }
    if (entries.length > 0 && !this.cancelled) {
      this.sink.acceptFragments(this, entries);
    }
  }
}
