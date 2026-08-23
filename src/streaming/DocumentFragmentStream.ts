import { FRAGMENT_ATTRIBUTE, FRAGMENT_READY_TAG } from "./protocol";
import type { FragmentEntry } from "./fragments";
import type { FragmentSink, FragmentStream } from "./FragmentSink";
import { isTemplateElement } from "../util/dom";

/**
 * Fragments of the *first* page load: the ones the HTML parser itself appends
 * to the document while the response keeps arriving.
 *
 * A `MutationObserver` on `<body>` picks up what the parser writes; one manual
 * sweep at start picks up whatever landed before the app booted (an `async`
 * entry script can easily run after the first fragments). `DOMContentLoaded`
 * ends the stream — at that point the parser is done and anything still
 * pending is never coming.
 */
export class DocumentFragmentStream implements FragmentStream {
  private readonly sink: FragmentSink;
  private observer: MutationObserver | null = null;
  private ended = false;
  private readonly onParsed = () => {
    this.sweep();
    this.finish();
  };

  constructor(sink: FragmentSink) {
    this.sink = sink;
  }

  start(): void {
    const doc = this.sink.doc;
    const view = doc.defaultView;

    if (doc.body && typeof view?.MutationObserver === "function") {
      this.observer = new view.MutationObserver(() => this.sweep());
      this.observer.observe(doc.body, { childList: true, subtree: true });
    }

    this.sweep();

    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", this.onParsed);
      return;
    }

    // The document is already parsed: the sweep above saw everything there
    // will ever be.
    this.finish();
  }

  cancel(): void {
    this.teardown();
    this.ended = true;
  }

  private teardown(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.sink.doc.removeEventListener("DOMContentLoaded", this.onParsed);
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.teardown();
    this.sink.endStream(this);
  }

  /**
   * Collect every complete fragment currently in the document and take it out
   * of the DOM. A `<template>` counts as complete once an `<rl-fragment>`
   * marker appears behind it — until then its content is still being parsed.
   */
  private sweep(): void {
    if (this.ended) return;
    const doc = this.sink.doc;
    if (!doc.body) return;

    const nodes = Array.from(
      doc.querySelectorAll(
        `template[${FRAGMENT_ATTRIBUTE}], ${FRAGMENT_READY_TAG}`,
      ),
    );

    const entries: FragmentEntry[] = [];
    const consumed: Element[] = [];
    let awaiting: HTMLTemplateElement[] = [];

    for (const node of nodes) {
      // Never treat the app's own markup as a fragment: a slot may legally be
      // a `<template data-fragment="…">` placeholder.
      if (this.sink.element.contains(node)) continue;

      if (isTemplateElement(node)) {
        awaiting.push(node);
        continue;
      }

      for (const template of awaiting) {
        const name = template.getAttribute(FRAGMENT_ATTRIBUTE);
        if (name !== null) {
          entries.push([name, doc.importNode(template.content, true)]);
        }
        consumed.push(template);
      }
      awaiting = [];
      consumed.push(node);
    }

    // Left in place, templates and markers pile up under the page for the
    // whole length of the stream.
    consumed.forEach((node) => node.remove());

    if (entries.length > 0) this.sink.acceptFragments(this, entries);
  }
}
