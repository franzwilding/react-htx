import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppInstallButtonProps {
  command?: string;
  className?: string;
}

export function AppInstallButton({
  command = "npm i reactolith",
  className,
}: AppInstallButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = React.useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, [command]);

  return (
    <Button
      type="button"
      onClick={onCopy}
      size="lg"
      variant="outline"
      aria-label={copied ? "Copied" : `Copy ${command} to clipboard`}
      className={cn("px-5 font-mono text-[13px]", className)}
    >
      <span className="text-muted-foreground">$</span>
      <span>{command}</span>
      {copied ? (
        <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5 opacity-70" aria-hidden="true" />
      )}
    </Button>
  );
}
