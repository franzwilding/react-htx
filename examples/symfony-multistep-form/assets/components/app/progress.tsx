import * as React from "react";
import { cn } from "../../lib/utils";

export type FlowStep = {
  name: string;
  label: string;
  position: number;
  isCurrent?: boolean;
};

/**
 * Step indicator above the form. Completed steps are rendered as real submit
 * buttons whose name+value match Symfony FormFlow's `previous` button — so
 * clicking one submits the surrounding `<form>` and FormFlow jumps directly
 * to the chosen step via `PreviousFlowType::handler` (which calls
 * `$flow->movePrevious($button->getViewData())`).
 */
export function Progress({
  steps,
  previousName,
  className,
}: {
  steps: FlowStep[];
  /** HTML name of the FormFlow `previous` button, e.g.
   * `application_flow[navigator][previous]`. Empty/undefined on the first
   * step where no previous button is rendered. */
  previousName?: string;
  className?: string;
}) {
  const currentPosition = steps.find((s) => s.isCurrent)?.position ?? 1;

  return (
    <ol
      aria-label="Form progress"
      className={cn("mb-8 grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step) => {
        const isDone = step.position < currentPosition;
        const isCurrent = !!step.isCurrent;
        const isClickable = isDone && !!previousName;

        const circle = (
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              isCurrent && "bg-primary text-primary-foreground",
              isDone && !isCurrent && "bg-primary/80 text-primary-foreground",
              !isCurrent && !isDone && "bg-muted text-muted-foreground",
            )}
          >
            {isDone ? (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              step.position
            )}
          </span>
        );

        const label = (
          <span
            className={cn(
              "hidden truncate text-xs font-medium sm:block",
              isCurrent ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
        );

        const inner = (
          <div className="flex w-full min-w-0 items-center gap-2">
            {circle}
            {label}
          </div>
        );

        return (
          <li key={step.name} className="flex flex-col items-start gap-1">
            {isClickable ? (
              <button
                type="submit"
                name={previousName}
                value={step.name}
                aria-label={`Go back to ${step.label}`}
                className="w-full min-w-0 cursor-pointer rounded-sm text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {inner}
              </button>
            ) : (
              inner
            )}
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
