import React from "react";

//#region src/design/react/core/RegionContext.tsx
const RegionContext = React.createContext(null);
const useRegionContext = () => React.useContext(RegionContext);

//#endregion
//#region src/design/react/core/ComponentContext.tsx
const ComponentContext = React.createContext(null);
const useComponentContext = () => React.useContext(ComponentContext);

//#endregion
export { useRegionContext as i, useComponentContext as n, RegionContext as r, ComponentContext as t };
//# sourceMappingURL=ComponentContext.js.map