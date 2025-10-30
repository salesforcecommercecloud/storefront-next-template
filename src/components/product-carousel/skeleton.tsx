import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useConfig } from '@/config';

/**
 * ProductCarouselSkeleton component provides a loading state placeholder for product carousels.
 *
 * This skeleton component mimics the layout of a product carousel including:
 * - Optional title skeleton
 * - Horizontal carousel layout with multiple product card skeletons
 * - Navigation controls skeleton
 *
 * Used to improve perceived performance while product data is being fetched
 * from the commerce API, providing visual feedback to users during loading states.
 *
 * @param props - The component props
 * @param props.title - Optional title to display above the carousel skeleton
 * @param props.itemCount - Number of skeleton items to display (default: from config)
 *
 * @returns JSX element representing the product carousel skeleton layout
 *
 * @example
 * ```tsx
 * // Basic usage with default item count
 * <ProductCarouselSkeleton title="Featured Products" />
 *
 * // Usage with custom item count
 * <ProductCarouselSkeleton title="Recommended" itemCount={6} />
 *
 * // Usage without title
 * <ProductCarouselSkeleton />
 * ```
 *
 * @since 1.0.0
 */
export default function ProductCarouselSkeleton({ title, itemCount }: { title?: string; itemCount?: number }) {
    const config = useConfig();
    const finalItemCount = itemCount ?? config.global.carousel.defaultItemCount;
    return (
        <div className="w-full animate-pulse">
            {/* Title skeleton */}
            {title && (
                <div className="w-full text-center pb-4">
                    <Skeleton className="h-8 w-48 mx-auto" />
                </div>
            )}

            {/* Carousel container skeleton - full width to match actual carousel */}
            <div className="relative w-full">
                {/* Carousel content skeleton - matches CarouselContent with -ml-1 */}
                <div className="-ml-1 flex gap-4 overflow-hidden w-full">
                    {Array.from({ length: finalItemCount }, (_, i) => i).map((index) => (
                        <div key={`carousel-item-${index}`} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <div className="flex-none w-60 md:w-72 snap-start">
                                <ProductTileSkeleton />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation controls skeleton - positioned to match CarouselPrevious/CarouselNext */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
        </div>
    );
}

/**
 * Individual product tile skeleton component for use within the carousel.
 *
 * This component creates a skeleton placeholder that matches the structure
 * of the actual ProductTile component, including image, swatches, title, and price areas.
 *
 * @returns JSX element representing a single product tile skeleton
 */
function ProductTileSkeleton() {
    return (
        <Card className="ring-secondary/40 bg-muted/50">
            <CardContent className="text-secondary border-destructive/30">
                <div className="group">
                    {/* Product image skeleton - matches ProductImageContainer */}
                    <Skeleton className="aspect-square w-full rounded-lg" />

                    {/* Swatches skeleton - matches ProductSwatches spacing */}
                    <div className="flex space-x-1">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </div>
                </div>
            </CardContent>

            <CardFooter>
                <div className="block w-full">
                    {/* Product title skeleton */}
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-2" />

                    {/* Product price skeleton */}
                    <Skeleton className="h-6 w-20" />
                </div>
            </CardFooter>
        </Card>
    );
}
