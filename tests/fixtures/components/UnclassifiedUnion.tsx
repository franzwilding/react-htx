import React from "react";

interface UnclassifiedUnionProps {
  /**
   * A `Promise<"a" | "b">` — the outer type is not classified by ts-morph as
   * a union (it is `Promise<…>`), but its printed text contains `|`. This
   * exercises the `collectUnionMemberTexts` fallback that splits on `|` when
   * `propType.isUnion()` is false. It has to be *required*: an optional prop
   * would be `Promise<…> | undefined`, which `isUnion()` does classify, so
   * the fallback would never be reached.
   */
  pending: Promise<"a" | "b">;
}

export function UnclassifiedUnion(props: UnclassifiedUnionProps) {
  return <div>{String(props.pending)}</div>;
}
