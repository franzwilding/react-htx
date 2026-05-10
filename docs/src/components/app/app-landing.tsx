import * as React from "react";
import { AppHeader } from "./app-header";
import { AppLandingFooter } from "./app-landing-footer";

/**
 * Marketing-style page shell — header + content + footer, no sidebar.
 * Used by the docs index page (`/`) which is the project's landing page.
 *
 *   <app-landing>
 *     …hero, sections, CTA, footer…
 *   </app-landing>
 */
export function AppLanding({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader marketing />
      <main>{children}</main>
      <AppLandingFooter />
    </div>
  );
}
