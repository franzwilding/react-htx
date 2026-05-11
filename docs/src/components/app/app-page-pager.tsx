import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findAdjacent,
  normalizePath,
  stripBase,
  withBase,
  type NavItem,
} from "@/lib/nav";

function PagerLink({
  item,
  direction,
}: {
  item: NavItem;
  direction: "prev" | "next";
}) {
  const isNext = direction === "next";
  const label = isNext ? "Next" : "Previous";
  return (
    <a
      href={withBase(item.href)}
      aria-label={`${label}: ${item.label}`}
      className={cn(
        "group flex flex-1 flex-col gap-1 rounded-lg border border-border bg-card/40 px-4 py-3 no-underline transition-colors hover:border-primary/40 hover:bg-accent/40",
        isNext ? "items-end text-right" : "items-start text-left",
      )}
    >
      <span className="flex items-center gap-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {!isNext && (
          <ArrowLeft
            className="size-3 transition-transform group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
        )}
        {label}
        {isNext && (
          <ArrowRight
            className="size-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{item.label}</span>
    </a>
  );
}

export function AppPagePager({ className }: React.HTMLAttributes<HTMLElement>) {
  const [path, setPath] = React.useState<string>(() =>
    typeof window === "undefined"
      ? "/"
      : normalizePath(stripBase(window.location.pathname)),
  );

  React.useEffect(() => {
    const update = () =>
      setPath(normalizePath(stripBase(window.location.pathname)));
    update();
    window.addEventListener("popstate", update);
    const interval = window.setInterval(() => {
      const current = normalizePath(stripBase(window.location.pathname));
      setPath((prev) => (prev === current ? prev : current));
    }, 250);
    return () => {
      window.removeEventListener("popstate", update);
      window.clearInterval(interval);
    };
  }, []);

  const { prev, next } = findAdjacent(path);

  if (!prev && !next) return null;

  return (
    <nav
      className={cn(
        "mt-12 flex gap-3 border-t border-border pt-6",
        className,
      )}
      aria-label="Chapter navigation"
    >
      {prev ? <PagerLink item={prev} direction="prev" /> : <div className="flex-1" />}
      {next ? <PagerLink item={next} direction="next" /> : <div className="flex-1" />}
    </nav>
  );
}
