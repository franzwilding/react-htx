import * as React from "react";
import { ReactolithComponent, useApp } from "reactolith";
import { cn } from "../../lib/utils";

/**
 * Symfony's CollectionType ships a `data-prototype` attribute containing the
 * HTML for a fresh row, with `__name__` placeholders for the index. This
 * component wires the "Add another" / "Remove" affordances client-side so
 * users can add and remove rows without a round-trip.
 *
 * New rows are parsed as DOM elements and rendered through reactolith's
 * `<ReactolithComponent>` so that custom tags (`<ui-input>`, `<ui-select>`,
 * etc.) inside the row get hydrated as React components like the server-side
 * ones.
 */
export function Collection({
  prototype,
  prototypeName = "__name__",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  prototype?: string;
  prototypeName?: string;
}) {
  const app = useApp();

  // Wrap server-rendered children into removable slots indexed by their
  // original position. Removing one drops it from the DOM completely so its
  // form fields no longer submit.
  const initialKeys = React.useMemo(() => {
    const keys: string[] = [];
    React.Children.forEach(children, (_c, i) => keys.push(`s${i}`));
    return keys;
  }, [children]);

  const [serverKeys, setServerKeys] = React.useState<string[]>(initialKeys);
  const [addedRows, setAddedRows] = React.useState<{ key: string; element: Element }[]>([]);
  const addCounter = React.useRef(React.Children.count(children));

  const childArray = React.Children.toArray(children);

  const removeServer = (key: string) => {
    setServerKeys((cur) => cur.filter((k) => k !== key));
  };

  const removeAdded = (key: string) => {
    setAddedRows((cur) => cur.filter((r) => r.key !== key));
  };

  const handleAdd = () => {
    if (!prototype) return;
    const index = addCounter.current++;
    const html = prototype.split(prototypeName).join(String(index));
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html.trim();
    const node = wrapper.firstElementChild;
    if (!node) return;
    setAddedRows((cur) => [...cur, { key: `a${index}`, element: node }]);
  };

  return (
    <div className={cn("space-y-3", className)} {...rest}>
      {initialKeys.map((key, i) =>
        serverKeys.includes(key) ? (
          <CollectionRowShell key={key} onRemove={() => removeServer(key)}>
            {childArray[i]}
          </CollectionRowShell>
        ) : null,
      )}
      {addedRows.map(({ key, element }) => (
        <CollectionRowShell key={key} onRemove={() => removeAdded(key)}>
          <ReactolithComponent element={element} component={app.component} />
        </CollectionRowShell>
      ))}
      {prototype ? (
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5v14" />
          </svg>
          Add another
        </button>
      ) : null}
    </div>
  );
}

/**
 * Wraps a single row inside the collection. The server-rendered template
 * already emits `<ui-collection-row>` per existing entry, so when nested
 * directly we just strip duplicates by not adding a second border.
 */
function CollectionRowShell({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="group relative rounded-md border border-input bg-card/30 p-4 shadow-sm">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove this entry"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="pr-8">{children}</div>
    </div>
  );
}

/**
 * Server emits `<ui-collection-row>` per existing row. We render its
 * children unchanged — the surrounding `<Collection>` adds the chrome
 * (remove button, border) so we don't end up with double frames.
 */
export function CollectionRow({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <>{children}</>;
}
