import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "./app-sidebar-context";

export function AppSidebarTrigger({
  className,
}: React.HTMLAttributes<HTMLButtonElement>) {
  const { setMobileOpen } = useSidebarContext();
  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label="Open navigation"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors lg:hidden",
        className,
      )}
    >
      <Menu className="size-4" />
    </button>
  );
}
