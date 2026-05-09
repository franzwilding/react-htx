import * as React from "react";
import { AppLayout } from "./app-layout";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { AppPageNav } from "./app-page-nav";

/**
 * Convenience wrapper used in HTML pages: renders the full doc shell
 * (header + sidebar + page-nav) around the page's content.
 *
 *   <app-page>
 *     <h1>…</h1>
 *     <p>…</p>
 *   </app-page>
 */
export function AppPage({ children }: { children?: React.ReactNode }) {
  return (
    <AppLayout
      header={<AppHeader />}
      sidebar={<AppSidebar />}
      pageNav={<AppPageNav />}
    >
      {children}
    </AppLayout>
  );
}
