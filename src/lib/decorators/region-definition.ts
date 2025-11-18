import 'reflect-metadata';
import { COMPONENT_PACKAGE } from '@/lib/decorators/component';

export const REGION_DEFINITIONS_KEY = 'region:definitions';

// Default component constructor interface
export interface DefaultComponentConstructor {
    id: string; // Unique identifier for the component instance
    typeId: string; // Component type ID to instantiate
    data: Record<string, unknown>; // Component data/attributes
}

/**
 * Configuration interface for the RegionDefinition decorator
 * Matches the RegionDefinition interface from component-registry.ts
 */
export interface RegionDefinitionConfig {
    id: string; // Unique identifier for the region
    name: string; // Human-readable name for the region
    description?: string; // Optional description for the region
    maxComponents?: number; // Maximum number of components allowed in the region
    componentTypeExclusions?: string[]; // Excluded component types
    componentTypeInclusions?: string[]; // Included component types
    defaultComponentConstructors?: DefaultComponentConstructor[]; // Default components to instantiate
}

/**
 * Decorator for marking classes with region definition metadata
 * Used for container components that can hold other components in specific regions
 *
 * @param configs - Array of region definition configurations matching the RegionDefinition interface
 *
 * @example
 * ```typescript
 * @RegionDefinition([
 *   {
 *     id: 'main-content',
 *     name: 'Main Content Area',
 *     description: 'Primary content area for main page content',
 *     maxComponents: 10,
 *     componentTypeExclusions: ['header', 'footer'],
 *     componentTypeInclusions: ['hero', 'product-grid', 'text-block'],
 *     defaultComponentConstructors: [
 *       {
 *         id: 'default-hero',
 *         typeId: 'hero',
 *         data: {
 *           title: 'Welcome',
 *           subtitle: 'Discover our products'
 *         }
 *       }
 *     ]
 *   },
 *   {
 *     id: 'sidebar',
 *     name: 'Sidebar',
 *     maxComponents: 5,
 *     componentTypeInclusions: ['product-recommendations', 'promo-banner']
 *   }
 * ])
 * class MainContentRegion extends React.Component {
 *   // component implementation
 * }
 * ```
 */
export function RegionDefinition(configs: RegionDefinitionConfig[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function <T extends new (...args: any[]) => any>(constructor: T) {
        // Transform configs to include COMPONENT_PACKAGE prefix for all component type references
        const transformedConfigs = configs.map((config) => ({
            ...config,
            componentTypeExclusions: config.componentTypeExclusions?.map((excl) => `${COMPONENT_PACKAGE}.${excl}`),
            componentTypeInclusions: config.componentTypeInclusions?.map((incl) => `${COMPONENT_PACKAGE}.${incl}`),
            defaultComponentConstructors: config.defaultComponentConstructors?.map((c) => ({
                ...c,
                typeId: `${COMPONENT_PACKAGE}.${c.typeId}`,
            })),
        }));

        // Store transformed region definition metadata on the constructor
        Reflect.defineMetadata(REGION_DEFINITIONS_KEY, transformedConfigs, constructor);

        // Store individual region properties for easy access
        const regionIds = transformedConfigs.map((config) => config.id);
        const regionNames = transformedConfigs.map((config) => config.name);
        const allExclusions = transformedConfigs.flatMap((config) => config.componentTypeExclusions || []);
        const allInclusions = transformedConfigs.flatMap((config) => config.componentTypeInclusions || []);
        const allDefaultConstructors = transformedConfigs.flatMap(
            (config) => config.defaultComponentConstructors || []
        );

        Reflect.defineMetadata('region:ids', regionIds, constructor);
        Reflect.defineMetadata('region:names', regionNames, constructor);
        Reflect.defineMetadata('region:exclusions', allExclusions, constructor);
        Reflect.defineMetadata('region:inclusions', allInclusions, constructor);
        Reflect.defineMetadata('region:default-constructors', allDefaultConstructors, constructor);

        return constructor;
    };
}

/**
 * Helper function to get all region definitions from a class
 *
 * @param target - The class constructor or instance
 * @returns Array of region definition configurations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionDefinitions(target: any): RegionDefinitionConfig[] {
    return Reflect.getMetadata('region:definitions', target) || [];
}

/**
 * Helper function to get a specific region definition by ID from a class
 *
 * @param target - The class constructor or instance
 * @param regionId - The region ID to find
 * @returns Region definition configuration or undefined
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionDefinition(target: any, regionId: string): RegionDefinitionConfig | undefined {
    const definitions = getRegionDefinitions(target);
    return definitions.find((def) => def.id === regionId);
}

/**
 * Helper function to get all region IDs from a class
 *
 * @param target - The class constructor or instance
 * @returns Array of region IDs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionIds(target: any): string[] {
    return Reflect.getMetadata('region:ids', target) || [];
}

/**
 * Helper function to get all region names from a class
 *
 * @param target - The class constructor or instance
 * @returns Array of region names
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionNames(target: any): string[] {
    return Reflect.getMetadata('region:names', target) || [];
}

/**
 * Helper function to get all component type exclusions from a class
 *
 * @param target - The class constructor or instance
 * @returns Array of component type exclusions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionExclusions(target: any): string {
    return Reflect.getMetadata('region:exclusions', target) || [];
}

/**
 * Helper function to get component type exclusions for a specific region
 *
 * @param target - The class constructor or instance
 * @param regionId - The region ID to get exclusions for
 * @returns Array of component type exclusions for the specific region
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionExclusionsForRegion(target: any, regionId: string): string[] {
    const definition = getRegionDefinition(target, regionId);
    return definition?.componentTypeExclusions || [];
}

/**
 * Helper function to get all component type inclusions from a class
 *
 * @param target - The class constructor or instance
 * @returns Array of component type inclusions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionInclusions(target: any): string[] {
    return Reflect.getMetadata('region:inclusions', target) || [];
}

/**
 * Helper function to get component type inclusions for a specific region
 *
 * @param target - The class constructor or instance
 * @param regionId - The region ID to get inclusions for
 * @returns Array of component type inclusions for the specific region
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionInclusionsForRegion(target: any, regionId: string): string[] {
    const definition = getRegionDefinition(target, regionId);
    return definition?.componentTypeInclusions || [];
}

/**
 * Helper function to get all default component constructors from a class
 *
 * @param target - The class constructor or instance
 * @returns Array of default component constructors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionDefaultConstructors(target: any): DefaultComponentConstructor[] {
    return Reflect.getMetadata('region:default-constructors', target) || [];
}

/**
 * Helper function to get default component constructors for a specific region
 *
 * @param target - The class constructor or instance
 * @param regionId - The region ID to get default constructors for
 * @returns Array of default component constructors for the specific region
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionDefaultConstructorsForRegion(target: any, regionId: string): DefaultComponentConstructor[] {
    const definition = getRegionDefinition(target, regionId);
    return definition?.defaultComponentConstructors || [];
}

/**
 * Helper function to get max components for a specific region
 *
 * @param target - The class constructor or instance
 * @param regionId - The region ID to get max components for
 * @returns Maximum number of components allowed in the region, or undefined if not set
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegionMaxComponents(target: any, regionId: string): number | undefined {
    const definition = getRegionDefinition(target, regionId);
    return definition?.maxComponents;
}
