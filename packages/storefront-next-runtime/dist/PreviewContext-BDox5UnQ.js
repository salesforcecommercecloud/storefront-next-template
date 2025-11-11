import { n as isPreviewModeActive } from "./modeDetection-BZMGik06.js";
import { createContext, useMemo } from "react";

//#region src/design/react/context/PreviewContext.tsx
const PreviewContext = createContext({ isPreviewMode: false });
const PreviewProvider = ({ children }) => {
	const isPreviewMode = isPreviewModeActive();
	const contextValue = useMemo(() => ({ isPreviewMode }), [isPreviewMode]);
	return <PreviewContext.Provider value={contextValue}>{children}</PreviewContext.Provider>;
};

//#endregion
export { PreviewContext, PreviewProvider };
//# sourceMappingURL=PreviewContext-BDox5UnQ.js.map