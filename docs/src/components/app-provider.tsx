import React, { type PropsWithChildren } from "react";
import { App, AppProvider as DefaultAppProvider } from "reactolith";

export const AppProvider: React.FC<PropsWithChildren<{ app: App }>> = ({
  app,
  children,
}) => (
  <React.StrictMode>
    <DefaultAppProvider app={app}>{children}</DefaultAppProvider>
  </React.StrictMode>
);
