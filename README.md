# ⚡️ reactolith

> **Proof of Concept** – This project is still experimental and **not ready for production**.

`reactolith` lets you **write React components directly in HTML** — making it possible to render and hydrate a React app using server-generated HTML from any backend (e.g. Symfony/Twig, Rails, Laravel, Django, etc.).

✨ Instead of manually wiring React components everywhere, just return HTML from your backend and `reactolith` will transform it into a live, interactive React application.

It even includes a **built-in router** that intercepts link clicks and form submissions, fetches the next page via AJAX, and updates only what changed — **keeping React state intact between navigations**.

---

## 🚀 Features
- 🔌 **Backend-agnostic** – Works with any backend (Symfony, Rails, Laravel, etc.)
- 🛠 **Use existing backend helpers** (Twig path functions, permission checks, etc.)
- 🔄 **State preserved across pages** – No resets on navigation
- 📋 **Form support** – Modify forms dynamically (e.g., add buttons on checkbox click) **without losing state or focus**
- 🪶 **Lightweight** – Just a few lines of setup, no heavy dependencies
- 📡 **Real-time updates** – Works with Mercure Server-Sent-Events to push updates from the backend to the frontend

---

## 📦 Installation

```bash
npm install reactolith
```

Since react and react-dom are peer dependencies, make sure to also install them:
```bash
npm install react react-dom
```

---

### How It Works

1. **Initial Load**: Symfony renders HTML with Twig, `reactolith` hydrates it into React components
2. **Navigation**: Clicking links fetches new HTML via AJAX, React reconciles the differences
3. **Real-time**: Mercure pushes HTML updates from server, UI updates automatically
4. **State Preserved**: React component state survives both navigation and real-time updates

---

## 💡 Usage

Your backend returns simple HTML:

```html
<html lang="en">
  <body>
    <div id="reactolith-app">
      <h1>Hello world</h1>
      <ui-button type="primary">This will be a shadcn button</ui-button>
    </div>
  </body>
</html>
```

Your frontend mounts the reactolith app:
```ts
// app.ts
import { App, createLoader } from 'reactolith'

// Vite's import.meta.glob discovers every component file lazily.
const component = createLoader({
  modules: import.meta.glob('./components/ui/*.tsx'),
  prefix: 'ui-',
})

// Uses the HTML element with id="reactolith-app" as root
new App(component)
```

`createLoader` resolves `<ui-button>` → `./components/ui/button.tsx` and picks the
matching export (`Button`, `default`, etc.). Names with multiple kebab segments
also fall back to a parent file — `<ui-accordion-item>` finds `accordion.tsx`
exporting `AccordionItem`. See [Loading Components](#-loading-components) below
for more.

### 🎨 Example with Custom Root Component & Selector
```ts
// app.ts
import { App, createLoader } from 'reactolith'
import { AppProvider } from './providers/app-provider.tsx'

const component = createLoader({
  modules: import.meta.glob('./components/**/*.tsx'),
})

new App(component, AppProvider, '#app')
```

```tsx
// providers/app-provider.tsx
import React, { ElementType } from "react"
import { App, RootComponent } from "reactolith"
import { RouterProvider } from "react-aria-components"
import { ThemeProvider } from "./theme-provider"

export const AppProvider: React.FC<{
  app: App
  element: HTMLElement
  component: ElementType
}> = ({ app, element, component }) => (
  <React.StrictMode>
    <RouterProvider navigate={app.router.navigate}>
      <ThemeProvider>
        <RootComponent element={element} component={component} />
      </ThemeProvider>
    </RouterProvider>
  </React.StrictMode>
)
```

---

## 📥 Loading Components

`createLoader` is the recommended way to wire up your component folder. It
covers the two common cases — a directory of shadcn components, or a folder of
custom components — without any per-component configuration.

```ts
import { App, createLoader } from 'reactolith'

const component = createLoader({
  modules: import.meta.glob('./components/ui/*.tsx'),
  prefix: 'ui-', // strip "ui-" before resolving
})

new App(component)
```

### Resolution rules

For a tag like `<ui-accordion-item>`, the loader:

1. Strips the `ui-` prefix.
2. Looks for a file whose basename matches the kebab name (`accordion-item.tsx`).
3. If no match, removes trailing kebab segments and tries again
   (`accordion.tsx`).
4. From the resolved module, picks the export with a matching PascalCase name
   (`AccordionItem`), or the `default` export, or a case-insensitive match.

This covers shadcn's typical layout (one file with several related exports) and
single-component files with default exports.

### Mixing shadcn with custom overrides

Pass multiple module maps to layer custom implementations on top of shadcn:

```ts
const component = createLoader({
  modules: [
    import.meta.glob('./components/custom/*.tsx'), // takes priority
    import.meta.glob('./components/ui/*.tsx'),
  ],
  prefix: 'ui-',
})
```

When both folders contain `button.tsx`, the custom one wins.

### Options

| Option       | Type                                | Description                                                                  |
|--------------|-------------------------------------|------------------------------------------------------------------------------|
| `modules`    | `ModuleMap` or `ModuleMap[]`        | Output of `import.meta.glob`. Earlier maps take priority.                    |
| `prefix`     | `string`                            | Prefix to strip from `is` before resolving (e.g. `"ui-"`).                   |
| `fallback`   | `ReactNode`                         | Rendered while a component is being lazy-loaded. Default `null`.             |
| `onMissing`  | `(name, is) => ComponentType`       | Called when no module resolves; return a placeholder to render in its place. |

---

## 📋 Forms

Use `<Form>` and `<FormField>` to render forms that integrate cleanly with
backend validation and reactolith's submission model.

```tsx
import { Form, FormField, useFormSubmitting, useFormField } from 'reactolith'

function MyForm({ errors }) {
  return (
    <Form action="/users" method="POST" errors={errors}>
      <FormField name="email">
        <input name="email" />
        <FieldError />
      </FormField>
      <FormField name="password">
        <input name="password" type="password" />
        <FieldError />
      </FormField>
      <SubmitButton />
    </Form>
  )
}

function FieldError() {
  const field = useFormField()
  if (!field?.invalid) return null
  return <span role="alert">{field.errors[0].message}</span>
}

function SubmitButton() {
  const submitting = useFormSubmitting()
  return <button type="submit" disabled={submitting}>{submitting ? '…' : 'Save'}</button>
}
```

### Backend validation errors

Render the form (and any backend errors) on the server, then ship them to the
frontend via `json-errors`:

```html
<my-form
  action="/users"
  method="POST"
  json-errors='[{"name":"email","message":"Already taken"}]'
>
  <ui-form-field name="email">
    <ui-input name="email" />
  </ui-form-field>
</my-form>
```

After submission reactolith re-renders the new HTML — including new errors —
without losing component state.

### Touched behavior

As soon as the user changes a field, that field's errors disappear from the
summary and the field's own `invalid` flag flips to `false`. This is tracked by
*error reference*, so when the backend returns a fresh error list those new
errors show up immediately (without an explicit reset).

You can also pre-mark errors as touched from the backend:

```json
[
  { "name": "email", "message": "Invalid", "touched": true }
]
```

### Submitting state

`useFormSubmitting()` returns `true` while the form has been submitted but the
next navigation has not yet finished. Use it for spinners, disabled buttons,
etc. The state is per-`<Form>`, so multiple forms on a page can each track
their own.

### Hooks

| Hook                     | Returns                                           |
|--------------------------|---------------------------------------------------|
| `useFormSubmitting()`    | `boolean` — whether the surrounding form is busy. |
| `useFormErrors(name?)`   | Errors for a single field, or all non-touched.    |
| `useFormErrorsContext()` | Full context including `touchErrors`.             |
| `useFormField()`         | The surrounding `<FormField>`'s state, or `null`. |

`<Form>` accepts an optional `onSubmit` handler. Calling `event.preventDefault()`
inside it stops the request entirely (reactolith's Router will not pick it up
either), which is useful for client-side validation.

---

## 🔄 Navigation Without Losing State

When navigating, `reactolith` fetches the **next HTML page** and applies **only the differences** using React’s reconciliation algorithm.
👉 This means component state is preserved (e.g., toggles, inputs, focus).

```html
<!-- page1.html -->
<div id="reactolith-app">
  <h1>Page 1</h1>
  <ui-toggle json-pressed="false">Toggle</ui-toggle>
  <a href="page2.html">Go to page 2</a>
</div>
```

```html
<!-- page2.html -->
<div id="reactolith-app">
  <h1>Page 2</h1>
  <ui-toggle json-pressed="true">Toggle</ui-toggle>
  <a href="page1.html">Go to page 1</a>
</div>
```

Only the `<h1>` text and the `pressed` prop are updated — everything else remains untouched ✅.

---

## Props

If you pass props to your reactolith components like this: 
```html
<my-component enabled name="test" data-foo="baa" as="{my-other-component}" json-config='{ "foo": "baa" }'
```

your components will get this props: 
```tsx
const props = {
    enabled: true,
    name: 'test',
    foot: 'baa',
    as: <MyOtherComponent />,
    config: { foo: 'baa' },
}
```

---

## Slots

reactolith also provides a simple slot mechanism: Every child if a reactolith-component with a slot attribute will be 
transformed to a slot property, holding the children of the element:

```html
<my-component>
    <template slot="header"><h1>My header content</h1></template>
    <div slot="footer">My footer content</div>
</my-component>
```

your components will get this props:

```tsx
function MyComponent({ header, footer } : { header : ReactNode, footer : ReactNode }) {
    <article>
        <header>{header}</header>
        <div>My content</div>
        <footer>{footer}</footer>
        <aside>
            <footer>{footer}</footer>
        </aside>
    </article>
}
```

---

## 🔄 Scroll Restoration

`reactolith` automatically manages scroll position during navigation, just like a traditional multi-page website:

| Navigation | Behavior |
|---|---|
| Link click / Form submit | Scrolls to top |
| URL with `#hash` | Scrolls to the hash element |
| Browser Back / Forward | Restores previous scroll position |

Scroll positions are stored in `sessionStorage`, so they survive page refreshes within the same tab.

### Preserve Scroll Position

Sometimes you don't want to scroll to the top after navigation (e.g., in-page filters, pagination). Add `data-scroll="preserve"` to the link or form:

```html
<!-- Link preserves scroll position -->
<a href="/products?page=2" data-scroll="preserve">Next Page</a>

<!-- Form preserves scroll position -->
<form action="/search" method="GET" data-scroll="preserve">
  <input type="text" name="q" />
  <button type="submit">Search</button>
</form>
```

### Programmatic Navigation

```typescript
// Default: scrolls to top
router.navigate("/page");

// Preserve current scroll position
router.navigate("/page", { scroll: "preserve" });
```

### Custom Scroll Container

By default, `reactolith` auto-detects the scroll container by walking up the DOM from the root element and finding the nearest ancestor with `overflow-y: auto|scroll`. If none is found, `window` is used.

You can override this with an explicit selector:

```html
<div id="reactolith-app" data-scroll-container="#main-content">
  ...
</div>
```

---

## 📡 Real-time Updates with Mercure

`reactolith` supports **Server-Sent Events (SSE)** via [Mercure](https://mercure.rocks/) for real-time updates from your backend. When the server publishes an update, the HTML is automatically rendered — just like with router navigation.

Mercure automatically subscribes to the **current URL pathname** as the topic and re-subscribes when the route changes.

### Auto-Configuration (Recommended)

The easiest way to configure Mercure is to add the `data-mercure-hub-url` attribute to your root element:

```html
<div id="reactolith-app" data-mercure-hub-url="https://example.com/.well-known/mercure">
  <!-- Your content -->
</div>

<!-- With credentials (cookies): -->
<div id="reactolith-app"
     data-mercure-hub-url="https://example.com/.well-known/mercure"
     data-mercure-with-credentials>
  <!-- Your content -->
</div>
```

```typescript
import { App, Mercure } from "reactolith";

const app = new App(component);
// mercureConfig is automatically set from data-mercure-hub-url attribute

const mercure = new Mercure(app);
mercure.subscribe(app.mercureConfig!);

// optional listen to events
mercure.on("sse:connected", (url) => {
  console.log("Connected to Mercure hub");
});
```

### Manual Configuration

Alternatively, you can configure Mercure programmatically:

```typescript
import { App, Mercure } from "reactolith";

const app = new App(component);
const mercure = new Mercure(app);

// Subscribe to Mercure hub (uses current pathname as topic)
mercure.subscribe({
  hubUrl: "https://example.com/.well-known/mercure",
  withCredentials: true,  // Include cookies for authentication
});
```

When the user navigates to a different route, Mercure automatically reconnects with the new pathname as the topic.

### Auto-Refetch on Empty Messages

When Mercure receives an **empty message** (or whitespace-only), it automatically refetches the current route. This makes it easy to invalidate the current page from the backend without having to render and send the full HTML:

**Backend (simple invalidation):**
```php
// Just notify that the page should refresh - no HTML needed
$hub->publish(new Update('/dashboard', ''));
```

Instead of:
```php
// Old way: render and send full HTML
$html = $twig->render('dashboard.html.twig', $data);
$hub->publish(new Update('/dashboard', $html));
```

This triggers a GET request to the current URL and renders the response.

### Mercure Events

| Event | Arguments | Description |
|-------|-----------|-------------|
| `sse:connected` | `url` | Connection established |
| `sse:disconnected` | `url` | Connection closed |
| `sse:message` | `event, html` | Message received |
| `render:success` | `event, html` | HTML rendered successfully |
| `render:failed` | `event, html` | Render failed (no root element) |
| `refetch:started` | `event` | Auto-refetch triggered (empty message) |
| `refetch:success` | `event, html` | Auto-refetch completed successfully |
| `refetch:failed` | `event, error` | Auto-refetch failed |
| `sse:error` | `error` | Connection error |

### Live Data with useMercureTopic

For simple live values (like notification counts, user status), use the `useMercureTopic` hook to subscribe to Mercure topics that send JSON data:

```tsx
import { useMercureTopic } from 'reactolith';

// Simple types - inferred from initial value
function NotificationBadge() {
  const count = useMercureTopic('/notifications/count', 0);

  if (count === 0) return null;
  return <span className="badge">{count}</span>;
}

// Explicit type parameter
function UserStatus({ userId }: { userId: number }) {
  const status = useMercureTopic<'online' | 'offline' | 'away'>(
    `/user/${userId}/status`,
    'offline'
  );
  return <span className={status}>{status}</span>;
}

// Complex types with interfaces
interface DashboardStats {
  visitors: number;
  sales: number;
  conversion: number;
}

function Dashboard() {
  const stats = useMercureTopic<DashboardStats>('/dashboard/stats', {
    visitors: 0,
    sales: 0,
    conversion: 0,
  });

  return (
    <div>
      <span>Visitors: {stats.visitors}</span>
      <span>Sales: {stats.sales}</span>
      <span>Conversion: {stats.conversion}%</span>
    </div>
  );
}
```

**Backend:**
```php
// Push JSON data to topic
$hub->publish(new Update(
    '/notifications/count',
    json_encode(42)
));
```

**Note:** When using `useMercureTopic`, make sure `app.mercureConfig` is set. You can either:
- Use the auto-configuration by adding `data-mercure-hub-url` to your root element (recommended), or
- Set it manually:
```typescript
const app = new App(component);
app.mercureConfig = {
  hubUrl: "/.well-known/mercure",
  withCredentials: true,
};
```

### Custom Live Regions (Partial Updates)

For partial updates (e.g., updating a sidebar across all pages), you can create your own live region component. The `mercureConfig` is accessible via `useApp()`:

**Setup:**
```typescript
import { App, Mercure, MercureLive } from 'reactolith';
import loadable from '@loadable/component';

const component = loadable(
    async ({ is }: { is: string }) => {
        // The mapping is up to you, reactolith only provides the MercureLive Component (don't lazy load it!)
        if (is === 'mercure-live') {
            return MercureLive;
        }

        // Your default implementaiton
        return import(`./components/${is}.tsx`);
    },
    {
        cacheKey: ({ is }) => is,
        resolveComponent: (mod, { is }) => {
            if (is === 'mercure-live') {
                return mod;
            }
            return mod.default || mod[is];
        }
    }
);


const app = new App(component);
const mercure = new Mercure(app);

// Store config for components to access
app.mercureConfig = {
  hubUrl: "/.well-known/mercure",
  withCredentials: true,
};
mercure.subscribe(app.mercureConfig);
```

### Beispiel: Live Sidebar

```tsx
// components/sidebar.tsx
export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="sidebar">
      {children}
    </aside>
  );
}
```

**HTML Usage:**
```html
<div id="reactolith-app">
  <nav>...</nav>

  <!-- Diese Region wird live aktualisiert -->
  <mercure-live topic="/sidebar">
    <sidebar>
      <ul>
        <li>Initial menu item 1</li>
        <li>Initial menu item 2</li>
      </ul>
    </sidebar>
  </mercure-live>

  <main>...</main>
</div>
```

**Backend:**
```php
// Render die Sidebar neu
$html = $twig->render('_sidebar.html.twig', [
    'menuItems' => $updatedMenuItems
]);

// Push zu allen Clients
$hub->publish(new Update('/sidebar', $html));
```

**Template (_sidebar.html.twig):**
```twig
<sidebar>
  <ul>
    {% for item in menuItems %}
    <li>{{ item.label }}</li>
    {% endfor %}
  </ul>
</sidebar>
```

---

## 🧩 IDE Autocomplete (Web-Types)

`reactolith` includes a CLI tool to generate [web-types](https://github.com/JetBrains/web-types) for your custom components. This enables **autocomplete and validation** in IDEs like WebStorm, PhpStorm, and VS Code (with appropriate plugins).

### Generate web-types.json

```bash
npx generate-web-types -c src/components/ui -o web-types.json -n my-app
```

The generator **recursively scans** the components directory, so both flat and nested structures are supported:

```
src/components/ui/
  button.tsx              # flat
  card.tsx                # flat
  accordion/
    accordion.tsx         # nested
    accordion-item.tsx    # nested
```

All components are discovered automatically — no extra configuration needed.

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--components` | `-c` | Components directory (scanned recursively) | `components/ui` |
| `--tsconfig` | `-t` | TypeScript config file | `tsconfig.app.json` (or `tsconfig.json`) |
| `--out` | `-o` | Output file | `web-types.json` |
| `--name` | `-n` | Library name | `reactolith-components` |
| `--version` | `-v` | Library version | `1.0.0` |
| `--prefix` | `-p` | Element name prefix | `""` |
| `--help` | `-h` | Show help | |

**Examples:**

```bash
# Minimal — uses defaults for everything else
npx generate-web-types -c src/components/ui

# With prefix — all elements get a "ui-" prefix (e.g. <ui-button>, <ui-card>)
npx generate-web-types -c src/components -p ui- -o web-types.json

# Full example with all options
npx generate-web-types \
  -c src/components/ui \
  -o web-types.json \
  -n my-app \
  -v 2.0.0 \
  -p app- \
  -t tsconfig.app.json

# Custom tsconfig (e.g. monorepo or library setup)
npx generate-web-types -c packages/ui/src -t packages/ui/tsconfig.json -o packages/ui/web-types.json
```

### Configure your project

Add the generated file to your `package.json`:

```json
{
  "name": "my-app",
  "web-types": "./web-types.json"
}
```

### Result

After restarting your IDE, you'll get:
- ✅ **Autocomplete** for custom element names (e.g., `<ui-button>`)
- ✅ **Prop suggestions** with types and descriptions
- ✅ **Slot hints** for components with children/slots
- ✅ **Validation** for required props and valid values

**Tip:** Add `npx generate-web-types ...` to your build script to keep web-types in sync:

```json
{
  "scripts": {
    "build": "vite build && npx generate-web-types -c src/components/ui -o web-types.json"
  }
}
```

---

## 🤝 Contributing

Contributions are welcome!
Feel free to open an issue or submit a PR.

--- 

## 🛠 Development Build
If you’re contributing to this library:

```bash
npm install
npm run build
```
