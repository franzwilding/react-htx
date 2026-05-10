import { AppLogoMark } from "./app-logo-mark";

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Project",
    links: [
      { label: "Documentation", href: `${BASE}` },
      { label: "Installation", href: `${BASE}installation/` },
      { label: "Quick start", href: `${BASE}quick-start/` },
      { label: "How it works", href: `${BASE}how-it-works/` },
    ],
  },
  {
    title: "Compare",
    links: [
      { label: "vs Inertia.js", href: `${BASE}comparisons/inertia/` },
      { label: "vs Hotwire Turbo", href: `${BASE}comparisons/turbo/` },
      { label: "All comparisons", href: `${BASE}comparisons/` },
    ],
  },
  {
    title: "Source",
    links: [
      { label: "GitHub", href: "https://github.com/reactolith/reactolith" },
      {
        label: "Issues",
        href: "https://github.com/reactolith/reactolith/issues",
      },
      { label: "Organization", href: "https://github.com/reactolith" },
    ],
  },
];

export function AppLandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_2fr] lg:px-8">
        <div className="flex items-center gap-3">
          <AppLogoMark className="h-9 w-[24px]" animated={false} />
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-2xl tracking-tight">
              reactolith
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              MIT
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLS.map((col) => (
            <div key={col.title}>
              <h5 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                {col.title}
              </h5>
              <ul className="space-y-1.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-foreground/85 no-underline transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5 text-xs text-muted-foreground lg:px-8">
        <span>© 2026 reactolith. Released under the MIT License.</span>
        <span>
          This site is built{" "}
          <em className="font-serif italic text-primary">with</em> reactolith.
        </span>
      </div>
    </footer>
  );
}
