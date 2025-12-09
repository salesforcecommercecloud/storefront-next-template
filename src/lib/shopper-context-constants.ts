/**
 * Shopper Context Constants
 *
 * Constants for Shopper Context API integration, including field types and
 * URL query parameter mappings.
 *
 */
export const SHOPPER_CONTEXT_FIELD_TYPES = {
    INT: 'int',
    DOUBLE: 'double',
    ARRAY: 'array',
} as const;

/**
 * Mapping structure for URL query parameters to Shopper Context API fields
 * Each entry has:
 * - paramName: URL query parameter name
 * - apiFieldName: Optional API field name (defaults to paramName if not provided)
 * Note: type and category fields are reserved for future use
 */
export const QUALIFIER_MAPPING_PARAM_NAME = 'paramName' as const;
export const QUALIFIER_MAPPING_API_FIELD_NAME = 'apiFieldName' as const;
export const QUALIFIER_MAPPING_CATEGORY = 'category' as const;

/**
 * API field name for source code qualifier
 */
export const SOURCE_CODE_API_FIELD_NAME = 'sourceCode' as const;

/**
 * Category for custom qualifiers
 */
export const CUSTOM_QUALIFIERS_CATEGORY = 'customQualifiers' as const;

export type QualifierMapping = {
    [QUALIFIER_MAPPING_PARAM_NAME]: string;
    [QUALIFIER_MAPPING_API_FIELD_NAME]?: string;
    [QUALIFIER_MAPPING_CATEGORY]?: string;
    // type?: 'int' | 'double' | 'array';
};

/**
 * Map of allowed URL query parameters to shopper context qualifiers
 *
 * Parameters can be:
 * - Root-level qualifiers (e.g., src -> sourceCode)
 * - Nested in customQualifiers object
 */
export const SHOPPER_CONTEXT_SEARCH_PARAMS: {
    [key: string]: QualifierMapping | { [key: string]: QualifierMapping };
} = {
    // Root-level qualifiers
    src: {
        [QUALIFIER_MAPPING_PARAM_NAME]: 'src',
        [QUALIFIER_MAPPING_API_FIELD_NAME]: 'sourceCode',
    },
    customQualifiers: {
        // Add custom qualifiers here
        // Each qualifier maps a URL query parameter to a customQualifiers field in the Shopper Context API
        // Example:
        device: {
            [QUALIFIER_MAPPING_PARAM_NAME]: 'device',
            [QUALIFIER_MAPPING_API_FIELD_NAME]: 'deviceType',
            [QUALIFIER_MAPPING_CATEGORY]: CUSTOM_QUALIFIERS_CATEGORY,
        },
        // ipAddress: {
        //     paramName: 'ipAddress',
        //     apiFieldName: 'ipAddress',
        //     category: 'customQualifiers',
        // },
        //
        // Usage: ?deviceType=mobile&ipAddress=192.168.1.1
        // Results in: { customQualifiers: { deviceType: 'mobile', ipAddress: '192.168.1.1' } }
    },
    assignmentQualifiers: {
        store: {
            [QUALIFIER_MAPPING_PARAM_NAME]: 'store',
            [QUALIFIER_MAPPING_API_FIELD_NAME]: 'store',
        },
    },
    couponCodes: {
        [QUALIFIER_MAPPING_PARAM_NAME]: 'couponCodes',
        [QUALIFIER_MAPPING_API_FIELD_NAME]: 'couponCodes',
    },
};
