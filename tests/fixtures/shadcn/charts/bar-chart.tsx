import React from "react";

export interface BarChartProps {
  /** JSON-serialised data array. */
  data?: string;
  /** Chart height in px. */
  height?: number;
  /** Show legend. */
  legend?: boolean;
}

export function BarChart(props: BarChartProps) {
  return <svg height={props.height}>{/* … */}</svg>;
}
