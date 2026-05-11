import * as React from "react";
import { cn } from "@/lib/utils";
import { NAV, normalizePath, stripBase, withBase } from "@/lib/nav";
import { useSidebarContext } from "./app-sidebar-context";

export function AppSidebar({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { setMobileOpen } = useSidebarContext();
  const [path, setPath] = React.useState<string>(() =>
    typeof window === "undefined" ? "/" : normalizePath(window.location.pathname),
  );

  React.useEffect(() => {
    const update = () => setPath(normalizePath(window.location.pathname));
    update();
    window.addEventListener("popstate", update);
    const interval = window.setInterval(() => {
      const current = normalizePath(window.location.pathname);
      setPath((prev) => (prev === current ? prev : current));
    }, 250);
    return () => {
      window.removeEventListener("popstate", update);
      window.clearInterval(interval);
    };
  }, []);

  const baseStripped = stripBase(path);

  return (
    <nav className={cn("text-sm", className)} aria-label="Documentation">
      {NAV.map((group) => (
        <div key={group.label} className="mb-7">
          <p className="mb-2 px-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-primary/80">
            {group.label}
          </p>
          <ul className="flex flex-col gap-px">
            {group.items.map((item) => {
              const active = normalizePath(item.href) === normalizePath(baseStripped);
              return (
                <li key={item.href}>
                  <a
                    href={withBase(item.href)}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative block rounded-md px-2.5 py-1.5 no-underline transition-colors",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 bg-primary shadow-[0_0_8px_var(--primary)]"
                      />
                    )}
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
