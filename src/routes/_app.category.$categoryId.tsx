/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Fragment, Suspense, use, useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { type LoaderFunctionArgs, useLocation } from 'react-router';
import { ApiError, type ShopperProducts, type ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { fetchCategory } from '@/lib/api/categories';
import { fetchSearchProducts } from '@/lib/api/search';
import { getAllQueryParams, getQueryParam, PRODUCT_SEARCH_QUERY_PARAMS } from '@/lib/query-params';
import { getConfig, useConfig } from '@/config';
import { currencyContext } from '@/lib/currency';
import CategoryBreadcrumbs from '@/components/category-breadcrumbs';
import CategoryPagination from '@/components/category-pagination';
import ActiveFilters from '@/components/category-refinements/active-filters';
import CategoryRefinements from '@/components/category-refinements';
import CategorySorting from '@/components/category-sorting';
import ProductGrid from '@/components/product-grid';
import { useAnalytics } from '@/hooks/use-analytics';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { Region } from '@/components/region';
import { fetchPageWithComponentData, type PageWithComponentData } from '@/lib/util/pageLoader';
import { JsonLd } from '@/components/json-ld';
import { generateCategorySchema } from '@/utils/category-schema';

@PageType({
    name: 'Product Listing Page',
    description: 'Product listing page with product listings and personalized content',
    supportedAspectTypes: ['plp'],
})
@RegionDefinition([
    {
        id: 'plpTopFullWidth',
        name: 'Top Full Width Region',
        description: 'Full screen width region at the top of the results',
        maxComponents: 5,
    },
    {
        id: 'plpTopContent',
        name: 'Top Content Region',
        description: 'Content width region below sort/filter, above product grid',
        maxComponents: 5,
    },
    {
        id: 'plpBottom',
        name: 'Bottom Region',
        description: 'Region at the bottom of search results after product grid',
        maxComponents: 5,
    },
])
export class ProductListingPageMetadata {}

type CategoryPageData = {
    category: ShopperProducts.schemas['Category'];
    searchResultCritical: ShopperSearch.schemas['ProductSearchResult'];
    searchResultNonCritical: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    page: Promise<PageWithComponentData>;
    categoryId: string;
    refine: string[];
    currency: string;
    locale: string;
    categorySchema: Promise<ReturnType<typeof generateCategorySchema> | null>;
};

/**
 * Server-side loader function that fetches category data and product search results.
 * This function runs on the server during SSR and prepares data for the category page.
 * @returns Object containing search results, category data, and page metadata
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function loader(args: LoaderFunctionArgs): Promise<CategoryPageData> {
    const {
        context,
        request,
        params: { categoryId = '' },
    } = args;
    const { searchParams } = new URL(request.url);
    const offset = parseInt(getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.OFFSET) || '0', 10);
    const sort = getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.SORT);
    const refine = getAllQueryParams(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.REFINE);

    // Get currency and locale for cache-busting the page key
    const config = getConfig(context);
    const currency = context.get(currencyContext) as string;
    // TODO: replace this with locale detection when multi site implementation starts
    const currentSite = config.commerce.sites[0];
    const locale = currentSite.defaultLocale;
    const limit = config.search.products.hits.limit;

    let categoryData: ShopperProducts.schemas['Category'] | undefined;
    try {
        categoryData = await fetchCategory(context, categoryId, 0);
    } catch (e) {
        // Category data is considered critical, i.e., if the related SCAPI request fails, out-of-the-box we either
        // throw a `Response` with all the available information from the underlying `ApiError`, or we fall back to
        // simply throwing a generic 500 error. If that out-of-the-box behavior needs to be tweaked, e.g., for more
        // sophisticated SEO or error handling, this is the place to do it.
        if (e instanceof ApiError) {
            throw new Response(e.body.title || e.statusText, {
                status: e.status,
                statusText: e.body.detail || e.statusText,
                headers: e.headers,
            });
        }
        throw new Response('Internal Server Error', { status: 500 });
    }

    // Remove eventually existing category refinements (attribute ID = cgid)
    const effectiveRefine = refine.filter((r) => !r.startsWith('cgid='));
    effectiveRefine.push(`cgid=${categoryId}`);

    const criticalCount = config.search.products.hits.critical ?? 2;
    const searchResultCritical = await fetchSearchProducts(context, {
        limit: criticalCount,
        offset,
        sort,
        refine: effectiveRefine,
        currency,
    });

    const searchResultNonCritical = fetchSearchProducts(context, {
        limit: limit - criticalCount,
        offset: offset + criticalCount,
        sort,
        refine: effectiveRefine,
        currency,
    });

    // Generate category schema in loader (server-side) for SEO
    const categorySchemaPromise = searchResultNonCritical
        .then((searchResult: ShopperSearch.schemas['ProductSearchResult']) => {
            try {
                const url = new URL(request.url);
                const pageUrl = `${url.origin}${url.pathname}${url.search}`;
                // Validate inputs before generating schema
                if (!categoryData || !searchResult) {
                    return null;
                }
                return generateCategorySchema({
                    category: categoryData,
                    searchResult,
                    config,
                    pageUrl,
                    defaultCurrency: currency,
                });
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error generating category schema in loader:', error);
                return null;
            }
        })
        .catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Error in category schema promise chain:', error);
            return null;
        });

    return {
        category: categoryData,
        searchResultCritical,
        searchResultNonCritical,
        page: fetchPageWithComponentData(args, {
            pageId: 'plp',
            categoryId,
        }),
        categoryId,
        refine: effectiveRefine,
        currency,
        locale,
        categorySchema: categorySchemaPromise,
    };
}

/**
 * Category page component that displays a product category with filtering, sorting, and pagination.
 * This component uses the createPage factory to handle Suspense patterns.
 * @returns JSX element representing the category page
 */
/**
 * Component that renders JSON-LD schema when categorySchema promise resolves.
 * Must be inside Suspense boundary to ensure it streams correctly in SSR.
 */
function CategoryJsonLd({
    categorySchemaPromise,
}: {
    categorySchemaPromise: Promise<ReturnType<typeof generateCategorySchema> | null>;
}) {
    const categorySchema = use(categorySchemaPromise);
    return categorySchema ? <JsonLd data={categorySchema} id="category-schema" /> : null;
}

export default function CategoryPage({
    loaderData: {
        category,
        searchResultCritical,
        searchResultNonCritical,
        page,
        categoryId,
        refine,
        locale,
        currency,
        categorySchema,
    },
}: {
    loaderData: CategoryPageData;
}) {
    const config = useConfig();
    const limit = config.search.products.hits.limit;

    // Determine the maximum number of skeletons to display in the product grid
    // Out-of-the-box the idea is to not display more than 8 skeletons, i.e., two rows on a desktop device.
    const criticalCount = searchResultCritical.hits?.length ?? 0;
    const nonCriticalCount =
        Math.min(8, limit, searchResultCritical.total - searchResultCritical.offset) - criticalCount;

    const analytics = useAnalytics();
    const lastTrackedDataRef = useRef<string | null>(null);

    // Force remount when currency/locale/search params change to update Suspense boundaries with
    // new data without manually refresh the page on new selected currency/locale/filters (incl. pagination, sort, refinements)
    const location = useLocation();
    const pageKey = `${categoryId}-${currency}-${locale}-${location.search}-${location.hash}`;

    const nonCriticalPromise = useMemo(
        () => searchResultNonCritical.then((r) => r.hits ?? []),
        [searchResultNonCritical]
    );

    const [, startTransition] = useTransition();

    useEffect(() => {
        // Only track if we haven't already tracked this specific data combination
        if (pageKey !== lastTrackedDataRef.current) {
            lastTrackedDataRef.current = pageKey;

            startTransition(() => {
                void nonCriticalPromise
                    .then((searchHitsData: ShopperSearch.schemas['ProductSearchHit'][]) => {
                        if (analytics) {
                            void analytics.trackViewCategory({
                                category,
                                searchResults: [...(searchResultCritical.hits ?? []), ...searchHitsData],
                                sort:
                                    searchResultCritical.selectedSortingOption ||
                                    searchResultCritical.sortingOptions?.[0]?.label ||
                                    '',
                                refinements: searchResultCritical.selectedRefinements ?? {},
                            });
                        }
                    })
                    .catch(() => {
                        // Silently handle promise rejection
                    });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analytics, category, pageKey, nonCriticalPromise]);

    const handleProductClick = useCallback(
        (product: ShopperSearch.schemas['ProductSearchHit']) => {
            if (analytics) {
                void analytics.trackClickProductInCategory({
                    category,
                    product,
                });
            }
        },
        [analytics, category]
    );

    return (
        <Fragment key={pageKey}>
            <div className="pb-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-4">
                        <CategoryBreadcrumbs category={category} />
                    </div>

                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h1 className="text-3xl font-bold text-foreground">
                            {category?.name || category.id} ({searchResultCritical.total})
                        </h1>
                        {searchResultCritical?.sortingOptions && searchResultCritical.sortingOptions.length > 0 && (
                            <div className="flex-shrink-0">
                                <CategorySorting result={searchResultCritical} />
                            </div>
                        )}
                    </div>

                    {/* plpTopFullWidth */}
                    <Region className="mb-8" page={page} regionId="plpTopFullWidth" />

                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="hidden lg:block w-64 flex-shrink-0">
                            <CategoryRefinements result={searchResultCritical} refine={refine} />
                        </div>

                        <div className="flex-grow">
                            <ActiveFilters result={searchResultCritical} />

                            {/* plpTopContent */}
                            <Region className="mb-8" page={page} regionId="plpTopContent" />

                            <ProductGrid
                                critical={searchResultCritical.hits ?? []}
                                nonCritical={nonCriticalPromise}
                                nonCriticalCount={nonCriticalCount}
                                handleProductClick={handleProductClick}
                            />

                            {searchResultCritical.total > 1 && (
                                <div className="mt-10">
                                    <CategoryPagination
                                        limit={limit}
                                        offset={searchResultCritical.offset}
                                        total={searchResultCritical.total}
                                    />
                                </div>
                            )}

                            {/* plpBottom */}
                            <Region className="mt-8" page={page} regionId="plpBottom" />
                        </div>
                    </div>
                </div>
            </div>
            {/* Category JSON-LD Schema for SEO - separate Suspense to ensure it appears at the very top of body */}
            <Suspense fallback={null}>
                <CategoryJsonLd categorySchemaPromise={categorySchema} />
            </Suspense>
        </Fragment>
    );
}
