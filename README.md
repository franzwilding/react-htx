# ⚡️ reactolith

> **Hotwire Turbo for React.** Render and morph a React app from server-generated HTML — Twig, ERB, Blade, Jinja, anything that prints strings.

`reactolith` lets you **write React components directly in HTML** so your backend stays in charge of routing, templates, permissions, and URLs, while React stays in charge of interactivity. It is **not Inertia for the masses** — it is a different approach: instead of shipping JSON page props and re-rendering a top-level component on every navigation, reactolith fetches the next HTML page, **morphs the existing React tree in place**, and preserves component state across navigation, form submits, and live server pushes.

📖 **Full documentation:** **<https://reactolith.github.io/reactolith/>**

---

## Why reactolith exists

I built reactolith because I wanted [Hotwire Turbo](https://turbo.hotwired.dev/) — but for React.

**Inertia.js** is the closest thing in the React world, and it is great, but it is fundamentally a different model: Inertia replaces the page-level component on every visit. There is no equivalent of Turbo's `morph` — you cannot keep a sidebar's collapsed state, a video playing, or a half-typed form alive across a backend-driven navigation. The whole "page" is a single JSON-fed component that gets swapped out.

reactolith takes the Turbo approach instead. The server returns **HTML, not JSON**. reactolith parses that HTML, diffs it against the live React tree, and updates only what changed — using React's own reconciler. Component state, focus, scroll, open dialogs, mounted iframes: they all survive.

That tiny difference unlocks something bigger: it makes the **[Majestic Monolith](https://signalvnoise.com/svn3/the-majestic-monolith/)** a serious option again for teams who want React. You can keep one Rails / Symfony / Laravel / Django app — one router, one auth layer, one set of URL helpers, one deployment — and still ship a sticky, app-like React frontend on top of it. No SPA-shaped backend. No GraphQL gateway. No `/api/v2` to keep in sync with the UI. Templates render HTML; reactolith makes that HTML interactive.

If you've ever looked at the Hotwire stack and wished you could use React components inside it, reactolith is that.

---

## Install

```bash
npm install reactolith react react-dom
```

Requires Node 18+ and React 19.

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

- 🔌 **Backend-agnostic** — works with any backend (Symfony, Rails, Laravel, Django, …)
- 🔄 **Morphing navigation** — like Turbo's `morph`: the tree is diffed in place, React state is preserved across link clicks and form submits
- 📋 **Forms** — modify forms dynamically (server can add/remove fields on a checkbox click) without losing input state or focus
- 📡 **Realtime** — Mercure SSE pipes server-pushed HTML through the same render path
- 🧠 **Scroll restoration** — browser-like behavior across SPA-style navigations
- 🧩 **IDE autocomplete** — generate web-types for JetBrains/VS Code so `<my-button>` autocompletes like a native element
- 🪶 **No new backend layer** — no JSON page-prop contract to maintain, no shadow API; your existing controllers and templates are the API

See the docs for the full feature list, API reference, and end-to-end guides.

---

## Reactolith vs. the alternatives

If you came here looking for an alternative to one of these, head to the
side-by-side comparisons:

- [reactolith vs Inertia.js](https://reactolith.github.io/reactolith/comparisons/inertia/) — what Inertia gives you, what it gives up, and where reactolith fits
- [reactolith vs Hotwire Turbo](https://reactolith.github.io/reactolith/comparisons/turbo/) — same backend-driven philosophy, but for React component trees

---

## Docs map

| Topic | Link |
|---|---|
| Why reactolith | [Comparisons](https://reactolith.github.io/reactolith/comparisons/) |
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
