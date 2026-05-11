import * as React from "react";
import { AppLayout } from "./app-layout";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { AppPageNav } from "./app-page-nav";
import { AppPagePager } from "./app-page-pager";
import { AppRouteProgress } from "./app-route-progress";

/**
 * Convenience wrapper used in HTML pages: renders the full doc shell
 * (header + sidebar + page-nav + route progress) around the page's content,
 * followed by prev/next chapter navigation.
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
      routeProgress={<AppRouteProgress />}
      pageFooter={<AppPagePager />}
    >
      {children}
    </AppLayout>
  );
}
