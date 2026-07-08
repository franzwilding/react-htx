export type Handler<Args extends readonly unknown[]> = (...args: Args) => void;

export type EventMap = Record<string, readonly unknown[]>;

export class EventEmitter<TEvents extends EventMap> {
  private readonly listeners = new Map<
    keyof TEvents,
    Set<Handler<readonly unknown[]>>
  >();

  on<K extends keyof TEvents>(
    type: K,
    handler: Handler<TEvents[K]>,
  ): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler as Handler<readonly unknown[]>);
    return () => this.off(type, handler);
  }

  off<K extends keyof TEvents>(type: K, handler: Handler<TEvents[K]>): void {
    this.listeners.get(type)?.delete(handler as Handler<readonly unknown[]>);
  }

  protected emit<K extends keyof TEvents>(type: K, ...args: TEvents[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    // Copy before iterating so handlers that subscribe/unsubscribe during
    // emit don't affect this dispatch.
    for (const handler of Array.from(set)) {
      handler(...args);
    }
  }

  protected clearListeners(): void {
    this.listeners.clear();
  }
}
