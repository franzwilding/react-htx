import React from "react";

// A zero-parameter arrow component — exercises the empty-params branch of
// extractPropsFromArrowFunction (returns `{ type: null, node: func }`).
export const NoParamsArrow = (): React.ReactElement => <div>nothing</div>;
