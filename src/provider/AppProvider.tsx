import React, { PropsWithChildren, useEffect } from "react";
import { RouterProvider } from "./RouterProvider";
import { AppContext } from "./AppContext";
import type { App } from "../App";

export { useApp } from "./AppContext";

export const AppProvider: React.FC<PropsWithChildren<{ app: App }>> = ({
  app,
  children,
}) => {
  useEffect(() => {
    app.notifyHydrated();
  }, [app]);
  return (
    <AppContext.Provider value={app}>
      <RouterProvider>{children}</RouterProvider>
    </AppContext.Provider>
  );
};
