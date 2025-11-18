import 'reflect-metadata';

// Attribute types supported by B2C Commerce
// Based on official schema: https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/content/attributedefinition.json
// Define the array first as the single source of truth
export const VALID_ATTRIBUTE_TYPES = [
    'string',
    'text',
    'markup',
    'integer',
    'boolean',
    'product',
    'category',
    'file',
    'page',
    'image',
    'url',
    'enum',
    'custom',
    'cms_record',
] as const;

// Derive the union type from the array
export type AttributeType = (typeof VALID_ATTRIBUTE_TYPES)[number];

/**
 * Configuration interface for the AttributeDefinition decorator
 * Matches the AttributeDefinition interface from component-registry.ts
 */
export interface AttributeDefinitionConfig {
    id?: string; // Unique identifier for the attribute
    name?: string; // Human-readable name for the attribute
    description?: string; // Optional description of the attribute
    type?: AttributeType; // Type of the attribute
    required?: boolean; // Whether the attribute is required
    values?: string[]; // Values for enum types
    defaultValue?: unknown; // Default value for the attribute
}

/**
 * Decorator for marking class fields and method parameters with attribute definition metadata
 *
 * @param config - Attribute definition configuration matching the AttributeDefinition interface
 *
 * @example
 * ```typescript
 * class MyComponent {
 *   @AttributeDefinition({
 *     id: 'title',
 *     name: 'Title',
 *     type: 'string',
 *     required: true,
 *     description: 'The main title text'
 *   })
 *   title: string;
 *
 *   @AttributeDefinition({
 *     id: 'theme',
 *     name: 'Theme',
 *     type: 'enum',
 *     required: false,
 *     values: ['light', 'dark'],
 *     defaultValue: 'light',
 *     description: 'Visual theme for the component'
 *   })
 *   theme: 'light' | 'dark';
 *
 *   constructor(
 *     @AttributeDefinition({
 *       id: 'imageUrl',
 *       name: 'Image URL',
 *       type: 'url',
 *       required: true,
 *       description: 'URL of the image to display'
 *     })
 *     imageUrl: string
 *   ) {
 *     this.imageUrl = imageUrl;
 *   }
 * }
 * ```
 */
export function AttributeDefinition(config?: AttributeDefinitionConfig) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) {
        // Handle method parameter decorators
        if (typeof parameterIndex === 'number') {
            const existingParams = Reflect.getMetadata('attribute:parameters', target) || [];
            existingParams[parameterIndex] = config;
            Reflect.defineMetadata('attribute:parameters', existingParams, target);
            return;
        }

        // Handle class field decorators
        if (propertyKey) {
            const existingFields = Reflect.getMetadata('attribute:fields', target) || {};
            existingFields[propertyKey] = config;
            Reflect.defineMetadata('attribute:fields', existingFields, target);
        }
    };
}

/**
 * Helper function to get attribute definitions from a class
 *
 * @param target - The class constructor or instance
 * @returns Object containing field and parameter attribute definitions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAttributeDefinitions(target: any): {
    fields: Record<string, AttributeDefinitionConfig>;
    parameters: AttributeDefinitionConfig[];
} {
    const fields = Reflect.getMetadata('attribute:fields', target) || {};
    const parameters = Reflect.getMetadata('attribute:parameters', target) || [];

    return { fields, parameters };
}

/**
 * Helper function to get all attribute definitions as a flat array
 *
 * @param target - The class constructor or instance
 * @returns Array of all attribute definitions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllAttributeDefinitions(target: any): AttributeDefinitionConfig[] {
    const { fields, parameters } = getAttributeDefinitions(target);

    return [
        ...Object.values(fields),
        ...parameters.filter(Boolean), // Filter out undefined entries
    ];
}
