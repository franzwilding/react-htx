import * as React from "react";
import { RouteProgress } from "reactolith";

export function AppRouteProgress({
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <RouteProgress
      {...rest}
      style={
        {
          "--reactolith-route-progress-color": "var(--primary)",
          ...style,
        } as React.CSSProperties
      }
    />
  );
}
