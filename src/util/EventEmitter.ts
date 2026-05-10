export type Handler<Args extends readonly unknown[]> = (...args: Args) => void;

export type EventMap = Record<string, readonly unknown[]>;

export class EventEmitter<TEvents extends EventMap> {
  private listeners: Partial<
    Record<keyof TEvents, Set<Handler<TEvents[keyof TEvents]>>>
  > = {};

  on<K extends keyof TEvents>(
    type: K,
    handler: Handler<TEvents[K]>,
  ): () => void {
    let set = this.listeners[type] as Set<Handler<TEvents[K]>> | undefined;
    if (!set) {
      set = new Set<Handler<TEvents[K]>>();
      this.listeners[type] = set as unknown as Set<
        Handler<TEvents[keyof TEvents]>
      >;
    }
    set.add(handler);
    return () => this.off(type, handler);
  }

  off<K extends keyof TEvents>(type: K, handler: Handler<TEvents[K]>): void {
    this.listeners[type]?.delete(handler as Handler<TEvents[keyof TEvents]>);
  }

  protected emit<K extends keyof TEvents>(type: K, ...args: TEvents[K]): void {
    const set = this.listeners[type];
    if (!set) return;
    for (const h of Array.from(set)) {
      (h as Handler<TEvents[K]>)(...args);
    }
  }

  protected clearListeners(): void {
    this.listeners = {};
  }
}
