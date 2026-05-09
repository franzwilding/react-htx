import * as React from "react";
import { cn } from "@/lib/utils";
import { AppThemeToggle } from "./app-theme-toggle";
import { AppSidebarTrigger } from "./app-sidebar-trigger";

export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  homeHref?: string;
  repoHref?: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

export function AppHeader({
  className,
  homeHref = BASE,
  repoHref = "https://github.com/reactolith/reactolith",
  ...props
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <AppSidebarTrigger />
          <a
            href={homeHref}
            className="flex items-center gap-2 font-semibold tracking-tight no-underline"
          >
            <span aria-hidden="true" className="text-xl">⚡️</span>
            <span>reactolith</span>
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={repoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground no-underline"
          >
            GitHub
          </a>
          <AppThemeToggle />
        </div>
      </div>
    </header>
  );
}
