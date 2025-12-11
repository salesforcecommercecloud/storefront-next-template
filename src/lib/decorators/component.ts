import 'reflect-metadata';
import type { RegionDefinitionConfig } from '@/lib/decorators';

export const TYPE_ID_KEY = 'component:typeId';
export const META_KEY = 'component:metadata';
export const LOADER_KEY = 'component:loader';
export const COMPONENT_PACKAGE = 'odyssey_base';

type ComponentId = string;

/**
 * Metadata describing a component type.
 */
export interface ComponentTypeMetadata {
    id?: ComponentId;
    /** Human-readable name */
    name?: string;
    /** Component description */
    description?: string;
    /** Component group/category */
    group?: string;
    /** Region definitions of a component */
    regions?: RegionDefinitionConfig[];
}

function defineComponentMetadata<T extends object>(typeId: string, metadata: ComponentTypeMetadata, target: T): T {
    const enrichedMetadata = {
        ...metadata,
        group: metadata.group || COMPONENT_PACKAGE,
    };
    const typeWithGroup = `${enrichedMetadata.group}.${typeId}`;
    // Store metadata on the constructor
    Reflect.defineMetadata(TYPE_ID_KEY, typeWithGroup, target);
    Reflect.defineMetadata(META_KEY, enrichedMetadata, target);

    return target;
}

/**
 * Decorator for registering components with metadata
 *
 * @param typeId - Unique identifier for the component
 * @param metadata - Component metadata including attributes, description, etc.
 *
 * @example
 * ```typescript
 * @Component('hero', {
 *   name: 'Hero Banner',
 *   group: 'commerce_layouts',
 *   description: 'Prominent banner section with title, subtitle, image, and CTA'
 * })
 * export default class Hero extends React.Component<HeroProps> {
 *   // component implementation
 * }
 * ```
 */
export function Component(typeId: string, metadata: ComponentTypeMetadata) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function <T extends new (...args: any[]) => any>(constructor: T) {
        return defineComponentMetadata(typeId, metadata, constructor);
    };
}

/**
 * Decorator for function components that automatically registers them
 * This works by wrapping the function and adding metadata
 */
export function RegisterComponent(typeId: string, metadata: ComponentTypeMetadata) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function <T extends (...args: any[]) => any>(target: T): T {
        return defineComponentMetadata(typeId, metadata, target);
    };
}

/**
 * Higher-order component decorator that works with any constructor
 * This creates a wrapper that can be decorated
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withComponentMetadata<T extends new (...args: any[]) => any>(
    typeId: string,
    metadata: ComponentTypeMetadata
) {
    return function (WrappedComponent: T): T {
        return defineComponentMetadata(typeId, metadata, WrappedComponent);
    };
}

/**
 * Decorator for marking component props with validation metadata
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Required(target: any, propertyKey: string) {
    const existingRequired = Reflect.getMetadata('component:required', target) || [];
    Reflect.defineMetadata('component:required', [...existingRequired, propertyKey], target);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Optional(target: any, propertyKey: string) {
    const existingOptional = Reflect.getMetadata('component:optional', target) || [];
    Reflect.defineMetadata('component:optional', [...existingOptional, propertyKey], target);
}
