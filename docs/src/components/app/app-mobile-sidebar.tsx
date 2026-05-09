import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "./app-sidebar-context";

export function AppMobileSidebar({ children }: { children: React.ReactNode }) {
  const { mobileOpen, setMobileOpen } = useSidebarContext();
  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "transition-opacity duration-200",
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-lg",
            "data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
            "transition-transform duration-200 ease-out",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <Dialog.Title className="text-sm font-semibold">
              Navigation
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close navigation"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
