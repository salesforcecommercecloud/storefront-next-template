import { type ReactNode } from 'react';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ProductTile } from '@/components/product-tile';
import withSuspense from '@/components/with-suspense';
import ProductCarouselSkeleton from './skeleton';
import { cn } from '@/lib/utils';

/**
 * ProductCarousel component displays a horizontal carousel of product tiles.
 *
 * This component renders a responsive carousel with navigation controls that displays
 * a collection of products in a scrollable horizontal layout. It's commonly used
 * for featured products, recommendations, or product collections on home and category pages.
 *
 * @param props - The component props
 * @param props.products - Array of product search hits to display in the carousel
 * @param props.title - Optional title to display above the carousel
 * @param props.className - Optional className to apply to the carousel wrapper
 *
 * @returns JSX element representing the product carousel, or a "No products found" message
 *
 * @example
 * ```tsx
 * // Basic usage with products array
 * <ProductCarousel
 *   products={searchResult.hits}
 *   title="Featured Products"
 * />
 *
 * // Usage without title
 * <ProductCarousel products={products} />
 *
 * // Usage with custom className
 * <ProductCarousel products={products} className="mt-8" />
 * ```
 *
 * @since 1.0.0
 */
export default function ProductCarousel({
    products,
    title,
    className,
}: {
    products: ShopperSearch.schemas['ProductSearchHit'][];
    title?: string;
    className?: string;
}): ReactNode {
    // Safety check for undefined or null products
    if (!products || products.length === 0) {
        return <div>No products found</div>;
    }

    return (
        <div className={cn(className)}>
            {title && (
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h2>
                </div>
            )}

            <Carousel
                className="w-full"
                opts={{
                    align: 'start',
                }}>
                <CarouselContent className="items-stretch flex-nowrap">
                    {products.map((product) => (
                        <CarouselItem
                            key={product.productId}
                            className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex justify-center pl-0">
                            <ProductTile product={product} className="h-auto" />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </div>
    );
}

/**
 * ProductCarouselWithSuspense component provides a ProductCarousel wrapped with a Suspense boundary.
 *
 * This component automatically shows the ProductCarouselSkeleton as a fallback while the
 * ProductCarousel is loading, providing better user experience during data fetching.
 *
 * When used with a `resolve` prop, the resolved data should be a ProductSearchResult
 * that will be passed as the `products` prop to the ProductCarousel component.
 *
 * @example
 * ```tsx
 * // Basic usage with Suspense boundary
 * <ProductCarouselWithSuspense
 *   products={searchResult.hits}
 *   title="Featured Products"
 * />
 *
 * // Usage with promise resolution as a prop
 * <ProductCarouselWithSuspense
 *   resolve={searchResultPromise}
 *   title="Featured Products"
 * />
 *
 * // Usage in a page with streaming
 * function HomePage() {
 *   return (
 *     <div>
 *       <Hero />
 *       <ProductCarouselWithSuspense resolve={searchResultPromise} title="Shop Products" />
 *     </div>
 *   );
 * }
 * ```
 */
export const ProductCarouselWithSuspense = withSuspense(ProductCarouselWithData, {
    fallback: <ProductCarouselSkeleton />,
});

/**
 * Internal component that handles data transformation for ProductCarousel.
 * This component receives the resolved data and transforms it to the expected format.
 * Only supports ProductSearchResult and ProductSearchHit types for simplicity.
 */
export function ProductCarouselWithData({
    data,
    title,
    ...props
}: {
    data?: ShopperSearch.schemas['ProductSearchResult'] | ShopperSearch.schemas['ProductSearchHit'][];
    title?: string;
    [key: string]: unknown;
}) {
    // If data is provided (from resolve), extract products from it
    if (data) {
        // Handle ProductSearchResult (has hits property)
        if ('hits' in data && Array.isArray(data.hits)) {
            return <ProductCarousel products={data.hits} title={title} {...props} />;
        }

        // Handle direct ProductSearchHit array
        if (Array.isArray(data)) {
            return <ProductCarousel products={data} title={title} {...props} />;
        }
    }

    // If no data or unsupported format, render empty state
    return <ProductCarousel products={[]} title={title} {...props} />;
}
