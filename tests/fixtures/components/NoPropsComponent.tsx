import React from "react";

// A component with no parameters — exercises the `propsType: null` branch of
// extractAttributesAndSlots and the empty-params path of
// extractPropsFromFunction.
export function NoPropsComponent(): React.ReactElement {
  return <div>nothing here</div>;
}
