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
import { Fragment, useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { type LoaderFunctionArgs, type ShouldRevalidateFunctionArgs, useLocation } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { fetchSearchProducts } from '@/lib/api/search';
import { getConfig, useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { multiSiteContext, type MultiSiteContext } from '@salesforce/storefront-next-runtime/multi-site';

import { currencyContext } from '@/lib/currency';
import CategoryPagination from '@/components/category-pagination';
import ActiveFilters from '@/components/category-refinements/active-filters';
import FiltersButton from '@/components/category-refinements/filters-button';
import CategoryRefinements from '@/components/category-refinements';
import CategorySorting from '@/components/category-sorting';
import ProductGrid from '@/components/product-grid';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/hooks/use-analytics';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { Region } from '@/components/region';
import { SeoMeta } from '@/components/seo-meta';
import { fetchPageWithComponentData, type PageWithComponentData } from '@/lib/util/pageLoader';
import {
    getInitialFiltersOpen,
    getSearchWithoutFiltersParam,
    useFiltersPanelState,
} from '@/hooks/use-filters-panel-state';

@PageType({
    name: 'Search Results Page',
    description: 'Search results page with product listings and personalized content',
    supportedAspectTypes: [],
})
@RegionDefinition([
    {
        id: 'searchTopFullWidth',
        name: 'Top Full Width Region',
        description: 'Full screen width region at the top of search results',
        maxComponents: 5,
    },
    {
        id: 'searchTopContent',
        name: 'Top Content Region',
        description: 'Content width region below sort/filter, above product grid',
        maxComponents: 5,
    },
    {
        id: 'searchBottom',
        name: 'Bottom Region',
        description: 'Region at the bottom of search results after product grid',
        maxComponents: 5,
    },
])
export class SearchPageMetadata {}

export type SearchPageData = {
    searchTerm: string;
    searchResultCritical: ShopperSearch.schemas['ProductSearchResult'];
    searchResultNonCritical: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    page: Promise<PageWithComponentData>;
    refine: string[];
    currency: string;
    locale: string;
    initialFiltersOpen?: boolean;
};

/**
 * Server-side loader function that fetches search results data.
 * This function runs on the server during SSR and prepares data for the search page.
 * @returns Object containing search results, refinements, and page metadata
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function loader(args: LoaderFunctionArgs): Promise<SearchPageData> {
    const { context, request } = args;
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const q = searchParams.get('q') ?? '';
    const sort = searchParams.get('sort') ?? '';
    const refine = searchParams.getAll('refine');
    const initialFiltersOpen = getInitialFiltersOpen(searchParams);
    const currency = context.get(currencyContext) as string;

    const config = getConfig<AppConfig>(context);
    const locale = (context.get(multiSiteContext) as MultiSiteContext).locale.id;

    const limit = config.search.products.hits.limit;

    const criticalCount = config.search.products.hits.critical ?? 2;

    const searchResultCritical = await fetchSearchProducts(context, {
        q,
        limit: criticalCount,
        offset,
        sort,
        refine,
        currency,
    });

    return {
        searchTerm: q,
        searchResultCritical,
        searchResultNonCritical: fetchSearchProducts(context, {
            q,
            limit: limit - criticalCount,
            offset: offset + criticalCount,
            sort,
            refine,
            currency,
        }),
        page: fetchPageWithComponentData(args, {
            pageId: 'search',
        }),
        refine,
        currency,
        locale,
        initialFiltersOpen,
    };
}

// eslint-disable-next-line react-refresh/only-export-components
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
    const filtersOnlyChanged =
        currentUrl.pathname === nextUrl.pathname &&
        currentUrl.search !== nextUrl.search &&
        getSearchWithoutFiltersParam(currentUrl.search) === getSearchWithoutFiltersParam(nextUrl.search);

    if (filtersOnlyChanged) {
        return false;
    }

    return defaultShouldRevalidate;
}

export default function SearchPage({
    loaderData: {
        searchTerm,
        searchResultCritical,
        searchResultNonCritical,
        page,
        refine,
        currency,
        locale,
        initialFiltersOpen,
    },
}: {
    loaderData: SearchPageData;
}) {
    const { t } = useTranslation('search');
    const config = useConfig<AppConfig>();
    const limit = config.search.products.hits.limit;

    const [filtersOpen, toggleFiltersOpen] = useFiltersPanelState(initialFiltersOpen);

    // Determine the maximum number of skeletons to display in the product grid
    // Out-of-the-box the idea is to not display more than 8 skeletons, i.e., two rows on a desktop device.
    const criticalCount = searchResultCritical.hits?.length ?? 0;
    const nonCriticalCount =
        Math.min(8, limit, searchResultCritical.total - searchResultCritical.offset) - criticalCount;

    const analytics = useAnalytics();
    const lastTrackedSearchRef = useRef<string | null>(null);

    const location = useLocation();
    const searchWithoutFiltersParam = useMemo(() => getSearchWithoutFiltersParam(location.search), [location.search]);
    const pageIdentity = `${currency}-${locale}`;
    const analyticsKey = `${pageIdentity}-${searchWithoutFiltersParam}-${location.hash}`;
    const productGridDataKey = `${pageIdentity}-${searchWithoutFiltersParam}`;
    const selectedFiltersCount = useMemo(
        () => new URLSearchParams(location.search).getAll('refine').length,
        [location.search]
    );

    const nonCriticalPromise = useMemo(
        () => searchResultNonCritical.then((r) => r.hits ?? []),
        [searchResultNonCritical]
    );

    const [, startTransition] = useTransition();

    const handleProductClick = useCallback(
        (product: ShopperSearch.schemas['ProductSearchHit']) => {
            if (analytics) {
                void analytics.trackClickProductInSearch({
                    searchInputText: searchTerm,
                    product,
                });
            }
        },
        [analytics, searchTerm]
    );

    useEffect(() => {
        // Only track if we haven't already tracked this search
        if (analyticsKey !== lastTrackedSearchRef.current) {
            lastTrackedSearchRef.current = analyticsKey;

            startTransition(() => {
                void nonCriticalPromise
                    .then((searchHitsData: ShopperSearch.schemas['ProductSearchHit'][]) => {
                        void analytics.trackViewSearch({
                            searchInputText: searchTerm,
                            searchResults: [...(searchResultCritical.hits ?? []), ...searchHitsData],
                            sort:
                                searchResultCritical.selectedSortingOption ||
                                searchResultCritical.sortingOptions?.[0]?.label ||
                                '',
                            refinements: searchResultCritical.selectedRefinements ?? {},
                        });
                    })
                    .catch(() => {
                        // Silently handle promise rejection
                    });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analytics, searchTerm, analyticsKey, nonCriticalPromise]);

    return (
        <Fragment>
            <SeoMeta
                title={
                    searchTerm
                        ? t('titleWithQuery', { query: searchTerm, defaultValue: `Results for "${searchTerm}"` })
                        : t('title', { defaultValue: 'Search' })
                }
                description={
                    searchTerm
                        ? t('meta.descriptionWithQuery', {
                              query: searchTerm,
                              count: searchResultCritical.total,
                              defaultValue: `${searchResultCritical.total} results for "${searchTerm}"`,
                          })
                        : t('meta.description', { defaultValue: 'Search our store for products' })
                }
            />
            <div className="pb-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p>{t('results')}</p>
                            <h1 className="text-3xl font-bold text-foreground">
                                {searchTerm} ({searchResultCritical.total})
                            </h1>
                        </div>
                        {searchResultCritical?.sortingOptions && searchResultCritical.sortingOptions.length > 0 && (
                            <div className="flex-shrink-0">
                                <CategorySorting result={searchResultCritical} />
                            </div>
                        )}
                    </div>

                    {/* searchTopFullWidth */}
                    <Region className="mb-8" page={page} regionId="searchTopFullWidth" />

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Filters toggle button - mobile only (above panel) */}
                        <div className="lg:hidden">
                            <FiltersButton
                                onClick={toggleFiltersOpen}
                                isActive={filtersOpen}
                                selectedFiltersCount={selectedFiltersCount}
                            />
                        </div>

                        {/* Category Refinements - toggles visibility on left side */}
                        {filtersOpen && (
                            <div className="w-full lg:w-64 lg:flex-shrink-0">
                                <CategoryRefinements result={searchResultCritical} refine={refine} />
                            </div>
                        )}

                        <div className="flex-grow">
                            {/* Filters toggle button - desktop only (inside content area) */}
                            <div className="mb-4 hidden lg:block">
                                <FiltersButton
                                    onClick={toggleFiltersOpen}
                                    isActive={filtersOpen}
                                    selectedFiltersCount={selectedFiltersCount}
                                />
                            </div>

                            <ActiveFilters result={searchResultCritical} />

                            {/* searchTopContent */}
                            <Region className="mb-8" page={page} regionId="searchTopContent" />

                            <ProductGrid
                                key={productGridDataKey}
                                critical={searchResultCritical.hits ?? []}
                                nonCritical={nonCriticalPromise}
                                nonCriticalCount={nonCriticalCount}
                                hasRefinementsPanel={filtersOpen}
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

                            {/* searchBottom */}
                            <Region className="mt-8" page={page} regionId="searchBottom" />
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
}
