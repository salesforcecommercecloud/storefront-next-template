import { Q as ShopperExperience, g as IsomorphicConfiguration } from "./index.js";
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
  clientLogger?: IsomorphicConfiguration['logger'];
  clientConnectionTimeout?: number;
  clientConnectionInterval?: number;
  mode?: 'design' | 'preview';
};
declare const PageDesignerProvider: {
  ({
    children,
    targetOrigin,
    clientId,
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
//#region src/design/react/core/PageDesignerPage.d.ts
declare function PageDesignerPage({
  page,
  children
}: React.PropsWithChildren<{
  page: ShopperExperience.schemas['Page'];
}>): react_jsx_runtime0.JSX.Element;
//#endregion
export { PageDesignerPage, PageDesignerProvider, usePageDesignerMode };
//# sourceMappingURL=design-react-core.d.ts.map