import { Skeleton } from '@/components/ui/skeleton';

/**
 * HeroCarouselSkeleton component provides a loading state placeholder for hero carousels.
 *
 * This skeleton component mimics the layout of a hero carousel including:
 * - Full-width hero image area
 * - Content overlay with title and subtitle skeletons
 * - CTA button skeleton
 * - Navigation dots skeleton
 * - Navigation controls skeleton
 *
 * Used to improve perceived performance while hero carousel data is being fetched,
 * providing visual feedback to users during loading states.
 *
 * @param props - The component props
 * @param props.slideCount - Number of slides to show in dots (default: 3)
 * @param props.showDots - Whether to show navigation dots skeleton (default: true)
 * @param props.showNavigation - Whether to show navigation controls skeleton (default: true)
 *
 * @returns JSX element representing the hero carousel skeleton layout
 *
 * @example
 * ```tsx
 * // Basic usage with default settings
 * <HeroCarouselSkeleton />
 *
 * // Usage with custom slide count
 * <HeroCarouselSkeleton slideCount={5} />
 *
 * // Usage without navigation elements
 * <HeroCarouselSkeleton showDots={false} showNavigation={false} />
 * ```
 *
 * @since 1.0.0
 */
export default function HeroCarouselSkeleton({
    slideCount = 3,
    showDots = true,
    showNavigation = true,
}: {
    slideCount?: number;
    showDots?: boolean;
    showNavigation?: boolean;
}) {
    return (
        <div className="relative w-full max-h-[70vh] animate-pulse">
            {/* Hero image skeleton */}
            <div className="relative w-full h-full min-h-[300px] max-h-[70vh] overflow-hidden">
                <Skeleton className="w-full h-full min-h-[300px] object-cover" />

                {/* Dark overlay for better contrast - matches actual component */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-[5]" />

                {/* Content overlay skeleton */}
                <div className="absolute inset-0 z-10 flex items-center">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-2xl space-y-4 sm:space-y-6 md:space-y-8">
                            {/* Title skeleton */}
                            <div className="space-y-2">
                                <Skeleton className="h-8 sm:h-10 md:h-12 lg:h-16 w-full bg-white/20" />
                                <Skeleton className="h-8 sm:h-10 md:h-12 lg:h-16 w-3/4 bg-white/20" />
                            </div>

                            {/* Subtitle skeleton */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 sm:h-5 md:h-6 lg:h-7 w-full bg-white/15" />
                                <Skeleton className="h-4 sm:h-5 md:h-6 lg:h-7 w-5/6 bg-white/15" />
                            </div>

                            {/* CTA button skeleton */}
                            <Skeleton className="h-10 sm:h-12 md:h-14 lg:h-16 w-32 sm:w-36 md:w-40 lg:w-44 bg-white/25 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation dots skeleton */}
            {showDots && slideCount > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                    {Array.from({ length: slideCount }, (_, index) => (
                        <Skeleton key={`dot-skeleton-${index}`} className="w-3 h-3 rounded-full bg-white/30" />
                    ))}
                </div>
            )}

            {/* Navigation controls skeleton */}
            {showNavigation && slideCount > 1 && (
                <div className="absolute bottom-6 right-6 z-20 hidden md:flex items-center space-x-2">
                    <Skeleton className="w-10 h-10 rounded-full bg-white/20" />
                    <Skeleton className="w-10 h-10 rounded-full bg-white/20" />
                </div>
            )}

            {/* Screen reader text skeleton */}
            <div className="sr-only">
                <Skeleton className="h-4 w-32 bg-transparent" />
            </div>
        </div>
    );
}
