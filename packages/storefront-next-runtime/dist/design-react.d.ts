import { r as ComponentModule, s as FrameworkAdapter } from "./index.js";
import { r as ShopperExperience } from "./types.js";
import { S as ClientAcknowledgedEvent, l as EventPayload, r as ClientApi } from "./index2.js";
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
/**
 * Default component constructor interface.
 * Used to define default components that should be instantiated in a region.
 */
interface DefaultComponentConstructor {
  /** Unique identifier for the component instance */
  id: string;
  /** Component type ID to instantiate */
  typeId: string;
  /** Component data/attributes */
  data: Record<string, unknown>;
}
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
   * Optional description for the region.
   */
  description?: string;
  /**
   * Maximum number of components allowed in the region.
   */
  maxComponents?: number;
  /**
   * A list of component ids that are part of this region.
   */
  componentIds?: string[];
  /**
   * A list of allowed component types in this region.
   */
  componentTypeInclusions?: string[];
  /**
   * A list of forbidden component types in this region.
   */
  componentTypeExclusions?: string[];
  /**
   * Default components to instantiate when the region is created.
   */
  defaultComponentConstructors?: DefaultComponentConstructor[];
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
  /**
   * The region definitions for this component.
   */
  regionDefinitions?: RegionDesignMetadata[];
}
type ComponentDecoratorProps<TProps> = React.PropsWithChildren<{
  designMetadata?: ComponentDesignMetadata;
  visible?: boolean;
  localized?: boolean;
} & TProps>;
type RegionDecoratorProps<TProps> = React.PropsWithChildren<{
  designMetadata?: RegionDesignMetadata;
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
//#region src/design/react/components/page.types.d.ts
interface PageDesignMetadata {
  id: string;
  name: string;
  description?: string;
  archType?: 'controller' | 'headless';
  route?: string;
  supportedAspectTypes?: string[];
  regionDefinitions?: RegionDesignMetadata[];
  attributeDefinitionGroups?: {
    id: string;
    name?: string;
    description?: string;
    attributeDefinitions?: Record<string, unknown>[];
  }[];
}
type PageDecoratorProps<TProps> = React.PropsWithChildren<{
  designMetadata?: PageDesignMetadata;
} & TProps>;
//#endregion
//#region src/design/react/registry/adapter.d.ts
type ReactComponentModule<TProps> = ComponentModule<TProps, ReactDesignComponentType<TProps>>;
/**
 * A React component that optionally accepts design metadata.
 * Any component returned from the registry could potentially accept design metadata.
 * This includes both regular components and lazy components with their React-specific properties.
 */
type ReactDesignComponentType<TProps> = React.ComponentType<TProps> | React.LazyExoticComponent<React.ComponentType<TProps>>;
/**
 * React framework adapter that implements React-specific behavior
 * for the framework-agnostic component registry.
 */
declare class ReactAdapter<TProps> implements FrameworkAdapter<TProps, ReactDesignComponentType<TProps>> {
  /**
   * Creates a React lazy component from an importer function.
   */
  createLazyComponent(importer: () => Promise<ReactComponentModule<TProps>>): ReactDesignComponentType<TProps>;
  /**
   * Decorates a React component with design-time capabilities.
   * Uses the React-specific design decorator directly.
   */
  decorateComponent(component: ReactDesignComponentType<TProps>): ReactDesignComponentType<TProps>;
}
/**
 * Creates a React adapter instance with optional configuration.
 */
declare function createReactAdapter<TProps>(): ReactAdapter<TProps>;
//#endregion
export { type ComponentDecoratorProps, type ComponentDesignMetadata, type DefaultComponentConstructor, type DesignContextType, type PageDecoratorProps, type PageDesignMetadata, type ReactDesignComponentType, type RegionDecoratorProps, type RegionDesignMetadata, createReactAdapter, createReactComponentDesignDecorator, createReactRegionDesignDecorator, useDesignContext };
//# sourceMappingURL=design-react.d.ts.map