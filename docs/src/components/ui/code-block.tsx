import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHighlighter, isSupportedLang } from "@/lib/shiki";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  lang?: string;
  filename?: string;
  /** Inline code source. If not given, the children's text is used. */
  code?: string;
}

function reactChildrenToText(children: React.ReactNode): string {
  if (children == null || children === false) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) return children.map(reactChildrenToText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return reactChildrenToText(children.props.children);
  }
  return "";
}

export function CodeBlock({
  className,
  lang,
  filename,
  code,
  children,
  ...props
}: CodeBlockProps) {
  const text = React.useMemo(
    () => (code ?? reactChildrenToText(children)).replace(/\n$/, ""),
    [code, children],
  );
  const [highlighted, setHighlighted] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!isSupportedLang(lang)) {
      setHighlighted(null);
      return;
    }
    let cancelled = false;
    getHighlighter().then((h) => {
      if (cancelled) return;
      try {
        const html = h.codeToHtml(text, {
          lang: (lang ?? "").toLowerCase(),
          theme: "github-dark",
        });
        setHighlighted(html);
      } catch {
        setHighlighted(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  const onCopy = React.useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

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
      {highlighted ? (
        <div
          className="shiki-host overflow-x-auto text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono">
          <code>{text}</code>
        </pre>
      )}
    </div>
  );
}
