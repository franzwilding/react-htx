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
