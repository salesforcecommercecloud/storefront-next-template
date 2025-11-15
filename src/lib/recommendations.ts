import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import type { LoaderFunctionArgs } from 'react-router';
import { fetchSearchProducts } from '@/lib/api/search';
import { getConfig } from '@/config';
import type { AppConfig } from '@/config/context';
import uiStrings from '@/temp-ui-string';

export interface RecommendationType {
    id: string;
    title: string;
    enabled: boolean;
    priority: number;
    sort: string;
    titleKey: string;
}

export interface RecommendationContext {
    product?: ShopperProducts.schemas['Product'];
    category?: ShopperProducts.schemas['Category'];
    subcategories?: Array<{ id: string; name: string; parentCategoryId: string }>;
}

/**
 * Get title from UI strings key
 */
function getTitleFromKey(titleKey: string): string {
    const keys = titleKey.split('.');
    let value: unknown = uiStrings;

    for (const key of keys) {
        value = (value as Record<string, unknown>)?.[key];
        if (value === undefined) break;
    }

    return (value as string) || titleKey;
}

/**
 * Safely get a valid category ID from the recommendation context
 * Handles cases where category or product data might be undefined
 */
function getSafeCategoryId(context: RecommendationContext, fallback: string = 'root'): string {
    const { product, category } = context;

    // Try to get category ID from various sources
    const categoryId = category?.id || product?.primaryCategoryId || fallback;

    // Ensure we never return undefined or the string 'undefined'
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null') {
        return fallback;
    }

    return categoryId;
}

/**
 * Generate search parameters for a specific recommendation type
 */
export function getSearchParamsForType(
    typeId: string,
    context: RecommendationContext,
    appConfig?: AppConfig
): Parameters<typeof fetchSearchProducts>[1] | null {
    const config = appConfig || getConfig();
    const typeConfig = config.global.recommendations.types[typeId as keyof typeof config.global.recommendations.types];

    if (!typeConfig?.enabled) {
        return null;
    }

    const { product, category } = context;

    switch (typeId) {
        case 'you-may-also-like': {
            if (!product) return null;
            return {
                categoryId: getSafeCategoryId(context),
                refine: [],
                limit: config.global.recommendations.search_limit.youMightLike,
                sort: typeConfig.sort,
            };
        }

        case 'complete-the-look': {
            if (!product) return null;

            // Skip if we don't have valid product data
            if (!product.id) {
                return {
                    categoryId: 'root',
                    refine: [],
                    limit: 0,
                    sort: typeConfig.sort,
                };
            }

            // For complete-the-look, we want the parent category if available, otherwise fallback to root
            const categoryId = category?.parentCategoryId || 'root';
            return {
                categoryId,
                refine: [`!id=${product.id}`],
                limit: config.global.recommendations.search_limit.completeLook,
                sort: typeConfig.sort,
            };
        }

        case 'recently-viewed': {
            if (!product) return null;
            return {
                categoryId: getSafeCategoryId(context),
                refine: [`!id=${product.id}`],
                limit: config.global.recommendations.search_limit.recentlyViewed,
                sort: typeConfig.sort,
            };
        }

        default:
            return null;
    }
}

/**
 * Generate recommendation data promises for a given context
 */
export function generateRecommendationPromises(
    context: LoaderFunctionArgs['context'],
    recommendationContext: RecommendationContext
): Array<{
    config: RecommendationType;
    promise: Promise<ShopperSearch.schemas['ProductSearchResult']>;
}> {
    if (!context) {
        return [];
    }

    // Get config from context
    const config = getConfig(context);

    // Get enabled recommendation types from config
    const types = getEnabledRecommendationTypes(config);

    return types.map((typeId) => {
        const typeConfig =
            config.global.recommendations.types[typeId as keyof typeof config.global.recommendations.types];

        if (!typeConfig?.enabled) {
            return {
                config: {
                    id: typeId,
                    title: getTitleFromKey(typeConfig?.titleKey || ''),
                    enabled: false,
                    priority: typeConfig?.priority || 999,
                    sort: typeConfig?.sort || 'best-matches',
                    titleKey: typeConfig?.titleKey || '',
                },
                promise: Promise.resolve({
                    hits: [],
                    query: '',
                    refinements: [],
                    searchPhraseSuggestions: { suggestedTerms: [] },
                    sortingOptions: [],
                    total: 0,
                    start: 0,
                    count: 0,
                    offset: 0,
                    limit: 0,
                } as ShopperSearch.schemas['ProductSearchResult']),
            };
        }

        const searchParams = getSearchParamsForType(typeId, recommendationContext, config);

        if (!searchParams) {
            return {
                config: {
                    id: typeId,
                    title: getTitleFromKey(typeConfig.titleKey),
                    enabled: typeConfig.enabled,
                    priority: typeConfig.priority,
                    sort: typeConfig.sort,
                    titleKey: typeConfig.titleKey,
                },
                promise: Promise.resolve({
                    hits: [],
                    query: '',
                    refinements: [],
                    searchPhraseSuggestions: { suggestedTerms: [] },
                    sortingOptions: [],
                    total: 0,
                    start: 0,
                    count: 0,
                    offset: 0,
                    limit: 0,
                } as ShopperSearch.schemas['ProductSearchResult']),
            };
        }

        // Special handling for "complete-the-look" with subcategories
        if (typeId === 'complete-the-look' && recommendationContext.subcategories?.length) {
            const subcategoryIds = recommendationContext.subcategories
                .filter((sub) => sub.id !== recommendationContext.category?.id)
                .map((sub) => sub.id);

            if (subcategoryIds.length > 0) {
                const searchPromises = subcategoryIds.map(async (subcategoryId) => {
                    try {
                        const result = await fetchSearchProducts(context, {
                            categoryId: subcategoryId,
                            refine: [],
                            limit: Math.ceil(
                                config.global.recommendations.search_limit.completeLook / subcategoryIds.length
                            ),
                            sort: typeConfig.sort,
                        });
                        return result;
                    } catch {
                        return {
                            hits: [],
                            total: 0,
                            query: '',
                            refinements: [],
                            searchPhraseSuggestions: { suggestedTerms: [] },
                            sortingOptions: [],
                            start: 0,
                            count: 0,
                            offset: 0,
                            limit: 0,
                        };
                    }
                });

                const combinedPromise = Promise.all(searchPromises).then((results) => {
                    const allHits = results.flatMap((result) => result.hits || []);
                    return {
                        hits: allHits.slice(0, config.global.recommendations.search_limit.completeLook),
                        total: Math.min(allHits.length, config.global.recommendations.search_limit.completeLook),
                        query: '',
                        refinements: [],
                        searchPhraseSuggestions: { suggestedTerms: [] },
                        sortingOptions: [],
                        start: 0,
                        count: Math.min(allHits.length, config.global.recommendations.search_limit.completeLook),
                        offset: 0,
                        limit: config.global.recommendations.search_limit.completeLook,
                    };
                });

                return {
                    config: {
                        id: typeId,
                        title: getTitleFromKey(typeConfig.titleKey),
                        enabled: typeConfig.enabled,
                        priority: typeConfig.priority,
                        sort: typeConfig.sort,
                        titleKey: typeConfig.titleKey,
                    },
                    promise: combinedPromise,
                };
            }
        }

        // Default handling for other recommendation types
        const safePromise = fetchSearchProducts(context, searchParams).catch(() => {
            return {
                hits: [],
                query: '',
                refinements: [],
                searchPhraseSuggestions: { suggestedTerms: [] },
                sortingOptions: [],
                total: 0,
                start: 0,
                count: 0,
                offset: 0,
                limit: 0,
            } as ShopperSearch.schemas['ProductSearchResult'];
        });

        return {
            config: {
                id: typeId,
                title: getTitleFromKey(typeConfig.titleKey),
                enabled: typeConfig.enabled,
                priority: typeConfig.priority,
                sort: typeConfig.sort,
                titleKey: typeConfig.titleKey,
            },
            promise: safePromise,
        };
    });
}

/**
 * Get enabled recommendation types from config
 */
export function getEnabledRecommendationTypes(configParam?: AppConfig): string[] {
    // Use provided config or fallback to getConfig()
    const config = configParam || getConfig();
    const typesConfig = config.global.recommendations.types;
    return Object.entries(typesConfig)
        .filter(([, typeConfig]) => (typeConfig as { enabled: boolean }).enabled)
        .sort(([, a], [, b]) => (a as { priority: number }).priority - (b as { priority: number }).priority)
        .map(([typeId]) => typeId);
}
