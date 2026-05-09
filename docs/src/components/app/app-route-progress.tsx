import * as React from "react";
import { useRouter } from "reactolith";
import { cn } from "@/lib/utils";

/**
 * Top-loading bar tied to reactolith's router. While `useRouter().loading`
 * is true the bar grows asymptotically toward ~85% so the user always sees
 * forward motion; on completion it snaps to 100% and fades out.
 */
export function AppRouteProgress({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { loading } = useRouter();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let raf = 0;
    let timeout = 0;

    if (loading) {
      setVisible(true);
      setProgress(0);
      // Trickle: head toward 85% on a logarithmic curve.
      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        const next = 85 * (1 - Math.exp(-elapsed / 600));
        setProgress(next);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      setProgress((p) => (p > 0 ? 100 : 0));
      timeout = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [loading]);

  return (
    <div
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
