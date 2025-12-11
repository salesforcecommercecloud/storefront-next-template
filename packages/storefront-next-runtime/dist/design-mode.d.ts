//#region src/design/modeDetection.d.ts
/**
 * Utility functions for detecting active design/preview modes
 */
/**
 * Get the mode parameter from URL search params
 * @param url - Optional URL string or Request object for server-side usage. If not provided, uses window.location on client-side
 * @returns The mode parameter value or null if not found
 */
declare const getUrlMode: (url?: string | URL | Request) => string | null;
/**
 * Check if design mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=EDIT is present in URL
 */
declare const isDesignModeActive: (url?: string | URL | Request) => boolean;
/**
 * Check if preview mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=PREVIEW is present in URL
 */
declare const isPreviewModeActive: (url?: string | URL | Request) => boolean;
//#endregion
export { getUrlMode, isDesignModeActive, isPreviewModeActive };
//# sourceMappingURL=design-mode.d.ts.map