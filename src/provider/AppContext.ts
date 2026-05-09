import { createContext, useContext } from "react";
import type { App } from "../App";

export const AppContext = createContext<App | undefined>(undefined);

export function useApp(): App {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside <AppProvider>");
  }
  return ctx;
}
