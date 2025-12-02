import { Suspense } from 'react';
import { Await, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperProducts, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { fetchSearchProducts } from '@/lib/api/search';
import { fetchCategories } from '@/lib/api/categories';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import HomeSkeleton from '@/components/home/skeleton';
import { Region } from '@/components/region';
import { PopularCategories } from '@/components/home/popular-categories';
import { ContentCard } from '@/components/content-card';
import { Button } from '@/components/ui/button';
import { getConfig } from '@/config';
import { PageType } from '@/lib/decorators/page-type';
import { getRegionDefinition, RegionDefinition } from '@/lib/decorators/region-definition';
import { PageDesignerPage } from '@salesforce/storefront-next-runtime/design/react/core';

import { collectComponentDataPromises, fetchPageFromLoader } from '@/lib/util/pageLoader';

import heroNewArrivals from '/images/hero-new-arrivals.png';
import { useTranslation } from 'react-i18next';

@PageType({
    name: 'Home Page',
    description: 'Main landing page with hero carousel, featured products, and help sections',
    supportedAspectTypes: [],
})
@RegionDefinition([
    {
        id: 'headerbanner',
        name: 'Header Banner Region',
        description: 'Region for promotional banners and hero content',
        maxComponents: 3,
        componentTypeExclusions: ['heroCarousel'],
    },
])
export class HomePageMetadata {}

export type HomePageData = {
    page: Promise<ShopperExperience.schemas['Page']>;
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    categories: Promise<ShopperProducts.schemas['Category'][]>;
    componentData: Promise<Record<string, Promise<unknown>>>;
};

/**
 * Internal helper function that fetches home page data.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @returns Promise that resolves to an object containing search result promise
 */
function getPageData(loaderCtx: LoaderFunctionArgs, limit: number): HomePageData | void {
    const pagePromise = fetchPageFromLoader(loaderCtx, {
        pageId: 'homepage',
    });

    const componentDataPromises = collectComponentDataPromises(loaderCtx, pagePromise);

    return {
        page: pagePromise,
        searchResult: fetchSearchProducts(loaderCtx.context, {
            categoryId: 'root',
            limit,
        }),
        categories: fetchCategories(loaderCtx.context, 'root', 1),
        componentData: componentDataPromises,
    };
}

/**
 * Server-side loader function that fetches home page data.
 * This function runs on the server during SSR and prepares data for the home page.
 * @returns Promise that resolves to an object containing search result promise
 */
export function loader(args: LoaderFunctionArgs) {
    return getPageData(args, getConfig(args.context).pages.home.featuredProductsCount);
}

/**
 * Client-side loader function that handles data loading for client-side navigation.
 * This function ensures React Router doesn't block navigation by returning promises
 * directly instead of wrapped in a data object.
 * @returns Promise that resolves to an object containing search result promise
 */
export function clientLoader(args: ClientLoaderFunctionArgs) {
    return getPageData(args, getConfig().pages.home.featuredProductsCount);
}

/**
 * Home view component that displays the home page content.
 * This component receives loader data and renders the main home view including
 * hero section, featured products, features, and help sections.
 * @returns JSX element representing the home page layout
 */
// eslint-disable-next-line react-refresh/only-export-components
function HomeView({ loaderData }: RouteComponentProps<HomePageData>) {
    const { t } = useTranslation('home');
    return (
        <div className="pb-16 -mt-8">
            <Suspense fallback={<div />}>
                <Await resolve={loaderData.page} errorElement={<div />}>
                    {(page) => {
                        const { regions } = page;
                        const headerBannerRegion = regions?.find((region) => region.id === 'headerbanner');
                        const headerBannerDesignMetadata = getRegionDefinition(HomePageMetadata, 'headerbanner');
                        return (
                            <PageDesignerPage page={page}>
                                {/* TODO: Once we have a universal way of fetching pages, we won't need to do manually wrap with PageDesignerPage. This will move in the future. */}
                                <div className="py-8">
                                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                                        {headerBannerRegion && (
                                            <Region
                                                region={headerBannerRegion}
                                                metadata={headerBannerDesignMetadata}
                                                key={headerBannerRegion.id}
                                                componentData={loaderData.componentData}
                                            />
                                        )}
                                    </div>
                                </div>
                            </PageDesignerPage>
                        );
                    }}
                </Await>
            </Suspense>
            {/* New Arrivals */}
            <div className="pt-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center rounded-2xl overflow-hidden">
                        <div className="relative h-64 lg:h-96">
                            <img
                                src={heroNewArrivals}
                                alt={t('newArrivals.title')}
                                className="w-full h-full object-contain"
                                loading="lazy"
                            />
                        </div>
                        <div className="p-8 lg:p-12">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground mb-4">
                                {t('newArrivals.title')}
                            </h2>
                            <p className="text-lg text-muted-foreground mb-6">{t('newArrivals.description')}</p>
                            <Button size="lg" asChild>
                                <a href="/category/newarrivals">{t('newArrivals.ctaText')}</a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popular Categories */}
            <PopularCategories categoriesPromise={loaderData.categories} />

            {/* Featured Content Cards */}
            <div className="pt-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ContentCard
                            title={t('featuredContent.women.title')}
                            description={t('featuredContent.women.description')}
                            imageUrl={heroNewArrivals}
                            imageAlt={t('featuredContent.women.imageAlt')}
                            buttonText={t('featuredContent.women.ctaText')}
                            buttonLink="/category/womens"
                            showBackground={false}
                            showBorder={false}
                            loading="lazy"
                        />
                        <ContentCard
                            title={t('featuredContent.men.title')}
                            description={t('featuredContent.men.description')}
                            imageUrl={heroNewArrivals}
                            imageAlt={t('featuredContent.men.imageAlt')}
                            buttonText={t('featuredContent.men.ctaText')}
                            buttonLink="/category/mens"
                            showBackground={false}
                            showBorder={false}
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Home page component that displays the main landing page with featured products.
 * This component uses the createPage factory to handle Suspense patterns and data loading.
 * The page factory automatically handles the Suspense boundary and passes loader data
 * directly to the HomeView component.
 * @returns A page component created by the createPage factory
 */
// eslint-disable-next-line react-refresh/only-export-components
export default createPage<HomePageData>({
    component: HomeView,
    fallback: <HomeSkeleton />,
});
