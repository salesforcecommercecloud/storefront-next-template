import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { fetchSearchProducts } from '@/lib/api/search';
import { fetchCategories } from '@/lib/api/categories';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import HeroCarousel, { type HeroSlide } from '@/components/hero-carousel';
import HomeSkeleton from '@/components/home/skeleton';
import { PopularCategories } from '@/components/home/popular-categories';
import { ProductCarouselWithSuspense } from '@/components/product-carousel';
import { ContentCard } from '@/components/content-card';
import { Button } from '@/components/ui/button';
import { getConfig } from '@/config';
import uiStrings from '@/temp-ui-string';
import heroImage from '/images/hero-cube.png';
import heroNewArrivals from '/images/hero-new-arrivals.png';

type HomePageData = {
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    categories: Promise<ShopperProducts.schemas['Category'][]>;
};

// Hero carousel slides data
const heroSlides: HeroSlide[] = [
    {
        id: 'slide-1',
        title: uiStrings.home.hero.slide1.title,
        subtitle: uiStrings.home.hero.slide1.subtitle,
        imageUrl: heroImage,
        imageAlt: uiStrings.home.hero.slide1.imageAlt,
        ctaText: uiStrings.home.hero.slide1.ctaText,
        ctaLink: '/category/root',
    },
    {
        id: 'slide-2',
        title: uiStrings.home.hero.slide2.title,
        subtitle: uiStrings.home.hero.slide2.subtitle,
        imageUrl: heroImage,
        imageAlt: uiStrings.home.hero.slide1.imageAlt,
        ctaText: uiStrings.home.hero.slide2.ctaText,
        ctaLink: '/category/root',
    },
    {
        id: 'slide-3',
        title: uiStrings.home.hero.slide3.title,
        subtitle: uiStrings.home.hero.slide3.subtitle,
        imageUrl: heroImage,
        imageAlt: uiStrings.home.hero.slide1.imageAlt,
        ctaText: uiStrings.home.hero.slide3.ctaText,
        ctaLink: '/shipping',
    },
];

/**
 * Internal helper function that fetches home page data.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @returns Promise that resolves to an object containing search result promise
 */
function getPageData({ context }: LoaderFunctionArgs, limit: number): HomePageData {
    return {
        searchResult: fetchSearchProducts(context, {
            categoryId: 'root',
            limit,
        }),
        categories: fetchCategories(context, 'root', 1),
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
function HomeView({
    loaderData: { searchResult: searchResultPromise, categories: categoriesPromise },
}: RouteComponentProps<HomePageData>) {
    return (
        <div className="pb-16 -mt-8">
            <HeroCarousel
                slides={heroSlides}
                autoPlay={true}
                autoPlayInterval={6000}
                showNavigation={true}
                showDots={true}
            />

            {/* Featured Products */}
            <div className="pt-16 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <ProductCarouselWithSuspense
                    resolve={searchResultPromise}
                    title={uiStrings.home.featuredProducts.title}
                />
            </div>

            {/* New Arrivals */}
            <div className="pt-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center rounded-2xl overflow-hidden">
                        <div className="relative h-64 lg:h-96">
                            <img
                                src={heroNewArrivals}
                                alt={uiStrings.home.newArrivals.title}
                                className="w-full h-full object-contain"
                                loading="lazy"
                            />
                        </div>
                        <div className="p-8 lg:p-12">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground mb-4">
                                {uiStrings.home.newArrivals.title}
                            </h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                {uiStrings.home.newArrivals.description}
                            </p>
                            <Button size="lg" asChild>
                                <a href="/category/newarrivals">{uiStrings.home.newArrivals.ctaText}</a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popular Categories */}
            <PopularCategories categoriesPromise={categoriesPromise} />

            {/* Featured Content Cards */}
            <div className="pt-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ContentCard
                            title={uiStrings.home.featuredContent.women.title}
                            description={uiStrings.home.featuredContent.women.description}
                            imageUrl={heroNewArrivals}
                            imageAlt={uiStrings.home.featuredContent.women.imageAlt}
                            buttonText={uiStrings.home.featuredContent.women.ctaText}
                            buttonLink="/category/womens"
                            showBackground={false}
                            showBorder={false}
                            loading="lazy"
                        />
                        <ContentCard
                            title={uiStrings.home.featuredContent.men.title}
                            description={uiStrings.home.featuredContent.men.description}
                            imageUrl={heroNewArrivals}
                            imageAlt={uiStrings.home.featuredContent.men.imageAlt}
                            buttonText={uiStrings.home.featuredContent.men.ctaText}
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
