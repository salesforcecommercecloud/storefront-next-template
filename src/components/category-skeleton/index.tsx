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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CategoryBreadcrumbsSkeleton() {
    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <div className="flex flex-wrap items-center text-sm">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 mx-1 w-3" />
                <Skeleton className="h-5 w-24" />
            </div>
        </nav>
    );
}

export function CategoryHeaderSkeleton({ className }: { className?: string }) {
    return (
        <>
            <Skeleton className={cn('h-9 w-64', className)} />
            <div className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-9 w-32" />
                </div>
            </div>
        </>
    );
}

export function CategoryRefinementsSkeleton() {
    return (
        <div className="space-y-4">
            {/* Active filters */}
            <div className="border rounded-md p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
            </div>

            {/* Filter accordions */}
            <div className="border rounded-md">
                <div className="p-4 border-b">
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>

            <div className="border rounded-md">
                <div className="p-4 border-b">
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
        </div>
    );
}

/**
 * CategorySkeleton component provides a loading state placeholder for category pages.
 *
 * This skeleton component mimics the layout of a category page including:
 * - Breadcrumb navigation
 * - Category header with title and sorting controls
 * - Sidebar with filter options and active filters
 * - Product grid with multiple product cards
 * - Pagination controls
 *
 * Used to improve perceived performance while category data is being fetched
 * from the commerce API, providing visual feedback to users during loading states.
 *
 * @returns {JSX.Element} A skeleton layout matching the category page structure
 */
export default function CategorySkeleton() {
    return (
        <>
            {/* Product grid skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
                {Array.from({ length: 12 }, (_, i) => i).map((index) => (
                    <ProductTileSkeleton key={index} />
                ))}
            </div>

            {/* Pagination skeleton */}
            <div className="mt-10 flex justify-center">
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>
        </>
    );
}

function ProductTileSkeleton() {
    return (
        <Card className="ring-secondary/40 bg-muted/50">
            <CardContent className="text-secondary border-destructive/30">
                <div className="group bg-accent/30">
                    {/* Product image skeleton */}
                    <Skeleton className="aspect-square w-full rounded-md" />

                    {/* Swatches skeleton */}
                    <div className="mt-2 flex space-x-1">
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
