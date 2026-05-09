import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  pageNav?: React.ReactNode;
  header?: React.ReactNode;
}

export function AppLayout({
  className,
  sidebar,
  pageNav,
  header,
  children,
  ...props
}: AppLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)} {...props}>
      {header}
      <div className="mx-auto flex w-full max-w-screen-2xl gap-8 px-4 sm:px-6 lg:px-8">
        {sidebar && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto py-8 lg:block">
            {sidebar}
          </aside>
        )}
        <main className="min-w-0 flex-1 py-10">
          <article className="doc-prose mx-auto max-w-3xl">{children}</article>
        </main>
        {pageNav && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto py-10 xl:block">
            {pageNav}
          </aside>
        )}
      </div>
    </div>
  );
}
