import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  lang?: string;
  filename?: string;
  /** Inline code source. If not given, the children's text is copied. */
  code?: string;
}

export function CodeBlock({
  className,
  lang,
  filename,
  code,
  children,
  ...props
}: CodeBlockProps) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);

  const onCopy = React.useCallback(() => {
    const text = code ?? ref.current?.innerText ?? "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  return (
    <div
      className={cn(
        "group relative my-4 overflow-hidden rounded-lg border border-border bg-muted/40",
        className,
      )}
      {...props}
    >
      {(filename || lang) && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          <span className="font-mono">
            {filename ?? (lang ? lang.toUpperCase() : "")}
          </span>
          {lang && filename && (
            <span className="font-mono uppercase">{lang}</span>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background/80 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <pre
        ref={ref}
        className={cn(
          "overflow-x-auto p-4 text-[13px] leading-relaxed font-mono",
        )}
      >
        <code>{code ?? children}</code>
      </pre>
    </div>
  );
}
