import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  // ESLint React replaces eslint-plugin-react, which never gained support for
  // ESLint 10 (its peer range stops at ^9.7 and its rules call APIs ESLint 10
  // removed). Rules are named `react-x/…` / `react-dom/…` now.
  eslintReact.configs["recommended-typescript"],
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // ESLint React carries its own copies of the hooks rules; the official
  // plugin configured above stays the source of truth for those.
  eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"],
  prettier,
  // ESLint React's recommended set is broader than eslint-plugin-react's was.
  // These are the rules whose advice this library deliberately does not take;
  // delete an entry to see its findings again.
  {
    rules: {
      // Children are keyed by their position on purpose — a fragment name is
      // the only document-wide address reactolith has, everything else is
      // sibling-local identity.
      "@eslint-react/no-array-index-key": "off",
      // React 19 modernisation suggestions, not defects: `use()` over
      // `useContext()`, `<Context>` over `<Context.Provider>`, and dropping
      // `forwardRef`. Worth a pass of their own, not this one.
      "@eslint-react/no-use-context": "off",
      "@eslint-react/no-context-provider": "off",
      "@eslint-react/no-forward-ref": "off",
      // Pushing server-sent HTML and router state into React state from an
      // effect is what this library does — the effect reacting to the
      // outside world *is* the feature, not a render-derived value.
      "@eslint-react/set-state-in-effect": "off",
      // Naming conventions for refs and useState setters.
      "@eslint-react/naming-convention-ref-name": "off",
      "@eslint-react/use-state": "off",
    },
  },
  // Tests intentionally use `any` for mocks and stubs, and frequently
  // shadow imported test utilities while iterating on assertions.
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
    },
  },
]);
