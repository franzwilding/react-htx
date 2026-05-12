import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Symfony's CollectionType ships a `data-prototype` attribute containing the
 * HTML for a fresh row, with `__name__` placeholders for the index. This
 * component wires the "Add another" / "Remove" affordances client-side so
 * users can add and remove rows without a round-trip.
 *
 * The morphing happens through React because the new row is appended to the
 * container DOM and reactolith hydrates any custom tags inside it. State on
 * existing rows survives because the morph diff only touches the appended
 * subtree.
 */
export function Collection({
  prototype,
  prototypeName = "__name__",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Raw HTML for a new row, taken from Symfony's `data-prototype`. */
  prototype?: string;
  /** Placeholder string inside the prototype, defaults to `__name__`. */
  prototypeName?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  // Track how many rows have ever existed so newly appended ones get a
  // stable index that doesn't collide with existing rows when one is removed
  // and a new one is appended.
  const nextIndex = React.useRef(
    React.Children.count(children),
  );

  const handleAdd = React.useCallback(() => {
    if (!containerRef.current || !prototype) return;
    const index = nextIndex.current++;
    const html = prototype.split(prototypeName).join(String(index));
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const node = wrapper.firstElementChild;
    if (!node) return;
    node.setAttribute("data-collection-row", "");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.className =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground";
    removeBtn.dataset.collectionRemove = "";
    removeBtn.addEventListener("click", () => node.remove());
    node.appendChild(removeBtn);
    containerRef.current.insertBefore(node, containerRef.current.lastElementChild);
  }, [prototype, prototypeName]);

  return (
    <div
      ref={containerRef}
      className={cn("space-y-3", className)}
      {...rest}
    >
      {children}
      {prototype ? (
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors h-9 px-4 py-2 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"
        >
          + Add another
        </button>
      ) : null}
    </div>
  );
}

export function CollectionRow({
  className,
  children,
  onRemove,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  onRemove?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={ref}
      data-collection-row=""
      className={cn(
        "space-y-4 rounded-md border border-input bg-transparent p-4 shadow-sm",
        className,
      )}
      {...rest}
    >
      {children}
      <button
        type="button"
        onClick={() => {
          if (onRemove) {
            onRemove();
          } else {
            ref.current?.remove();
          }
        }}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
      >
        Remove
      </button>
    </div>
  );
}
