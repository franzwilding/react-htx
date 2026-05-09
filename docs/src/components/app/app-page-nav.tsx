import * as React from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; level: number };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function AppPageNav({
  className,
  containerSelector = "article",
  label = "On this page",
}: React.HTMLAttributes<HTMLElement> & {
  containerSelector?: string;
  label?: string;
}) {
  const [headings, setHeadings] = React.useState<Heading[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const found: Heading[] = [];
    container.querySelectorAll("h2, h3").forEach((el) => {
      const heading = el as HTMLHeadingElement;
      let id = heading.id;
      if (!id) {
        id = slugify(heading.textContent ?? "");
        if (id) heading.id = id;
      }
      if (id) {
        found.push({
          id,
          text: heading.textContent ?? "",
          level: heading.tagName === "H2" ? 2 : 3,
        });
      }
    });
    setHeadings(found);

    if (found.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    found.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [containerSelector]);

  if (headings.length === 0) return null;

  return (
    <nav className={cn("text-sm", className)} aria-label={label}>
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="flex flex-col">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "block rounded-md px-2 py-1 no-underline transition-colors",
                h.level === 3 && "pl-5",
                activeId === h.id
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
