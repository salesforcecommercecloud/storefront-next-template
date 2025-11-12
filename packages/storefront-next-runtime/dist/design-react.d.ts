import { b as ClientAcknowledgedEvent, m as IsomorphicConfiguration, s as EventPayload, t as ClientApi } from "./api-types-4HaYLKV9.js";
import React$1 from "react";

//#region src/design/react/context/PageDesignerProvider.d.ts
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
//#region src/design/react/context/DesignContext.d.ts
/**
 * Type definition for the Design Context
 * Extends DesignState with additional design-time properties
 */
interface DesignContextType {
  /** Whether design mode is currently active */
  isDesignMode: boolean;
  /** Client API for host communication */
  clientApi?: ClientApi;
  /** Whether the client is connected to the host */
  isConnected: boolean;
  /** The page designer config */
  pageDesignerConfig: EventPayload<ClientAcknowledgedEvent> | null;
}
/**
 * Custom hook to access the design context
 * Provides access to design mode state and component selection functionality
 *
 * @returns The current design context
 */
declare const useDesignContext: () => DesignContextType;
//#endregion
//#region src/design/react/components/component.types.d.ts
interface RegionDesignMetadata {
  /**
   * The id of the component or region.
   */
  id: string;
  /**
   * The direction of the region or the region the component belongs to.
   */
  regionDirection: 'row' | 'column';
  /**
   * The name of the component or region.
   */
  name?: string;
  /**
   * A list of component ids that are part of this region.
   */
  componentIds: string[];
  /**
   * A list of allowed component types in this region.
   */
  componentTypeInclusions: string[];
  /**
   * A list of forbidden component types in this region.
   */
  componentTypeExclusions: string[];
}
interface ComponentDesignMetadata {
  /**
   * The id of the component or region.
   */
  id: string;
  /**
   * Whether the component is a fragment.
   */
  isFragment: boolean;
  /**
   * The name of the component or region.
   */
  name?: string;
}
type ComponentDecoratorProps<TProps> = React$1.PropsWithChildren<{
  designMetadata: ComponentDesignMetadata;
} & TProps>;
type RegionDecoratorProps<TProps> = React$1.PropsWithChildren<{
  designMetadata: RegionDesignMetadata;
} & TProps>;
//#endregion
//#region src/design/react/components/ComponentDecorator.d.ts
/**
 * Creates a higher-order component that wraps React components with design-time functionality.
 * In design mode, adds visual indicators, selection handling, and host communication.
 * In normal mode, renders the component unchanged for optimal performance.
 *
 * @template TProps - The props type of the component being decorated
 * @param Component - The React component to wrap with design functionality
 * @returns A new component with design-time capabilities
 */
declare function createReactComponentDesignDecorator<TProps>(Component: React$1.ComponentType<TProps>): (props: ComponentDecoratorProps<TProps>) => React$1.JSX.Element;
//#endregion
//#region src/design/react/components/RegionDecorator.d.ts
declare function createReactRegionDesignDecorator<TProps>(Region: React$1.ComponentType<TProps>): (props: RegionDecoratorProps<TProps>) => React$1.JSX.Element;
//#endregion
export { type ComponentDecoratorProps, type ComponentDesignMetadata, type DesignContextType, PageDesignerProvider, type RegionDecoratorProps, type RegionDesignMetadata, createReactComponentDesignDecorator, createReactRegionDesignDecorator, useDesignContext, usePageDesignerMode };
//# sourceMappingURL=design-react.d.ts.map