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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-pulse">
            {title && (
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-8 md:h-9 w-64" />
                </div>
            )}

            <div className="relative w-full">
                {/* CarouselContent outer wrapper with overflow-hidden */}
                <div className="overflow-hidden">
                    {/* CarouselContent inner flex container - includes -ml-4 to match scrollable carousel */}
                    <div className="flex -ml-4 items-stretch flex-nowrap">
                        {Array.from({ length: finalItemCount }, (_, i) => i).map((index) => (
                            <div
                                key={`carousel-item-${index}`}
                                className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex pl-4 min-w-0 shrink-0 grow-0">
                                <div className="w-full max-w-full min-w-0 flex">
                                    <ProductTileSkeleton />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Navigation controls skeleton */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
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
        <Card className="rounded-xl overflow-hidden w-full max-w-full flex flex-col h-full gap-0 py-0">
            {/* Image area */}
            <CardHeader className="p-0">
                <Skeleton className="aspect-square w-full" />
            </CardHeader>

            {/* Swatches */}
            <CardContent className="px-4 pt-3 pb-0">
                <div className="flex items-center gap-1">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                </div>
            </CardContent>

            {/* Product name */}
            <CardContent className="px-4 pt-2 pb-0">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
            </CardContent>

            {/* Price */}
            <CardContent className="px-4 pt-2 pb-4">
                <Skeleton className="h-5 w-16" />
            </CardContent>
        </Card>
    );
}
