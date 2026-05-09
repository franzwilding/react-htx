import * as React from "react";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "./app-sidebar-context";

type NavItem = { label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
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
    label: "Tooling",
    items: [
      { label: "Web Types (IDE)", href: "/web-types/" },
      { label: "API Cheatsheet", href: "/api/" },
      { label: "Development", href: "/development/" },
    ],
  },
];

function normalize(path: string): string {
  if (!path) return "/";
  if (path === "/") return "/";
  return path.endsWith("/") ? path : path + "/";
}

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

function withBase(href: string): string {
  if (href.startsWith("/")) return BASE.replace(/\/$/, "") + href;
  return BASE + href;
}

export function AppSidebar({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { setMobileOpen } = useSidebarContext();
  const [path, setPath] = React.useState<string>(() =>
    typeof window === "undefined" ? "/" : normalize(window.location.pathname),
  );

  React.useEffect(() => {
    const update = () => setPath(normalize(window.location.pathname));
    update();
    window.addEventListener("popstate", update);
    const interval = window.setInterval(() => {
      const current = normalize(window.location.pathname);
      setPath((prev) => (prev === current ? prev : current));
    }, 250);
    return () => {
      window.removeEventListener("popstate", update);
      window.clearInterval(interval);
    };
  }, []);

  const baseStripped = BASE === "/" ? path : path.replace(BASE, "/");

  return (
    <nav className={cn("text-sm", className)} aria-label="Documentation">
      {NAV.map((group) => (
        <div key={group.label} className="mb-6">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = normalize(item.href) === normalize(baseStripped);
              return (
                <li key={item.href}>
                  <a
                    href={withBase(item.href)}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block rounded-md px-2 py-1.5 no-underline transition-colors",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
