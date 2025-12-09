import { r as ShopperExperience } from "./types.js";
import { S as ClientAcknowledgedEvent, l as EventPayload, r as ClientApi } from "./index.js";
import React from "react";

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
  /** Page data that the client has retrieved */
  clientPage: ShopperExperience.schemas['Page'] | null;
  /** Sets the client page data */
  setClientPage: (page: ShopperExperience.schemas['Page']) => void;
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
   * Whether the component is visible based on the current visiblity rules and context.
   */
  isVisible: boolean;
  /**
   * Whether the component has been localized in the current locale.
   */
  isLocalized: boolean;
  /**
   * The name of the component or region.
   */
  name?: string;
}
type ComponentDecoratorProps<TProps> = React.PropsWithChildren<{
  designMetadata: ComponentDesignMetadata;
} & TProps>;
type RegionDecoratorProps<TProps> = React.PropsWithChildren<{
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
declare function createReactComponentDesignDecorator<TProps>(Component: React.ComponentType<TProps>): (props: ComponentDecoratorProps<TProps>) => React.JSX.Element;
//#endregion
//#region src/design/react/components/RegionDecorator.d.ts
declare function createReactRegionDesignDecorator<TProps>(Region: React.ComponentType<TProps>): (props: RegionDecoratorProps<TProps>) => React.JSX.Element;
//#endregion
export { type ComponentDecoratorProps, type ComponentDesignMetadata, type DesignContextType, type RegionDecoratorProps, type RegionDesignMetadata, createReactComponentDesignDecorator, createReactRegionDesignDecorator, useDesignContext };
//# sourceMappingURL=design-react.d.ts.map