import { n as usePageDesignerMode, t as PageDesignerProvider } from "./PageDesignerProvider.js";
import { i as useRegionContext, n as useComponentContext, r as RegionContext, t as ComponentContext } from "./ComponentContext.js";
import { lazy } from "react";
import { Fragment, jsx } from "react/jsx-runtime";

//#region src/design/react/core/PageDesignerPageMetadataProvider.tsx
const LazyPageRegistration = lazy(() => import("./PageRegistration.js").then((module) => ({ default: module.PageRegistration })));
/**
* Provides the page metadata for Page Designer.
*/
function PageDesignerPageMetadataProvider({ page, children }) {
	const { isDesignMode } = usePageDesignerMode();
	if (!isDesignMode) return /* @__PURE__ */ jsx(Fragment, { children });
	return /* @__PURE__ */ jsx(LazyPageRegistration, {
		page,
		children
	});
}

//#endregion
export { ComponentContext, PageDesignerPageMetadataProvider, PageDesignerProvider, RegionContext, useComponentContext, usePageDesignerMode, useRegionContext };
//# sourceMappingURL=design-react-core.js.map