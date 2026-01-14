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
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
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
            {/* Title skeleton - matches real carousel: text-center mb-8, text-3xl sm:text-4xl */}
            {title && (
                <div className="text-center mb-8">
                    <Skeleton className="h-9 sm:h-10 w-64 mx-auto" />
                </div>
            )}

            {/* Carousel container skeleton with px-14 padding for nav arrows to match actual carousel */}
            <div className="px-14">
                <div className="relative w-full">
                    {/* CarouselContent outer wrapper with overflow-hidden */}
                    <div className="overflow-hidden">
                        {/* CarouselContent inner flex container - includes -ml-4 to match scrollable carousel */}
                        <div className="flex -ml-4 items-stretch flex-nowrap">
                            {Array.from({ length: finalItemCount }, (_, i) => i).map((index) => (
                                <div
                                    key={`carousel-item-${index}`}
                                    className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex pl-0 min-w-0 shrink-0 grow-0">
                                    <div className="w-full max-w-full min-w-0 flex">
                                        <ProductTileSkeleton />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation controls skeleton - positioned at -left-14/-right-14 to match real carousel */}
                    <div className="absolute -left-14 top-1/2 -translate-y-1/2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <div className="absolute -right-14 top-1/2 -translate-y-1/2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
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
        <Card className="border rounded-xl overflow-hidden w-full min-w-0 max-w-full flex flex-col-reverse justify-end h-full shadow-sm gap-0 py-0">
            {/* CardFooter - "More Options" button area (height 84px + padding 48px = 132px) */}
            <CardFooter className="px-6 pb-6 pt-6 flex-1 flex flex-col justify-end">
                <Skeleton className="h-21 w-full rounded-md" />
            </CardFooter>

            {/* CardContent - Price area (height 28px) */}
            <CardContent>
                <div className="mt-2">
                    <Skeleton className="h-5 w-16 ml-auto" />
                </div>
            </CardContent>

            {/* CardContent - Title, Swatches, Badges area (height 64px) */}
            <CardContent className="px-6 pb-0 pt-0 flex flex-row gap-1.5 items-start justify-start self-stretch relative h-16">
                <div className="flex flex-col gap-1 items-start justify-start relative flex-1 min-w-0 h-full">
                    {/* Title area - h-10 */}
                    <div className="h-10 flex items-start w-full">
                        <div className="w-full">
                            <Skeleton className="h-4 w-full mb-1" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>

                    {/* Swatches area - h-8 */}
                    <div className="h-8 flex items-end gap-1">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <Skeleton className="h-7 w-7 rounded-full" />
                    </div>
                </div>

                {/* Badges area */}
                <div className="flex flex-col gap-2.5 items-end justify-start shrink-0 relative w-max">
                    <Skeleton className="h-5 w-12 rounded-full" />
                </div>
            </CardContent>

            {/* CardHeader - Image area (height 278px + 64px padding = 342px) */}
            <CardHeader className="py-8 px-6 flex flex-col gap-4 items-center justify-center">
                <div className="bg-background rounded-xl overflow-hidden flex items-center justify-center w-full">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                </div>
            </CardHeader>
        </Card>
    );
}
