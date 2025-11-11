//#region src/design/modeDetection.ts
/**
* Utility functions for detecting active design/preview modes
*/
const getUrlMode = () => {
	if (typeof window === "undefined") return null;
	return new URLSearchParams(window.location.search).get("mode");
};
const isDesignModeActive = () => getUrlMode() === "EDIT";
const isPreviewModeActive = () => getUrlMode() === "PREVIEW";

//#endregion
export { isPreviewModeActive as n, isDesignModeActive as t };
//# sourceMappingURL=modeDetection-BZMGik06.js.map