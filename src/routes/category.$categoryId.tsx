import { Suspense, useEffect, useRef } from 'react';
import { Await, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { fetchCategory } from '@/lib/api/categories';
import { fetchSearchProducts } from '@/lib/api/search';
import { getAllQueryParams, getQueryParam, PRODUCT_SEARCH_QUERY_PARAMS } from '@/lib/query-params';
import { getConfig, useConfig } from '@/config';
import CategorySkeleton, {
    CategoryBreadcrumbsSkeleton,
    CategoryHeaderSkeleton,
    CategoryRefinementsSkeleton,
} from '@/components/category-skeleton';
import CategoryBreadcrumbs from '@/components/category-breadcrumbs';
import CategoryPagination from '@/components/category-pagination';
import CategoryRefinements from '@/components/category-refinements';
import CategorySorting from '@/components/category-sorting';
import ProductGrid from '@/components/product-grid';
import { useAnalytics } from '@/hooks/use-analytics';

type CategoryPageData = {
    category: Promise<ShopperProducts.schemas['Category']>;
    refinements: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
};

/**
 * Internal helper function that fetches category data and product search results.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @returns Promise that resolves to an object containing search results and category data
 */
function getPageData({ request, params, context }: LoaderFunctionArgs, limit: number): CategoryPageData {
    const { searchParams } = new URL(request.url);
    const { categoryId = '' } = params;

    // Ensure we have a valid category ID, fallback to 'root' if undefined or empty
    const safeCategoryId = categoryId && categoryId !== 'undefined' ? categoryId : 'root';

    const offset = parseInt(getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.OFFSET) || '0', 10);
    const sort = getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.SORT);
    const refine = getAllQueryParams(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.REFINE);

    return {
        refinements: fetchSearchProducts(context, {
            categoryId: safeCategoryId,
            limit: 1,
            offset: 0,
            sort,
            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
            expand: ['none'],
        }),
        searchResult: fetchSearchProducts(context, {
            categoryId: safeCategoryId,
            limit,
            offset,
            sort,
            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
        }),
        category: fetchCategory(context, safeCategoryId, 0),
    };
}

/**
 * Server-side loader function that fetches category data and product search results.
 * This function runs on the server during SSR and prepares data for the category page.
 * @returns Promise that resolves to an object containing the data promise
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs): CategoryPageData {
    return getPageData(args, getConfig(args.context).global.productListing.productsPerPage);
}

/**
 * Client-side loader function that handles data loading for client-side navigation.
 * This function ensures React Router doesn't block navigation by returning a POJO
 * with the promise data instead of a direct promise.
 * @returns Object containing the data promise to prevent navigation blocking
 */
// eslint-disable-next-line react-refresh/only-export-components
export function clientLoader(args: ClientLoaderFunctionArgs): CategoryPageData {
    return getPageData(args, getConfig().global.productListing.productsPerPage);
}

/**
 * Category page component that displays a product category with filtering, sorting, and pagination.
 * This component uses the createPage factory to handle Suspense patterns.
 * @returns JSX element representing the category page
 */
export default function CategoryPage({
    loaderData: { category, refinements, searchResult },
}: {
    loaderData: CategoryPageData;
}) {
    const config = useConfig();
    const limit = config.global.productListing.productsPerPage;

    const analytics = useAnalytics();
    const lastTrackedDataRef = useRef<string | null>(null);

    useEffect(() => {
        // Create a unique key based on the promise references
        const dataKey = `${String(category)}-${String(searchResult)}`;

        // Only track if we haven't already tracked this specific data combination
        if (dataKey !== lastTrackedDataRef.current) {
            void Promise.all([Promise.resolve(category), searchResult])
                .then(([categoryData, searchData]) => {
                    if (analytics) {
                        analytics.trackViewCategory({
                            category: categoryData,
                            searchResults: searchData.hits ?? [],
                        });
                    }
                })
                .catch(() => {
                    // Silently handle promise rejection
                });
            lastTrackedDataRef.current = dataKey;
        }
    }, [analytics, category, searchResult]);

    return (
        <div className="pb-16">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-4">
                    <Suspense fallback={<CategoryBreadcrumbsSkeleton />}>
                        <Await resolve={category}>
                            {(categoryData) => <CategoryBreadcrumbs category={categoryData} />}
                        </Await>
                    </Suspense>
                </div>

                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Suspense fallback={<CategoryHeaderSkeleton />}>
                        <h1 className="text-3xl font-bold text-foreground">
                            <Await resolve={category}>
                                {(categoryData) => <>{categoryData?.name || categoryData.id}</>}
                            </Await>{' '}
                            <Await resolve={refinements}>{(refinementsData) => <>({refinementsData.total})</>}</Await>
                        </h1>
                        <Await resolve={refinements}>
                            {(refinementsData) => (
                                <div className="flex-shrink-0">
                                    {refinementsData?.sortingOptions && refinementsData.sortingOptions.length > 0 && (
                                        <CategorySorting result={refinementsData} />
                                    )}
                                </div>
                            )}
                        </Await>
                    </Suspense>
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
                        <Suspense fallback={<CategorySkeleton />}>
                            <Await resolve={Promise.all([category, searchResult])}>
                                {([categoryData, searchResultData]) => {
                                    const handleProductClick = (product: ShopperSearch.schemas['ProductSearchHit']) => {
                                        if (analytics) {
                                            analytics.trackClickProductInCategory({
                                                category: categoryData,
                                                product,
                                            });
                                        }
                                    };

                                    return (
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
                                    );
                                }}
                            </Await>
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
