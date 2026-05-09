import * as React from "react";

type SidebarContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    return { mobileOpen: false, setMobileOpen: () => {} };
  }
  return ctx;
}
