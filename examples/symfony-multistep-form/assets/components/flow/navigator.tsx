import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Wraps the FormFlow navigator buttons (Back / Continue / Finish) into the
 * shadcn-style toolbar. The Symfony form theme just emits this component as
 * `<flow-navigator>`; its children come from `form_widget` calls so the
 * actual buttons can be customised per step without touching this layout.
 */
export function FlowNavigator({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  // Children come from Twig as React elements (back button + continue/finish
  // button). We split them into left-side back vs right-side primary actions
  // by checking each child's `data-action` attribute.
  const slots = React.useMemo(() => {
    const back: React.ReactNode[] = [];
    const forward: React.ReactNode[] = [];
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const action = (child.props as { ["data-action"]?: string })["data-action"];
      if (action === "previous") {
        back.push(child);
      } else {
        forward.push(child);
      }
    });
    return { back, forward };
  }, [children]);

  return (
    <div
      className={cn(
        "mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">{slots.back}</div>
      <div className="flex items-center gap-2">{slots.forward}</div>
    </div>
  );
}
