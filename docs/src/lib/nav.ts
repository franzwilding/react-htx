export type NavItem = { label: string; href: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { label: "Introduction", href: "/" },
      { label: "Installation", href: "/installation/" },
      { label: "Quick Start", href: "/quick-start/" },
      { label: "How It Works", href: "/how-it-works/" },
    ],
  },
  {
    label: "Core Concepts",
    items: [
      { label: "Props", href: "/props/" },
      { label: "Slots", href: "/slots/" },
      { label: "Forms", href: "/forms/" },
      { label: "Scroll Restoration", href: "/scroll-restoration/" },
    ],
  },
  {
    label: "Realtime & SSR",
    items: [
      { label: "Mercure", href: "/mercure/" },
      { label: "Server-Side Rendering", href: "/ssr/" },
    ],
  },
  {
    label: "Comparisons",
    items: [
      { label: "Overview", href: "/comparisons/" },
      { label: "vs Inertia.js", href: "/comparisons/inertia/" },
      { label: "vs Hotwire Turbo", href: "/comparisons/turbo/" },
    ],
  },
  {
    label: "Tooling",
    items: [
      { label: "Web Types (IDE)", href: "/web-types/" },
      { label: "Chunk Preloading", href: "/preloading/" },
      { label: "API Cheatsheet", href: "/api/" },
      { label: "Development", href: "/development/" },
    ],
  },
  {
    label: "Examples",
    items: [
      { label: "Symfony FormFlow", href: "/examples/symfony-multistep-form/" },
    ],
  },
];

export function normalizePath(path: string): string {
  if (!path) return "/";
  if (path === "/") return "/";
  return path.endsWith("/") ? path : path + "/";
}

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

export function withBase(href: string): string {
  if (href.startsWith("/")) return BASE.replace(/\/$/, "") + href;
  return BASE + href;
}

export function stripBase(path: string): string {
  return BASE === "/" ? path : path.replace(BASE, "/");
}

export type AdjacentItems = {
  prev: NavItem | null;
  next: NavItem | null;
};

export function findAdjacent(currentPath: string): AdjacentItems {
  const flat = NAV.flatMap((group) => group.items);
  const normalized = normalizePath(currentPath);
  const index = flat.findIndex(
    (item) => normalizePath(item.href) === normalized,
  );
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}
