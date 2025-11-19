import { n as isPreviewModeActive } from "./modeDetection-Dl3LxZN8.js";
import { createContext, useMemo } from "react";
import { jsx } from "react/jsx-runtime";

//#region src/design/react/context/PreviewContext.tsx
const PreviewContext = createContext({ isPreviewMode: false });
const PreviewProvider = ({ children }) => {
	const isPreviewMode = isPreviewModeActive();
	const contextValue = useMemo(() => ({ isPreviewMode }), [isPreviewMode]);
	return /* @__PURE__ */ jsx(PreviewContext.Provider, {
		value: contextValue,
		children
	});
};

//#endregion
export { PreviewProvider };
//# sourceMappingURL=PreviewContext-7pJkpQK-.js.map