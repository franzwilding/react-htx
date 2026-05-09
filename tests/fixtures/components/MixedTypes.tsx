import React, { ReactNode, ComponentType } from "react";

interface MixedTypesProps {
  /** Mixed primitive union — should produce an `expression`-kind attribute. */
  count?: string | number;
  /** Function in a union — should also produce an `expression` attribute. */
  onSelect?: (() => void) | null;
  /** No JSDoc comment on this prop — exercises the description fallback. */
  untitled?: string;
  /** A function returning ReactNode — should NOT be detected as a slot. */
  renderItem?: (index: number) => ReactNode;
  /** A component-typed prop — should NOT be treated as a slot. */
  ItemComponent?: ComponentType<{ index: number }>;
}

export function MixedTypes(props: MixedTypesProps) {
  return <div>{props.count}</div>;
}
