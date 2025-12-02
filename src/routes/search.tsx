import { Suspense, useEffect, useRef, useCallback } from 'react';
import { Await, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { fetchSearchProducts } from '@/lib/api/search';
import { getConfig, useConfig } from '@/config';
import CategorySkeleton, { CategoryHeaderSkeleton, CategoryRefinementsSkeleton } from '@/components/category-skeleton';
import CategoryPagination from '@/components/category-pagination';
import CategoryRefinements from '@/components/category-refinements';
import CategorySorting from '@/components/category-sorting';
import ProductGrid from '@/components/product-grid';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/hooks/use-analytics';
import { PageType } from '@/lib/decorators/page-type';
import { getRegionDefinition, RegionDefinition } from '@/lib/decorators/region-definition';
import { Region } from '@/components/region';
import { collectComponentDataPromises, fetchPageFromLoader } from '@/lib/util/pageLoader';
import { isDesignModeActive } from '@salesforce/storefront-next-runtime/design';

@PageType({
    name: 'Product Listing Page',
    description: 'Search results page with product listings and personalized content',
    supportedAspectTypes: [],
})
@RegionDefinition([
    {
        id: 'plp-top-full-width',
        name: 'Top Full Width Region',
        description: 'Full screen width region at the top of search results',
        maxComponents: 5,
        componentTypeInclusions: ['heroCarousel', 'productCarousel', 'hero'],
    },
    {
        id: 'plp-top-content',
        name: 'Top Content Region',
        description: 'Content width region below sort/filter, above product grid',
        maxComponents: 5,
        componentTypeInclusions: ['heroCarousel', 'productCarousel', 'hero'],
    },
    {
        id: 'plp-bottom',
        name: 'Bottom Region',
        description: 'Region at the bottom of search results after product grid',
        maxComponents: 5,
        componentTypeInclusions: ['heroCarousel', 'productCarousel', 'hero'],
    },
])
export class SearchPageMetadata {}

type SearchPageData = {
    searchTerm: string;
    refinements: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    page: Promise<ShopperExperience.schemas['Page']>;
    componentData: Promise<Record<string, Promise<unknown>>>;
};

function getPageData(loaderCtx: LoaderFunctionArgs, limit: number): SearchPageData {
    const { searchParams } = new URL(loaderCtx.request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const q = searchParams.get('q') ?? '';
    const sort = searchParams.get('sort') ?? '';
    const refine = searchParams.getAll('refine');

    const pagePromise = fetchPageFromLoader(loaderCtx, {
        pageId: 'plp',
    });

    const componentDataPromises = collectComponentDataPromises(loaderCtx, pagePromise);

    return {
        searchTerm: q,
        refinements: fetchSearchProducts(loaderCtx.context, {
            q,
            limit: 1,
            offset: 0,
            sort,

            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
            expand: ['none'],
        }),
        searchResult: fetchSearchProducts(loaderCtx.context, {
            q,
            limit,
            offset,
            sort,

            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
        }),
        page: pagePromise,
        componentData: componentDataPromises,
    };
}

// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs): SearchPageData {
    return getPageData(args, getConfig(args.context).global.productListing.productsPerPage);
}

// eslint-disable-next-line react-refresh/only-export-components
export function clientLoader(args: ClientLoaderFunctionArgs): SearchPageData {
    return getPageData(args, getConfig().global.productListing.productsPerPage);
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
    const isDesignMode = isDesignModeActive();

    const renderRegion = (pageData: ShopperExperience.schemas['Page'], regionId: string, className: string) => {
        const { regions } = pageData;
        const region = regions?.find((r) => r.id === regionId);
        const metadata = getRegionDefinition(SearchPageMetadata, regionId);
        const hasContent =
            region?.components &&
            region.components.length > 0 &&
            region.components.some((component: { id?: string; typeId?: string }) => component.id && component.typeId);

        return (isDesignMode || hasContent) && region ? (
            <div className={className}>
                <Region region={region} metadata={metadata} key={region.id} componentData={componentData} />
            </div>
        ) : null;
    };

    const handleProductClick = useCallback(
        (product: ShopperSearch.schemas['ProductSearchHit']) => {
            if (analytics) {
                analytics.trackClickProductInSearch({
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
                    analytics.trackViewSearch({
                        searchInputText: searchTerm,
                        searchResults: data.hits ?? [],
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
                    <Suspense fallback={<CategoryHeaderSkeleton />}>
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

                {/* plp-top-full-width */}
                <Suspense fallback={null}>
                    <Await resolve={page} errorElement={null}>
                        {(pageData) => renderRegion(pageData, 'plp-top-full-width', 'mb-8')}
                    </Await>
                </Suspense>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="hidden lg:block w-64 flex-shrink-0">
                        <Suspense fallback={<CategoryRefinementsSkeleton />}>
                            <Await resolve={refinements}>
                                {(refinementsData) => <CategoryRefinements result={refinementsData} />}
                            </Await>
                        </Suspense>
                    </div>

                    <div className="flex-grow">
                        {/* plp-top-content */}
                        <Suspense fallback={null}>
                            <Await resolve={page} errorElement={null}>
                                {(pageData) => renderRegion(pageData, 'plp-top-content', 'mb-8')}
                            </Await>
                        </Suspense>

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

                        {/* plp-bottom */}
                        <Suspense fallback={null}>
                            <Await resolve={page} errorElement={null}>
                                {(pageData) => renderRegion(pageData, 'plp-bottom', 'mt-8')}
                            </Await>
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
