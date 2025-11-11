import { A as ComponentDeselectedEvent, B as DefaultForwardedKeys, C as ClientReady, D as ClientWindowDragMovedEvent, E as ClientWindowDragExitedEvent, F as ComponentInfo, G as WindowScrollChangedEvent, H as HostKeyPressedEvent, I as ComponentMovedToRegionEvent, L as ComponentPropertiesChangedEvent, M as ComponentFocusedEvent, N as ComponentHoveredInEvent, O as ComponentAddedToRegionEvent, P as ComponentHoveredOutEvent, R as ComponentSelectedEvent, S as ClientInitializedEvent, T as ClientWindowDragEnteredEvent, U as MediaChangedEvent, V as ErrorEvent, W as PageSettingsChangedEvent, _ as Source, a as ConfigFactory, b as ClientAcknowledgedEvent, c as EventTypeName, d as HostEventNameMapping, f as HostMessage, g as MessageEmitter, h as IsomorphicEventNameMapping, i as ClientMessage, j as ComponentDragStartedEvent, k as ComponentDeletedEvent, l as HostApi, m as IsomorphicConfiguration, n as ClientConfiguration, o as EventHandler, p as IsomorphicApi, r as ClientEventNameMapping, s as EventPayload, t as ClientApi, u as HostConfiguration, v as WithEventType, w as ClientWindowDragDroppedEvent, x as ClientDisconnectedEvent, y as WithMeta, z as ComponentType } from "./api-types-OhS5xUej.js";

//#region src/design/componentRegistry.d.ts

/**
 * A generic registry for managing components with support for design-time decoration.
 * This registry allows components to be registered and retrieved in different modes,
 * with optional decoration for design-time usage.
 *
 * @template TComponent - The type of components stored in this registry
 * @example
 * import type React from 'react';
 * import pkg from 'commerce-sdk-isomorphic';
 * const { design: { ComponentRegistry, createReactDesignDecorator } } = pkg;
 *
 * const registry = new ComponentRegistry<React.Component>({
 *   designDecorator: createReactDesignDecorator(),
 * });
 *
 * registry.registerComponent('commerce/productList', ProductListComponent);
 *
 * const ProductList = registry.getComponent('commerce/productList');
 *
 * // Get the component in design mode - the component will be decorated
 * const ProductList = registry.getComponent('commerce/productList');
 */
declare class ComponentRegistry<TComponent> {
  private readonly registry;
  private readonly designDecorator;
  /**
   * @param options - Configuration options for the registry
   * @param options.designDecorator - Optional function to decorate components when retrieved in design mode.
   *                                  If not provided, components are returned unchanged in design mode.
   */
  constructor({
    designDecorator
  }?: {
    designDecorator?: (component: TComponent) => TComponent;
  });
  /**
   * Registers a component in the registry with the specified name.
   * If a component with the same name already exists, it will be overwritten.
   *
   * @param name - The unique identifier for the component
   * @param component - The component to register
   */
  registerComponent(name: string, component: TComponent): void;
  /**
   * Retrieves a component from the registry by its identifier.
   * The component may be decorated based on the specified mode.
   *
   * @param id - The identifier of the component to retrieve
   * @param options - Options for component retrieval
   * @param options.mode - The mode in which to retrieve the component. Defaults to 'runtime'.
   * @returns The component if found, null otherwise. In design mode, the component will be decorated.
   */
  getComponent(id: string): TComponent | null;
}
//#endregion
//#region src/design/messaging-api/client.d.ts
/**
 * Factory function to create a ClientApi instance.
 *
 * @public
 * @param _config - Configuration object for the client API (currently unused).
 * @returns {ClientApi} An instance of the ClientApi interface.
 */
declare function createClientApi({
  emitter,
  id,
  forwardedKeys,
  logger
}: ClientConfiguration): ClientApi;
//#endregion
//#region src/design/messaging-api/host.d.ts
/**
 * Factory function to create a HostApi instance.
 *
 * @public
 * @param {HostConfiguration} config - Configuration object for the host API.
 * @returns {HostApi} An instance of the HostApi interface.
 */
declare function createHostApi({
  emitter,
  id,
  logger
}: HostConfiguration): HostApi;
//#endregion
//#region src/design/modeDetection.d.ts
declare const isDesignModeActive: () => boolean;
declare const isPreviewModeActive: () => boolean;
//#endregion
export { ClientAcknowledgedEvent, ClientApi, ClientConfiguration, ClientDisconnectedEvent, ClientEventNameMapping, ClientInitializedEvent, ClientMessage, ClientReady, ClientWindowDragDroppedEvent, ClientWindowDragEnteredEvent, ClientWindowDragExitedEvent, ClientWindowDragMovedEvent, ComponentAddedToRegionEvent, ComponentDeletedEvent, ComponentDeselectedEvent, ComponentDragStartedEvent, ComponentFocusedEvent, ComponentHoveredInEvent, ComponentHoveredOutEvent, ComponentInfo, ComponentMovedToRegionEvent, ComponentPropertiesChangedEvent, ComponentRegistry, ComponentSelectedEvent, ComponentType, ConfigFactory, DefaultForwardedKeys, ErrorEvent, EventHandler, EventPayload, EventTypeName, HostApi, HostConfiguration, HostEventNameMapping, HostKeyPressedEvent, HostMessage, IsomorphicApi, IsomorphicConfiguration, IsomorphicEventNameMapping, MediaChangedEvent, MessageEmitter, PageSettingsChangedEvent, Source, WindowScrollChangedEvent, WithEventType, WithMeta, createClientApi, createHostApi, isDesignModeActive, isPreviewModeActive };
//# sourceMappingURL=design.d.ts.map