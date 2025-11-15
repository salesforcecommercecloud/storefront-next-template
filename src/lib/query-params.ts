import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Type-safe query parameter keys for product search
 */
export type ProductSearchQueryKeys = keyof ShopperSearch.operations['productSearch']['parameters']['query'];

/**
 * Type-safe query parameter constants for product search
 * These constants ensure we use the correct parameter names as defined in the commerce-sdk-isomorphic types
 */
export const PRODUCT_SEARCH_QUERY_PARAMS = {
    SORT: 'sort' as const,
    REFINE: 'refine' as const,
    Q: 'q' as const,
    SELECT: 'select' as const,
    CURRENCY: 'currency' as const,
    LOCALE: 'locale' as const,
    EXPAND: 'expand' as const,
    ALL_IMAGES: 'allImages' as const,
    PER_PRICEBOOK: 'perPricebook' as const,
    LIMIT: 'limit' as const,
    OFFSET: 'offset' as const,
    SITE_ID: 'siteId' as const,
} as const satisfies Record<string, ProductSearchQueryKeys>;

/**
 * Type-safe helper to get query parameter values
 * @param searchParams - URLSearchParams object
 * @param param - The query parameter key
 * @returns The parameter value or empty string
 */
export function getQueryParam(searchParams: URLSearchParams, param: ProductSearchQueryKeys): string {
    return searchParams.get(param) ?? '';
}

/**
 * Type-safe helper to get all query parameter values for array parameters
 * @param searchParams - URLSearchParams object
 * @param param - The query parameter key
 * @returns Array of parameter values
 */
export function getAllQueryParams(searchParams: URLSearchParams, param: ProductSearchQueryKeys): string[] {
    return searchParams.getAll(param);
}
