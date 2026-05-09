import * as React from "react";
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Root>) {
  return (
    <BaseScrollArea.Root
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <BaseScrollArea.Viewport className="h-full w-full">
        {children}
      </BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2.5 touch-none select-none p-px"
      >
        <BaseScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
      </BaseScrollArea.Scrollbar>
      <BaseScrollArea.Scrollbar
        orientation="horizontal"
        className="flex h-2.5 touch-none select-none p-px"
      >
        <BaseScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
      </BaseScrollArea.Scrollbar>
    </BaseScrollArea.Root>
  );
}
