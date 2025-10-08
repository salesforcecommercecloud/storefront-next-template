import { Suspense } from 'react';
import { Await, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperProductsTypes, ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import type { Route } from './+types/category.$categoryId';
import createClient from '@/lib/scapi';
import { fetchSearchProducts } from '@/lib/api/search';
import { getAllQueryParams, getQueryParam, PRODUCT_SEARCH_QUERY_PARAMS } from '@/lib/query-params';
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

const limit = 24;

type CategoryPageData = {
    category: Promise<ShopperProductsTypes.Category>;
    refinements: Promise<ShopperSearchTypes.ProductSearchResult>;
    searchResult: Promise<ShopperSearchTypes.ProductSearchResult>;
};

/**
 * Internal helper function that fetches category data and product search results.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @returns Promise that resolves to an object containing search results and category data
 */
function getPageData({ request, params, context }: LoaderFunctionArgs): CategoryPageData {
    const { searchParams } = new URL(request.url);
    const { categoryId = '' } = params;
    const offset = parseInt(getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.OFFSET) || '0', 10);
    const sort = getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.SORT);
    const refine = getAllQueryParams(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.REFINE);

    return {
        refinements: fetchSearchProducts(context, {
            categoryId,
            limit: 1,
            offset: 0,
            sort,
            refine,
            expand: ['none'],
        }),
        searchResult: fetchSearchProducts(context, {
            categoryId,
            limit,
            offset,
            sort,
            refine,
        }),
        category: createClient(context).ShopperProducts.getCategory({
            parameters: {
                id: categoryId,
                levels: 0,
            },
        }),
    };
}

/**
 * Server-side loader function that fetches category data and product search results.
 * This function runs on the server during SSR and prepares data for the category page.
 * @returns Promise that resolves to an object containing the data promise
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs): CategoryPageData {
    return getPageData(args);
}

/**
 * Client-side loader function that handles data loading for client-side navigation.
 * This function ensures React Router doesn't block navigation by returning a POJO
 * with the promise data instead of a direct promise.
 * @returns Object containing the data promise to prevent navigation blocking
 */
// eslint-disable-next-line react-refresh/only-export-components
export function clientLoader(args: ClientLoaderFunctionArgs): CategoryPageData {
    return getPageData(args);
}

/**
 * Category page component that displays a product category with filtering, sorting, and pagination.
 * This component uses the createPage factory to handle Suspense patterns.
 * @returns JSX element representing the category page
 */
export default function CategoryPage({ loaderData: { category, refinements, searchResult } }: Route.ComponentProps) {
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
                        <Await resolve={Promise.all([category, refinements])}>
                            {([categoryData, refinementsData]) => (
                                <>
                                    <h1 className="text-3xl font-bold text-foreground">
                                        {categoryData?.name || categoryData.id} ({refinementsData.total})
                                    </h1>
                                    <div className="flex-shrink-0">
                                        {refinementsData?.sortingOptions &&
                                            refinementsData.sortingOptions.length > 0 && (
                                                <CategorySorting result={refinementsData} />
                                            )}
                                    </div>
                                </>
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
                            <Await resolve={searchResult}>
                                {(searchResultData) => (
                                    <>
                                        <ProductGrid products={searchResultData.hits ?? []} />
                                        {searchResultData.total > 1 && (
                                            <div className="mt-10">
                                                <CategoryPagination limit={limit} result={searchResultData} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </Await>
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
