import { n as isPreviewModeActive } from "./modeDetection-Dl3LxZN8.js";
import { createContext, useMemo } from "react";

//#region src/design/react/context/PreviewContext.tsx
const PreviewContext = createContext({ isPreviewMode: false });
const PreviewProvider = ({ children }) => {
	const isPreviewMode = isPreviewModeActive();
	const contextValue = useMemo(() => ({ isPreviewMode }), [isPreviewMode]);
	return <PreviewContext.Provider value={contextValue}>{children}</PreviewContext.Provider>;
};

//#endregion
export { PreviewProvider };
//# sourceMappingURL=PreviewContext-BqziYXCk.js.map