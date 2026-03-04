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
import { type LoaderFunctionArgs } from 'react-router';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { fetchSearchProducts } from '@/lib/api/search';
import { fetchCategories } from '@/lib/api/categories';
import { currencyContext } from '@/lib/currency';
import { Region } from '@/components/region';
import PopularCategories from '@/components/home/popular-categories';
import ContentCard from '@/components/content-card';
import { Button } from '@/components/ui/button';
import { getConfig } from '@/config';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';

import { fetchPageWithComponentData, type PageWithComponentData } from '@/lib/util/pageLoader';

import heroNewArrivals from '/images/hero-new-arrivals.webp';
import heroCube from '/images/hero-cube.webp';
import HeroCarousel, { HeroCarouselSkeleton, type HeroSlide } from '@/components/hero-carousel';
import { ProductCarouselSkeleton, ProductCarouselWithSuspense } from '@/components/product-carousel';
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
    },
    {
        id: 'main',
        name: 'Main Content Region',
        description: 'Region for main content',
        maxComponents: 5,
    },
])
export class HomePageMetadata {}

export type HomePageData = {
    page: Promise<PageWithComponentData>;
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    categories: Promise<ShopperProducts.schemas['Category'][]>;
};

/**
 * Server-side loader function that fetches home page data.
 * This function runs on the server during SSR and prepares data for the home page.
 * @returns Promise that resolves to an object containing search result promise
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs): HomePageData {
    const currency = args.context.get(currencyContext) as string;

    return {
        page: fetchPageWithComponentData(args, {
            pageId: 'homepage',
        }),
        searchResult: fetchSearchProducts(args.context, {
            refine: ['cgid=root'],
            limit: getConfig(args.context).pages.home.featuredProductsCount,
            currency: currency ?? undefined,
        }),
        categories: fetchCategories(args.context, 'root', 1),
    };
}

/**
 * Home page component that displays the home page content with granular Suspense boundaries.
 * Components within the page handle their own Suspense boundaries for progressive loading.
 * @returns JSX element representing the home page layout
 */
export default function HomePage({ loaderData }: { loaderData: HomePageData }) {
    const { t } = useTranslation('home');

    const heroSlides: HeroSlide[] = [
        {
            id: 'slide-1',
            title: t('hero-foundations.slide1.title'),
            subtitle: t('hero-foundations.slide1.subtitle'),
            imageUrl: heroCube,
            imageAlt: t('hero-foundations.slide1.imageAlt'),
            ctaText: t('hero-foundations.slide1.ctaText'),
            ctaLink: '/category/root',
        },
        {
            id: 'slide-2',
            title: t('hero-foundations.slide2.title'),
            subtitle: t('hero-foundations.slide2.subtitle'),
            imageUrl: heroCube,
            imageAlt: t('hero-foundations.slide2.imageAlt'),
            ctaText: t('hero-foundations.slide2.ctaText'),
            ctaLink: '/category/root',
        },
        {
            id: 'slide-3',
            title: t('hero-foundations.slide3.title'),
            subtitle: t('hero-foundations.slide3.subtitle'),
            imageUrl: heroCube,
            imageAlt: t('hero-foundations.slide3.imageAlt'),
            ctaText: t('hero-foundations.slide3.ctaText'),
            ctaLink: '/category/root',
        },
    ];

    return (
        <div className="pb-16 -mt-8">
            {/* Header Banner Region - Region component handles its own Suspense internally */}
            <div>
                <Region
                    page={loaderData.page}
                    regionId="headerbanner"
                    fallbackElement={
                        <>
                            {/* Provide fallback skeletons for the above the fold content */}
                            <HeroCarouselSkeleton showDots={true} showNavigation={true} />
                            <ProductCarouselSkeleton title={t('featuredProducts.title')} />
                        </>
                    }
                    errorElement={
                        <>
                            <HeroCarousel
                                slides={heroSlides}
                                autoPlay={true}
                                autoPlayInterval={6000}
                                showNavigation={true}
                                showDots={true}
                            />

                            {/* Featured Products - ProductCarouselWithSuspense handles its own Suspense */}
                            <ProductCarouselWithSuspense
                                resolve={loaderData.searchResult}
                                title={t('featuredProducts.title')}
                                shopAllUrl="/category/root"
                                shopAllText={t('featuredProducts.shopAll')}
                            />
                        </>
                    }
                />
            </div>

            {/* Main Region - Region component handles its own Suspense internally */}
            {/* Note: This region doesn't provide fallback skeletons right now as it's located below the fold */}
            <Region
                page={loaderData.page}
                regionId="main"
                errorElement={
                    <>
                        {/* Popular Categories - full-width section with its own gray bg and container */}
                        <PopularCategories categoriesPromise={loaderData.categories} />

                        {/* New Arrivals - Static content */}
                        <div className="py-16">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center rounded-2xl overflow-hidden">
                                    <div className="relative h-64 lg:h-96 rounded-lg overflow-hidden">
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
                                        <p className="text-lg text-muted-foreground mb-6">
                                            {t('newArrivals.description')}
                                        </p>
                                        <Button size="lg" asChild>
                                            <a href="/category/newarrivals">{t('newArrivals.ctaText')}</a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Featured Content Cards - Static content */}
                        <div className="pt-16">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    </>
                }
            />
        </div>
    );
}
