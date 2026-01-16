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
import { Suspense, useEffect, useRef, useCallback } from 'react';
import { Await, type LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { fetchSearchProducts } from '@/lib/api/search';
import { getConfig, useConfig } from '@/config';
import { currencyContext } from '@/lib/currency';
import CategorySkeleton, { CategoryHeaderSkeleton, CategoryRefinementsSkeleton } from '@/components/category-skeleton';
import CategoryPagination from '@/components/category-pagination';
import CategoryRefinements from '@/components/category-refinements';
import CategorySorting from '@/components/category-sorting';
import ProductGrid from '@/components/product-grid';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/hooks/use-analytics';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { Region } from '@/components/region';
import { collectComponentDataPromises, fetchPageFromLoader } from '@/lib/util/pageLoader';

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
    refinements: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    page: Promise<ShopperExperience.schemas['Page']>;
    componentData: Promise<Record<string, Promise<unknown>>>;
};

/**
 * Server-side loader function that fetches search results data.
 * This function runs on the server during SSR and prepares data for the search page.
 * @returns Object containing search results, refinements, and page metadata
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs): SearchPageData {
    const { searchParams } = new URL(args.request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const q = searchParams.get('q') ?? '';
    const sort = searchParams.get('sort') ?? '';
    const refine = searchParams.getAll('refine');
    const currency = args.context.get(currencyContext) as string;
    const limit = getConfig(args.context).global.productListing.productsPerPage;

    const pagePromise = fetchPageFromLoader(args, {
        pageId: 'search',
    });

    const componentDataPromises = collectComponentDataPromises(args, pagePromise);

    return {
        searchTerm: q,
        refinements: fetchSearchProducts(args.context, {
            q,
            limit: 1,
            offset: 0,
            sort,
            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
            expand: ['none'],
            currency,
        }),
        searchResult: fetchSearchProducts(args.context, {
            q,
            limit,
            offset,
            sort,
            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
            currency,
        }),
        page: pagePromise,
        componentData: componentDataPromises,
    };
}

export default function SearchPage({
    loaderData: { searchTerm, refinements, searchResult, page, componentData },
}: {
    loaderData: SearchPageData;
}) {
    const config = useConfig();
    const limit = config.global.productListing.productsPerPage;
    const analytics = useAnalytics();
    const lastTrackedSearchRef = useRef<string | null>(null);

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
        // Create a unique key for this search (term + result promise)
        const searchKey = `${searchTerm}-${String(searchResult)}`;

        // Only track if we haven't already tracked this search
        if (searchKey !== lastTrackedSearchRef.current) {
            void searchResult
                .then((data: ShopperSearch.schemas['ProductSearchResult']) => {
                    void analytics.trackViewSearch({
                        searchInputText: searchTerm,
                        searchResults: data.hits ?? [],
                        sort: data.selectedSortingOption || data.sortingOptions?.[0]?.label || '',
                        refinements: data.selectedRefinements ?? {},
                    });
                })
                .catch(() => {
                    // Silently handle promise rejection
                });
            lastTrackedSearchRef.current = searchKey;
        }
    }, [analytics, searchTerm, searchResult]);

    const { t } = useTranslation('search');

    return (
        <div className="pb-16">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Suspense fallback={<CategoryHeaderSkeleton className="h-15" />}>
                        <Await resolve={refinements}>
                            {(refinementsData) => (
                                <>
                                    <div>
                                        <p>{t('results')}</p>
                                        <h1 className="text-3xl font-bold text-foreground">
                                            {searchTerm} ({refinementsData.total})
                                        </h1>
                                    </div>

                                    <div className="flex-shrink-0">
                                        <CategorySorting result={refinementsData} />
                                    </div>
                                </>
                            )}
                        </Await>
                    </Suspense>
                </div>

                {/* searchTopFullWidth */}
                <div className="mb-8">
                    <Region
                        page={page}
                        regionId="searchTopFullWidth"
                        componentData={componentData}
                        errorElement={<div />}
                    />
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="hidden lg:block w-64 flex-shrink-0">
                        <Suspense fallback={<CategoryRefinementsSkeleton />}>
                            <Await resolve={refinements}>
                                {(refinementsData) => <CategoryRefinements result={refinementsData} />}
                            </Await>
                        </Suspense>
                    </div>

                    <div className="flex-grow">
                        {/* searchTopContent */}
                        <div className="mb-8">
                            <Region
                                page={page}
                                regionId="searchTopContent"
                                componentData={componentData}
                                errorElement={<div />}
                            />
                        </div>
                        <Suspense fallback={<CategorySkeleton />}>
                            <Await resolve={searchResult}>
                                {(searchResultData) => (
                                    <>
                                        <ProductGrid
                                            products={searchResultData.hits ?? []}
                                            handleProductClick={handleProductClick}
                                        />
                                        {searchResultData.total > 1 && (
                                            <div className="mt-10">
                                                <CategoryPagination limit={limit} result={searchResultData} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </Await>
                        </Suspense>

                        {/* searchBottom */}
                        <div className="mt-8">
                            <Region
                                page={page}
                                regionId="searchBottom"
                                componentData={componentData}
                                errorElement={<div />}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
