# ⚡️ reactolith

> **Proof of Concept** — experimental, **not ready for production**.

`reactolith` lets you **write React components directly in HTML** so you can render and hydrate a React app from any backend (Symfony/Twig, Rails, Laravel, Django, …).

Return HTML from your backend; reactolith turns it into a live React app — including a built-in router that **preserves React state across navigations**.

📖 **Full documentation:** **<https://reactolith.github.io/reactolith/>**

---

## Install

```bash
npm install reactolith react react-dom
```

Requires Node 18+ and React 18 or 19.

---

## A 30-second tour

```html
<!-- index.html (rendered by your backend) -->
<div id="reactolith-app">
  <h1>Hello world</h1>
  <my-button>Click me</my-button>
</div>
```

```tsx
// src/main.tsx
import { App } from "reactolith";
import { MyButton } from "./components/my-button";

new App(({ is }) => (is === "my-button" ? MyButton : null));
```

Any tag name with a hyphen (`<my-button>`) is resolved to a React component;
everything else renders as a native element.

For larger apps, point `createLoader` at a folder of components and skip the
per-tag wiring:

```tsx
import { App, createLoader } from "reactolith";

new App(createLoader({
  modules: import.meta.glob("./components/ui/*.tsx"),
  prefix: "ui-",
}));
```

---

## Highlights

- 🔌 **Backend-agnostic** — works with any backend (Symfony, Rails, Laravel, …)
- 🔄 **State preserved across pages** — no resets on link clicks or form submits
- 📋 **Forms** — modify forms dynamically without losing state or focus
- 📡 **Realtime** — Mercure SSE pipes server pushes through the same render path
- 🧠 **Scroll restoration** — browser-like behavior across SPA navigations
- 🧩 **IDE autocomplete** — generate web-types for JetBrains/VS Code

See the docs for the full feature list, API reference, and end-to-end guides.

---

## Docs map

| Topic | Link |
|---|---|
| Install & set up | [Installation](https://reactolith.github.io/reactolith/installation/) |
| First app | [Quick Start](https://reactolith.github.io/reactolith/quick-start/) |
| Mental model | [How It Works](https://reactolith.github.io/reactolith/how-it-works/) |
| Props & slots | [Props](https://reactolith.github.io/reactolith/props/) · [Slots](https://reactolith.github.io/reactolith/slots/) |
| Forms & validation | [Forms](https://reactolith.github.io/reactolith/forms/) |
| Scroll | [Scroll Restoration](https://reactolith.github.io/reactolith/scroll-restoration/) |
| Realtime | [Mercure](https://reactolith.github.io/reactolith/mercure/) |
| SSR | [Server-Side Rendering](https://reactolith.github.io/reactolith/ssr/) |
| Tooling | [Web Types](https://reactolith.github.io/reactolith/web-types/) · [API Cheatsheet](https://reactolith.github.io/reactolith/api/) |

The docs site lives in [`/docs`](./docs) and is itself built with reactolith — every page is plain HTML hydrated into React.

---

## Development

```bash
npm install
npm run build       # dist/index.{mjs,cjs}, dist/index.d.ts, CLI bundle
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src tests
```

`prepublishOnly` runs `npm run build` so published artifacts always come from a fresh build.

Contributions welcome — open an issue or PR.
