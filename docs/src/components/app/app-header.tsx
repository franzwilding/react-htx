import * as React from "react";
import { cn } from "@/lib/utils";
import { AppSidebarTrigger } from "./app-sidebar-trigger";
import { AppLogoMark } from "./app-logo-mark";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.6.5.5 5.6.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.7 1.2 3.4.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4C18 4.7 19 5 19 5c.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.6 18.4.5 12 .5z" />
    </svg>
  );
}

export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  homeHref?: string;
  repoHref?: string;
  /** When true, render the marketing-style nav links. */
  marketing?: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

export function AppHeader({
  className,
  homeHref = BASE,
  repoHref = "https://github.com/reactolith/reactolith",
  marketing = false,
  ...props
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full border-b border-border/70 bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {!marketing && <AppSidebarTrigger />}
          <a
            href={homeHref}
            className="flex items-center gap-2 no-underline"
            aria-label="reactolith — home"
          >
            <AppLogoMark className="h-7 w-[18px]" />
            <span className="font-serif text-xl leading-none tracking-tight">
              reactolith
            </span>
          </a>
        </div>

        {marketing && (
          <nav className="ml-8 hidden items-center gap-6 md:flex">
            <a
              href="#idea"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Idea
            </a>
            <a
              href="#compare"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Compare
            </a>
            <a
              href={`${BASE}examples/`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Examples
            </a>
            <a
              href={`${BASE}installation/`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          <a
            href={repoHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open GitHub repository"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-transparent px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <GithubIcon className="size-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          {marketing && (
            <a
              href={`${BASE}installation/`}
              className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 hover:-translate-y-px"
            >
              Get started
              <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
