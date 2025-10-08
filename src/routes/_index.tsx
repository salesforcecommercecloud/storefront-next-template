import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { fetchSearchProducts } from '@/lib/api/search';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import Features from '@/components/home/features';
import HeroCarousel, { type HeroSlide } from '@/components/hero-carousel';
import Help from '@/components/home/help';
import HomeSkeleton from '@/components/home/skeleton';
import { ProductCarouselWithSuspense } from '@/components/product-carousel';
import heroImage from '/images/hero-cube.png';

type HomePageData = {
    searchResult: Promise<ShopperSearchTypes.ProductSearchResult>;
};

// Hero carousel slides data
const heroSlides: HeroSlide[] = [
    {
        id: 'slide-1',
        title: 'The React Starter Store for High Performers',
        subtitle: 'Discover our latest collection of products',
        imageUrl: heroImage,
        imageAlt: 'Minimalist white cube on clean background',
        ctaText: 'Shop Now',
        ctaLink: '/category/root',
    },
    {
        id: 'slide-2',
        title: 'Premium Quality Products',
        subtitle: 'Handpicked items for the modern lifestyle',
        imageUrl: heroImage,
        imageAlt: 'Minimalist white cube on clean background',
        ctaText: 'Explore Collection',
        ctaLink: '/category/root',
    },
    {
        id: 'slide-3',
        title: 'Fast & Reliable Delivery',
        subtitle: 'Get your orders delivered quickly and safely',
        imageUrl: heroImage,
        imageAlt: 'Minimalist white cube on clean background',
        ctaText: 'Learn More',
        ctaLink: '/shipping',
    },
];

/**
 * Internal helper function that fetches home page data.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @returns Promise that resolves to an object containing search result promise
 */
function getPageData({ context }: LoaderFunctionArgs): HomePageData {
    return {
        searchResult: fetchSearchProducts(context, {
            categoryId: 'root',
            limit: 12,
        }),
    };
}

/**
 * Server-side loader function that fetches home page data.
 * This function runs on the server during SSR and prepares data for the home page.
 * @returns Promise that resolves to an object containing search result promise
 */
export function loader(args: LoaderFunctionArgs) {
    return getPageData(args);
}

/**
 * Client-side loader function that handles data loading for client-side navigation.
 * This function ensures React Router doesn't block navigation by returning promises
 * directly instead of wrapped in a data object.
 * @returns Promise that resolves to an object containing search result promise
 */
export function clientLoader(args: ClientLoaderFunctionArgs) {
    return getPageData(args);
}

/**
 * Home view component that displays the home page content.
 * This component receives loader data and renders the main home view including
 * hero section, featured products, features, and help sections.
 * @returns JSX element representing the home page layout
 */
// eslint-disable-next-line react-refresh/only-export-components
function HomeView({ loaderData: { searchResult: searchResultPromise } }: RouteComponentProps<HomePageData>) {
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
            <div className="pt-16">
                <ProductCarouselWithSuspense resolve={searchResultPromise} title="Featured Products" />
            </div>

            {/* Features Section */}
            <div className="py-16">
                <Features />
            </div>

            {/* Help Section */}
            <div className="py-16">
                <Help />
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
