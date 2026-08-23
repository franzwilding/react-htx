/**
 * Wire constants for out-of-band HTML fragments.
 *
 * Backends can import these instead of retyping the strings:
 *
 * ```ts
 * import { SHELL_END, FRAGMENT_ATTRIBUTE } from "reactolith";
 * ```
 */

/**
 * Comment that marks the end of the streamed shell. The Router cuts the
 * response here: everything before it is the page, everything after it is a
 * stream of fragments. A response *without* the sentinel is read to the end
 * and rendered as one page, exactly as before — so pages that do not stream
 * need no changes and no response header.
 */
export const SHELL_END = "<!--rl-shell-end-->";

/**
 * Attribute that turns an element into a fragment placeholder, and a
 * `<template>` into the fragment that replaces it.
 */
export const FRAGMENT_ATTRIBUTE = "data-fragment";

/**
 * Completion marker. A `<template>` that appears in the DOM is not finished —
 * its content is still arriving. The empty element behind it proves that
 * everything in front of it is whole.
 */
export const FRAGMENT_READY_TAG = "rl-fragment";

/**
 * Closing tag of {@link FRAGMENT_READY_TAG}; the only reliable unit boundary
 * in a byte stream that may split anywhere.
 */
export const FRAGMENT_READY_END = `</${FRAGMENT_READY_TAG}>`;

/**
 * Media type of a response that carries nothing but fragments. The content
 * type is the contract: a response labelled this way is applied to the live
 * tree instead of being rendered as a page.
 */
export const FRAGMENTS_CONTENT_TYPE = "text/vnd.reactolith.fragments+html";

/**
 * What the Router asks for on a navigation when the app can apply fragments.
 * An app that cannot must never invite them, so this is only sent with
 * `streaming: true`.
 */
export const FRAGMENTS_ACCEPT = `${FRAGMENTS_CONTENT_TYPE}, text/html;q=0.9, */*;q=0.8`;

/** Marks a router navigation (as opposed to an address-bar load). */
export const REACTOLITH_HEADER = "X-Reactolith";

/** Protocol version sent in {@link REACTOLITH_HEADER}. */
export const REACTOLITH_VERSION = "1";

/** Path the navigation starts on — the page the visitor is leaving. */
export const REACTOLITH_FROM_HEADER = "X-Reactolith-From";

/** Comma-separated placeholder names currently in the tree (opt-in). */
export const REACTOLITH_FRAGMENTS_HEADER = "X-Reactolith-Fragments";
