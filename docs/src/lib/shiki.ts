import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighterPromise: Promise<HighlighterCore> | null = null;

const SUPPORTED = new Set([
  "html",
  "tsx",
  "ts",
  "typescript",
  "js",
  "javascript",
  "bash",
  "sh",
  "shell",
  "json",
  "twig",
  "php",
  "css",
]);

export function isSupportedLang(lang: string | undefined): boolean {
  if (!lang) return false;
  return SUPPORTED.has(lang.toLowerCase());
}

export function getHighlighter(): Promise<HighlighterCore> {
  if (highlighterPromise) return highlighterPromise;
  highlighterPromise = createHighlighterCore({
    themes: [
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark.mjs"),
    ],
    langs: [
      import("shiki/langs/html.mjs"),
      import("shiki/langs/tsx.mjs"),
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/twig.mjs"),
      import("shiki/langs/php.mjs"),
      import("shiki/langs/css.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}
