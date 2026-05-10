import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../src/util/EventEmitter";

type TestEvents = {
  "evt:single": [value: number];
  "evt:multi": [name: string, count: number];
  "evt:none": [];
};

class TestEmitter extends EventEmitter<TestEvents> {
  public fire<K extends keyof TestEvents>(
    type: K,
    ...args: TestEvents[K]
  ): void {
    this.emit(type, ...args);
  }
  public reset(): void {
    this.clearListeners();
  }
}

describe("EventEmitter", () => {
  it("delivers payload tuples to subscribed listeners", () => {
    const emitter = new TestEmitter();
    const listener = vi.fn();
    emitter.on("evt:multi", listener);

    emitter.fire("evt:multi", "hi", 3);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("hi", 3);
  });

  it("supports zero-argument events", () => {
    const emitter = new TestEmitter();
    const listener = vi.fn();
    emitter.on("evt:none", listener);

    emitter.fire("evt:none");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();
  });

  it("returns an unsubscribe function from on()", () => {
    const emitter = new TestEmitter();
    const listener = vi.fn();
    const unsubscribe = emitter.on("evt:single", listener);

    emitter.fire("evt:single", 1);
    unsubscribe();
    emitter.fire("evt:single", 2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it("removes a listener via off()", () => {
    const emitter = new TestEmitter();
    const listener = vi.fn();
    emitter.on("evt:single", listener);
    emitter.off("evt:single", listener);

    emitter.fire("evt:single", 42);

    expect(listener).not.toHaveBeenCalled();
  });

  it("dispatches to multiple listeners on the same event", () => {
    const emitter = new TestEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("evt:single", a);
    emitter.on("evt:single", b);

    emitter.fire("evt:single", 7);

    expect(a).toHaveBeenCalledWith(7);
    expect(b).toHaveBeenCalledWith(7);
  });

  it("does not deliver across event types", () => {
    const emitter = new TestEmitter();
    const single = vi.fn();
    const multi = vi.fn();
    emitter.on("evt:single", single);
    emitter.on("evt:multi", multi);

    emitter.fire("evt:single", 1);

    expect(single).toHaveBeenCalledTimes(1);
    expect(multi).not.toHaveBeenCalled();
  });

  it("is safe to emit when no listeners are registered", () => {
    const emitter = new TestEmitter();
    expect(() => emitter.fire("evt:single", 0)).not.toThrow();
  });

  it("is safe to off a listener that was never registered", () => {
    const emitter = new TestEmitter();
    expect(() => emitter.off("evt:single", vi.fn())).not.toThrow();
  });

  it("lets a listener unsubscribe a sibling without skipping it for the in-flight emit", () => {
    const emitter = new TestEmitter();
    const a = vi.fn();
    const b = vi.fn(() => emitter.off("evt:single", a));

    emitter.on("evt:single", b);
    emitter.on("evt:single", a);

    emitter.fire("evt:single", 1);

    expect(b).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith(1);

    emitter.fire("evt:single", 2);

    expect(b).toHaveBeenCalledTimes(2);
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("does not invoke a listener registered during the current emit", () => {
    const emitter = new TestEmitter();
    const late = vi.fn();
    const adder = vi.fn(() => emitter.on("evt:single", late));

    emitter.on("evt:single", adder);

    emitter.fire("evt:single", 1);

    expect(adder).toHaveBeenCalledTimes(1);
    expect(late).not.toHaveBeenCalled();

    emitter.fire("evt:single", 2);

    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith(2);
  });

  it("clearListeners() removes all subscriptions", () => {
    const emitter = new TestEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("evt:single", a);
    emitter.on("evt:multi", b);

    emitter.reset();
    emitter.fire("evt:single", 1);
    emitter.fire("evt:multi", "x", 2);

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
