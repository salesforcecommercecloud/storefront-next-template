/**
 * Shopper Context utilities
 */
import type { RouterContextProvider } from 'react-router';
import type { ShopperContext } from '@/lib/api/shopper-context';
import {
    SHOPPER_CONTEXT_SEARCH_PARAMS,
    QUALIFIER_MAPPING_PARAM_NAME,
    type QualifierMapping,
    QUALIFIER_MAPPING_API_FIELD_NAME,
    SOURCE_CODE_API_FIELD_NAME,
} from '@/lib/shopper-context-constants';
import { getConfig } from '@/config';

/**
 * Base cookie names (without USID suffix)
 */
export const SHOPPER_CONTEXT_COOKIE_NAME_BASE = 'storefront-next-context';
export const SOURCE_CODE_COOKIE_NAME_BASE = 'dwsourcecode';

/**
 * Get shopper context cookie name with USID suffix
 * In client or server shopper context middlewares, when usid is empty, the middleware will be skipped by next()
 * It's possible Shopper Context will be used in UI directly later
 */
export function getShopperContextCookieName(usid: string): string {
    return `${SHOPPER_CONTEXT_COOKIE_NAME_BASE}-${usid}`;
}

/**
 * Get source code cookie name with configurable suffix
 * Commerce Cloud pattern: dwsourcecode_{suffix}
 * Suffix comes from config, which defaults to siteId if not overridden
 * TODO : Hash of siteId
 */
export function getSourceCodeCookieName(context: Readonly<RouterContextProvider>): string {
    const config = getConfig(context);
    const _suffix = config.site.features.shopperContext.dwsourcecodeCookieSuffix;
    // In setNamespacedCookie, cookie name with siteId suffix is already added, so we don't need to add it here
    const suffix = _suffix ? `_${_suffix}` : '';
    return `${SOURCE_CODE_COOKIE_NAME_BASE}${suffix}`;
}

/**
 * Shopper context cookie expiry in seconds (6 hours)
 */
export const SHOPPER_CONTEXT_COOKIE_EXPIRY_SECONDS = 6 * 60 * 60;

/**
 * Source code cookie expiry in seconds (30 days)
 */
export const SOURCE_CODE_COOKIE_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

/**
 * Check if Page Designer edit or preview mode is active
 * @param url - URL object to check for mode parameter
 * @returns true if in Page Designer mode
 */
export function isPageDesignerMode(url: URL): boolean {
    const mode = url.searchParams.get('mode');
    return mode === 'EDIT' || mode === 'PREVIEW';
}

const customQualifiersMapping = SHOPPER_CONTEXT_SEARCH_PARAMS.customQualifiers as Record<string, QualifierMapping>;
const customQualifiersKeys = Object.keys(customQualifiersMapping);
const customQualifiersApiFieldNames = customQualifiersKeys.map(
    (key) => customQualifiersMapping[key][QUALIFIER_MAPPING_API_FIELD_NAME]
);

const assignmentQualifiersMapping = SHOPPER_CONTEXT_SEARCH_PARAMS.assignmentQualifiers as Record<
    string,
    QualifierMapping
>;
const assignmentQualifiersKeys = Object.keys(assignmentQualifiersMapping);
const assignmentQualifiersApiFieldNames = assignmentQualifiersKeys.map(
    (key) => assignmentQualifiersMapping[key][QUALIFIER_MAPPING_API_FIELD_NAME]
);

const couponCodesMapping = SHOPPER_CONTEXT_SEARCH_PARAMS.couponCodes as QualifierMapping;

export const isCustomQualifier = (key: string): boolean => {
    return customQualifiersApiFieldNames.includes(key) || customQualifiersKeys.includes(key);
};

export const isAssignmentQualifier = (key: string): boolean => {
    return assignmentQualifiersApiFieldNames.includes(key) || assignmentQualifiersKeys.includes(key);
};

export const isCouponCode = (key: string): boolean => {
    return (
        couponCodesMapping[QUALIFIER_MAPPING_API_FIELD_NAME] === key ||
        couponCodesMapping[QUALIFIER_MAPPING_PARAM_NAME] === key
    );
};

/**
 * Safely parse JSON from cookie value
 * Returns empty object if parsing fails
 */
export function safeParseCookie(cookieValue: string): Record<string, string> {
    if (!cookieValue) {
        return {};
    }

    try {
        const parsed = JSON.parse(cookieValue);
        // Ensure parsed value is an object
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed as Record<string, string>;
        }
        // eslint-disable-next-line no-console
        console.warn('Parsed shopper context cookie is not a Record<string, string> object', parsed);
        return {};
    } catch (error) {
        // Invalid JSON in cookie - log warning and return empty object
        // eslint-disable-next-line no-console
        console.warn('Failed to parse shopper context cookie:', error instanceof Error ? error.message : String(error));
        return {};
    }
}

/**
 * Extract qualifiers from URL query parameters into a map
 * Uses SHOPPER_CONTEXT_SEARCH_PARAMS to determine which qualifiers to extract
 */
export function extractQualifiersFromUrl(url: URL): {
    qualifiers: Record<string, string>;
    sourceCodeQualifiers: Record<string, string>;
} {
    const qualifiers: Record<string, string> = {};
    const sourceCodeQualifiers: Record<string, string> = {};

    // For temporary storage of qualifiers with value as string array
    // For example: couponCodes
    const tempQualifiers: Record<string, string[]> = {};

    // Iterate through all URL search params
    for (const [searchParamKey, searchParamValue] of url.searchParams.entries()) {
        if (!searchParamKey) continue;

        const mapping = SHOPPER_CONTEXT_SEARCH_PARAMS[searchParamKey];
        let apiFieldName: string | undefined;
        let qualifierMapping: QualifierMapping | undefined;

        // Check if it's a root-level qualifier (e.g., src)
        if (mapping && QUALIFIER_MAPPING_PARAM_NAME in mapping) {
            qualifierMapping = mapping as QualifierMapping;
        }
        // Check if it's a customQualifier (e.g., customQualifiers.device)
        else if (isCustomQualifier(searchParamKey)) {
            qualifierMapping = customQualifiersMapping[searchParamKey];
        }
        // Check if it's an assignmentQualifier (e.g., assignmentQualifiers.store)
        else if (isAssignmentQualifier(searchParamKey)) {
            qualifierMapping = assignmentQualifiersMapping[searchParamKey];
        }

        if (qualifierMapping && qualifierMapping[QUALIFIER_MAPPING_PARAM_NAME] === searchParamKey) {
            apiFieldName =
                qualifierMapping[QUALIFIER_MAPPING_API_FIELD_NAME] ?? qualifierMapping[QUALIFIER_MAPPING_PARAM_NAME];

            // Separate sourceCode from other qualifiers
            if (apiFieldName === SOURCE_CODE_API_FIELD_NAME) {
                sourceCodeQualifiers[apiFieldName] = searchParamValue;
            } else {
                if (!tempQualifiers[apiFieldName]) {
                    tempQualifiers[apiFieldName] = [];
                }
                // Add to regular qualifiers (for other qualifiers than sourceCode)
                tempQualifiers[apiFieldName].push(searchParamValue);
            }
        }
    }

    // Convert temporary qualifiers with value as string array to qualifiers with value as string
    // As cookies only support string values
    // Will use string.split(',') to get the values as string array in buildShopperContextBody
    // As API call will need payload as string or string array
    for (const key in tempQualifiers) {
        const values = tempQualifiers[key];
        qualifiers[key] = values.join(',');
    }

    return { qualifiers, sourceCodeQualifiers };
}

/**
 * Compute effective shopper context
 * Currently only handles sourceCode and customQualifiers
 *
 * @param newShopperContext - New context state from URL
 * @param newSourceCodeContext - New source code state from URL
 * @param currentShopperContext - Current context state from cookie
 * @param currentSourceCodeContext - Current source code state from cookie
 * @returns Object with effective new context states for generic and source code cookies
 */
export function computeEffectiveShopperContext(
    newShopperContext: Record<string, string>,
    newSourceCodeContext: Record<string, string>,
    currentShopperContext: Record<string, string>,
    currentSourceCodeContext: Record<string, string>
): {
    effectiveShopperContext: Record<string, string>;
    effectiveSourceCodeContext: Record<string, string>;
} {
    const effectiveShopperContext: Record<string, string> = { ...currentShopperContext };
    const effectiveSourceCodeContext: Record<string, string> = { ...currentSourceCodeContext };

    // Update sourceCode if present in newSourceCodeContext (allow null, but not undefined)
    if (newSourceCodeContext.sourceCode !== undefined) {
        effectiveSourceCodeContext.sourceCode = newSourceCodeContext.sourceCode;
    }

    // Update other qualifiers
    Object.keys(newShopperContext).forEach((key) => {
        // Update qualifier if present in newShopperContext (allow null, but not undefined)
        if (newShopperContext[key] !== undefined) {
            effectiveShopperContext[key] = newShopperContext[key];
        }
    });

    return {
        effectiveShopperContext,
        effectiveSourceCodeContext,
    };
}

/**
 * Build ShopperContext API body
 *
 * @param contextMap - Map of key-value pairs for shopper context (includes both root-level and custom qualifiers)
 * @param sourceCodeContextMap - Map of key-value pairs for source code context
 * @returns ShopperContext body for API call
 */
export function buildShopperContextBody(
    contextMap: Record<string, string>,
    sourceCodeContextMap: Record<string, string>
): Partial<ShopperContext> {
    const body: Partial<ShopperContext> = {};

    // Add sourceCode if present
    if (sourceCodeContextMap.sourceCode) {
        const sourceCodeValue = sourceCodeContextMap.sourceCode.trim();
        if (sourceCodeValue.length > 0) {
            body.sourceCode = sourceCodeValue;
        }
    }

    Object.keys(contextMap).forEach((key) => {
        // Validate key and value
        if (!key || typeof key !== 'string' || key.trim().length === 0) {
            return;
        }

        // Skip sourceCode from contextMap if it's already set from sourceCodeContextMap
        // sourceCodeContextMap takes precedence
        if (key === SOURCE_CODE_API_FIELD_NAME && body.sourceCode) {
            return;
        }

        const rawValue = contextMap[key];

        // Skip if value is not a string
        if (typeof rawValue !== 'string') {
            return;
        }

        const isKeyCustomQualifier = isCustomQualifier(key);
        const isKeyAssignmentQualifier = isAssignmentQualifier(key);
        const isKeyCouponCode = isCouponCode(key);

        const valueArray = rawValue.split(',');
        const value = valueArray.length === 1 ? valueArray[0] : undefined;

        if (isKeyCouponCode && valueArray && Array.isArray(valueArray)) {
            // Only for root-level qualifiers with value as string array
            // For example: couponCodes
            body.couponCodes = valueArray.map((v) => v.trim()).filter((v) => v.length > 0);
        }
        if (value && typeof value === 'string' && value.trim().length > 0 && !isKeyCouponCode) {
            if (isKeyCustomQualifier) {
                // Add custom qualifiers
                body.customQualifiers = {
                    ...body.customQualifiers,
                    [key]: value.trim(),
                };
            } else if (isKeyAssignmentQualifier) {
                // Add assignment qualifiers
                body.assignmentQualifiers = {
                    ...body.assignmentQualifiers,
                    [key]: value.trim(),
                };
            } else {
                // Add root-level qualifiers with value as string
                // For example: src
                (body as Record<string, string>)[key] = value.trim();
            }
        }
    });

    return body;
}
