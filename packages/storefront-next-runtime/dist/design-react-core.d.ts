import { r as ShopperExperience } from "./types.js";
import { g as IsomorphicConfiguration } from "./index2.js";
import React$1 from "react";
import * as react_jsx_runtime0 from "react/jsx-runtime";

//#region src/design/react/core/PageDesignerProvider.d.ts
type PageDesignerContextType = {
  isDesignMode: boolean;
  isPreviewMode: boolean;
};
declare const usePageDesignerMode: () => PageDesignerContextType;
type PageDesignerProviderProps = {
  children: React.ReactNode;
  clientId: string;
  targetOrigin: string;
  usid?: string;
  clientLogger?: IsomorphicConfiguration['logger'];
  clientConnectionTimeout?: number;
  clientConnectionInterval?: number;
  mode?: 'EDIT' | 'PREVIEW';
};
declare const PageDesignerProvider: {
  ({
    children,
    targetOrigin,
    clientId,
    usid,
    clientLogger,
    clientConnectionTimeout,
    clientConnectionInterval,
    mode
  }: PageDesignerProviderProps): React.JSX.Element;
  defaultProps: {
    clientConnectionTimeout: number;
    clientConnectionInterval: number;
    mode: undefined;
    clientLogger: () => void;
  };
};
//#endregion
//#region src/design/react/core/PageDesignerPageMetadataProvider.d.ts
/**
 * Provides the page metadata for Page Designer.
 */
declare function PageDesignerPageMetadataProvider({
  page,
  children
}: React.PropsWithChildren<{
  page: ShopperExperience.schemas['Page'];
}>): react_jsx_runtime0.JSX.Element;
//#endregion
//#region src/design/react/core/RegionContext.d.ts
interface RegionContextType {
  regionId: string;
  componentIds: string[];
}
declare const RegionContext: React$1.Context<RegionContextType | null>;
declare const useRegionContext: () => RegionContextType | null;
//#endregion
//#region src/design/react/core/ComponentContext.d.ts
interface ComponentContextType {
  componentId: string;
  name?: string;
}
declare const ComponentContext: React$1.Context<ComponentContextType | null>;
declare const useComponentContext: () => ComponentContextType | null;
//#endregion
export { ComponentContext, PageDesignerPageMetadataProvider, PageDesignerProvider, RegionContext, useComponentContext, usePageDesignerMode, useRegionContext };
//# sourceMappingURL=design-react-core.d.ts.map