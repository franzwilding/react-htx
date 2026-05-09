import React, { type PropsWithChildren } from "react";
import { App, AppProvider as DefaultAppProvider } from "reactolith";
import { ThemeProvider } from "@/components/theme-provider";

export const AppProvider: React.FC<PropsWithChildren<{ app: App }>> = ({
  app,
  children,
}) => (
  <React.StrictMode>
    <DefaultAppProvider app={app}>
      <ThemeProvider defaultTheme="system" storageKey="reactolith-docs-theme">
        {children}
      </ThemeProvider>
    </DefaultAppProvider>
  </React.StrictMode>
);
