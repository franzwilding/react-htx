import * as React from "react";
import { cn } from "../../lib/utils";

export type FlowStep = {
  name: string;
  label: string;
  position: number;
  isCurrent?: boolean;
};

export function FlowProgress({
  steps,
  className,
}: {
  steps: FlowStep[];
  className?: string;
}) {
  const current = steps.find((s) => s.isCurrent);
  const currentPosition = current?.position ?? 1;
  return (
    <ol
      aria-label="Form progress"
      className={cn(
        "mb-8 grid gap-2",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step) => {
        const isDone = step.position < currentPosition;
        const isCurrent = !!step.isCurrent;
        return (
          <li key={step.name} className="flex flex-col items-start gap-1">
            <div className="flex w-full items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isCurrent && "bg-primary text-primary-foreground",
                  isDone && !isCurrent && "bg-primary/80 text-primary-foreground",
                  !isCurrent && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? "✓" : step.position}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            <span
              className={cn(
                "block h-1 w-full rounded-full",
                isCurrent || isDone ? "bg-primary" : "bg-muted",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}
