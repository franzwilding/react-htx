import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

type OptionData = { value: string; label: string; group?: string };

export type SelectProps = {
  name: string;
  id?: string;
  value?: string | string[];
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Options come from Twig via `json-options='[...]'`. */
  options?: OptionData[];
};

export function Select({
  className,
  name,
  id,
  value,
  multiple,
  placeholder,
  disabled,
  required,
  options = [],
}: SelectProps) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;

  const initialValue = React.useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : value ? [value] : [];
    }
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }, [value, multiple]);

  const [selected, setSelected] = React.useState<string | string[]>(initialValue);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [search, setSearch] = React.useState("");
  const [focusIndex, setFocusIndex] = React.useState(-1);

  const selectedArr = multiple
    ? (selected as string[])
    : selected
      ? [selected as string]
      : [];

  const displayLabel = React.useMemo(() => {
    if (selectedArr.length === 0) return placeholder ?? "Select…";
    if (!multiple) {
      return options.find((o) => o.value === selectedArr[0])?.label ?? selectedArr[0];
    }
    if (selectedArr.length === 1) {
      return options.find((o) => o.value === selectedArr[0])?.label ?? selectedArr[0];
    }
    return `${selectedArr.length} selected`;
  }, [selectedArr, options, placeholder, multiple]);

  const filtered = React.useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, search]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  React.useEffect(() => {
    if (!open || focusIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelectorAll("[role=option]")[focusIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [focusIndex, open]);

  const toggle = (val: string) => {
    if (multiple) {
      const arr = selected as string[];
      const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
      setSelected(next);
    } else {
      setSelected(val);
      setOpen(false);
      setSearch("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        setFocusIndex(0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < filtered.length) {
          toggle(filtered[focusIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
    }
  };

  // Group options for rendering
  const grouped = React.useMemo(() => {
    const groups = new Map<string, OptionData[]>();
    for (const opt of filtered) {
      const g = opt.group ?? "";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(opt);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  let renderIndex = 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Hidden input(s) for form submission */}
      {multiple ? (
        selectedArr.length > 0 ? (
          selectedArr.map((v) => (
            <input key={v} type="hidden" name={name} value={v} />
          ))
        ) : (
          <input type="hidden" name={name} value="" />
        )
      ) : (
        <input type="hidden" name={name} value={(selected as string) ?? ""} />
      )}

      {/* Trigger button */}
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(!open); setFocusIndex(-1); setSearch(""); } }}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive",
          selectedArr.length === 0 && "text-muted-foreground",
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          {options.length > 8 && (
            <div className="border-b px-2 py-1.5">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFocusIndex(0); }}
                placeholder="Search…"
                autoFocus
                className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div ref={listRef} className="max-h-60 overflow-auto p-1">
            {filtered.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No results.
              </div>
            )}
            {grouped.map(([groupName, opts]) => (
              <React.Fragment key={groupName || "_"}>
                {groupName && (
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {groupName}
                  </div>
                )}
                {opts.map((opt) => {
                  const idx = renderIndex++;
                  const isSelected = selectedArr.includes(opt.value);
                  const isFocused = idx === focusIndex;
                  return (
                    <div
                      key={`${groupName}::${opt.value}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggle(opt.value)}
                      onMouseEnter={() => setFocusIndex(idx)}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                        isFocused && "bg-accent text-accent-foreground",
                        isSelected && !isFocused && "font-medium",
                      )}
                    >
                      {multiple && (
                        <span className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}>
                          {isSelected && (
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                      {!multiple && isSelected && (
                        <svg className="ml-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
