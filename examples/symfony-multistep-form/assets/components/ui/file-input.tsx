import * as React from "react";
import { useFormErrors } from "reactolith";
import { cn } from "../../lib/utils";

export type FileInputProps = {
  name: string;
  id?: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  accept?: string;
  className?: string;
  /** Files already stored on the server from a previous submission of
   * this step. Passed in via `json-existing='[{name,size}, …]'`. */
  existing?: { name: string; size: number }[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function fileIcon(file: File): React.ReactNode {
  const type = file.type;
  if (type.startsWith("image/")) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    );
  }
  if (type === "application/pdf") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

/**
 * Derives the hidden "keep" field name from the file field name.
 * Symfony's form names look like `application_flow[documents][resume]` or
 * `application_flow[documents][portfolio][]` — we rewrite the last segment
 * to `<basename>_keep[]` so the parent compound form picks them up as
 * unmapped data.
 */
function deriveKeepName(fileName: string): string {
  const base = fileName.replace(/\[\]$/, "");
  const m = base.match(/^(.*)\[([^[\]]+)\]$/);
  if (m) return `${m[1]}[${m[2]}_keep][]`;
  return `${base}_keep[]`;
}

export function FileInput({
  name,
  id,
  multiple,
  disabled,
  required,
  accept,
  className,
  existing = [],
}: FileInputProps) {
  const errors = useFormErrors(name);
  const invalid = errors.length > 0;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  // Indexes (into `existing`) the user has chosen to keep. We track keeps
  // rather than removes so the server-side default for the unmapped
  // `<field>_keep[]` array is "no files kept" — clicking X just drops the
  // matching hidden input from the DOM and the server stops persisting it.
  const [keptIndexes, setKeptIndexes] = React.useState<number[]>(() =>
    existing.map((_, i) => i),
  );
  const keepName = React.useMemo(() => deriveKeepName(name), [name]);

  const removeExisting = (idx: number) => {
    setKeptIndexes((prev) => prev.filter((i) => i !== idx));
  };

  const removeFile = (index: number) => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f, i) => { if (i !== index) dt.items.add(f); });
    inputRef.current.files = dt.files;
    setFiles(Array.from(dt.files));
  };

  const setNativeFiles = (list: FileList | null) => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    if (list) {
      for (const f of Array.from(list)) dt.items.add(f);
    }
    inputRef.current.files = dt.files;
    setFiles(Array.from(dt.files));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (multiple) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      Array.from(e.dataTransfer.files).forEach((f) => dt.items.add(f));
      setNativeFiles(dt.files);
    } else {
      setNativeFiles(e.dataTransfer.files);
    }
  };

  const visibleExisting = existing
    .map((file, i) => ({ file, i }))
    .filter(({ i }) => keptIndexes.includes(i));

  const hasExistingKept = visibleExisting.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-invalid={invalid || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-background px-4 py-6 text-center transition-colors",
          "hover:bg-accent/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          dragOver && "border-primary bg-accent/50",
          invalid && "border-destructive",
        )}
      >
        <svg className="h-7 w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        <div className="text-sm">
          <span className="font-medium text-foreground">
            {hasExistingKept ? (multiple ? "Add more files" : "Replace file") : "Click to upload"}
          </span>
          <span className="text-muted-foreground"> or drag and drop</span>
        </div>
        {accept && (
          <p className="text-xs text-muted-foreground">{accept}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          name={name}
          id={id}
          multiple={multiple}
          disabled={disabled}
          // When the server already has a file we don't want the browser to
          // demand a new upload — the existing one satisfies the requirement.
          required={required && !hasExistingKept}
          accept={accept}
          onChange={(e) => {
            const input = e.target;
            const picked = Array.from(input.files ?? []);
            if (!multiple) {
              setFiles(picked);
              return;
            }
            setFiles((prev) => {
              const dt = new DataTransfer();
              prev.forEach((f) => dt.items.add(f));
              picked.forEach((f) => {
                if (!prev.some((p) => p.name === f.name && p.size === f.size && p.lastModified === f.lastModified)) {
                  dt.items.add(f);
                }
              });
              input.files = dt.files;
              return Array.from(dt.files);
            });
          }}
          className="sr-only"
        />
      </div>

      {/* Freshly picked files (before submit) */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{fileIcon(file)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Existing files already on the server */}
      {hasExistingKept && (
        <ul className="space-y-1.5">
          {visibleExisting.map(({ file, i }) => (
            <li
              key={`existing-${file.name}-${i}`}
              className="flex items-center gap-3 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm"
            >
              {/* Per-file hidden input — the server keeps any existing
                  file whose index shows up here, removes the rest. */}
              <input type="hidden" name={keepName} value={String(i)} />
              <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)} · already uploaded
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeExisting(i)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
