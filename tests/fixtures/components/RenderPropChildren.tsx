import React from "react";

interface RenderPropChildrenProps {
  /** A header label. */
  label: string;
  /** Render-prop `children` — a function, not a slot. */
  children: (value: number) => string;
}

// `children` typed as a function exercises the `propName === "children"`
// early-return path in extractAttributesAndSlots that runs AFTER isSlotType
// has rejected it (the function-typed branch of isSlotType).
export function RenderPropChildren(props: RenderPropChildrenProps) {
  return <div>{props.children(0)}</div>;
}
