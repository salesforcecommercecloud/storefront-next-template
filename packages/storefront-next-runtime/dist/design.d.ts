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
export { ComponentRegistry };
//# sourceMappingURL=design.d.ts.map