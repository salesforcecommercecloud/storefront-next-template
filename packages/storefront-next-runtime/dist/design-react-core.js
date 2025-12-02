import "./modeDetection.js";
import { n as usePageDesignerMode, t as PageDesignerProvider } from "./PageDesignerProvider.js";
import { lazy } from "react";
import { Fragment, jsx } from "react/jsx-runtime";

//#region src/design/react/core/PageDesignerPage.tsx
const LazyPageRegistration = lazy(() => import("./PageRegistration.js").then((module) => ({ default: module.PageRegistration })));
function PageDesignerPage({ page, children }) {
	const { isDesignMode } = usePageDesignerMode();
	if (!isDesignMode) return /* @__PURE__ */ jsx(Fragment, { children });
	return /* @__PURE__ */ jsx(LazyPageRegistration, {
		page,
		children
	});
}

//#endregion
export { PageDesignerPage, PageDesignerProvider, usePageDesignerMode };
//# sourceMappingURL=design-react-core.js.map