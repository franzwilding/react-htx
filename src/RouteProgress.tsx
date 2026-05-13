import * as React from "react";
import { useRouter } from "./provider/RouterProvider";

export interface RouteProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  style?: React.CSSProperties;
}

const wrapperStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 2,
  zIndex: 50,
  pointerEvents: "none",
  overflow: "hidden",
  transition: "opacity 200ms",
};

export function RouteProgress({
  className,
  style,
  ...rest
}: RouteProgressProps) {
  const { loading } = useRouter();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let raf = 0;
    let timeout = 0;

    if (loading) {
      setVisible(true);
      setProgress(0);
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
      {...rest}
      className={className}
      style={{ ...wrapperStyle, opacity: visible ? 1 : 0, ...style }}
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--reactolith-route-progress-color, currentColor)",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.2)",
          transition: "width 150ms ease-out",
        }}
      />
    </div>
  );
}
