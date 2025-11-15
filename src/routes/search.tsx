import { Suspense } from 'react';
import { Await, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import type { Route } from './+types/search';
import { fetchSearchProducts } from '@/lib/api/search';
import { getConfig, useConfig } from '@/config';
import CategorySkeleton, { CategoryHeaderSkeleton, CategoryRefinementsSkeleton } from '@/components/category-skeleton';
import CategoryPagination from '@/components/category-pagination';
import CategoryRefinements from '@/components/category-refinements';
import CategorySorting from '@/components/category-sorting';
import ProductGrid from '@/components/product-grid';
import uiStrings from '@/temp-ui-string';

type SearchPageData = {
    searchTerm: string;
    refinements: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
};

function getPageData({ request, context }: LoaderFunctionArgs, limit: number): SearchPageData {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const q = searchParams.get('q') ?? '';
    const sort = searchParams.get('sort') ?? '';
    const refine = searchParams.getAll('refine');
    return {
        searchTerm: q,
        refinements: fetchSearchProducts(context, {
            q,
            limit: 1,
            offset: 0,
            sort,

            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
            expand: ['none'],
        }),
        searchResult: fetchSearchProducts(context, {
            q,
            limit,
            offset,
            sort,

            // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
            refine: refine as unknown as string,
        }),
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

export default function SearchPage({ loaderData: { searchTerm, refinements, searchResult } }: Route.ComponentProps) {
    const config = useConfig();
    const limit = config.global.productListing.productsPerPage;

    return (
        <div className="pb-16">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Suspense fallback={<CategoryHeaderSkeleton />}>
                        <Await resolve={refinements}>
                            {(refinementsData) => (
                                <>
                                    <div>
                                        <p>{uiStrings.search.results}</p>
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
