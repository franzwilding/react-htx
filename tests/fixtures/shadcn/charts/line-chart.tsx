import React from "react";

export interface LineChartProps {
  /** JSON-serialised series. */
  series?: string;
  /** Smooth interpolation between points. */
  smooth?: boolean;
}

export function LineChart(props: LineChartProps) {
  return <svg>{/* … */}</svg>;
}
