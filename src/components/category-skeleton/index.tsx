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

export function ProductTileSwatchesSkeleton({ count = 2 }: { count?: number }) {
    return (
        <div className="product-tile-swatches-skeleton flex flex-wrap gap-2">
            {Array.from({ length: count }, (_, i) => (
                <Skeleton key={i} className="h-7 w-7 rounded-full" />
            ))}
        </div>
    );
}

export function ProductTileSkeleton() {
    return (
        <Card className="product-tile-skeleton border rounded-xl overflow-hidden w-full min-w-0 max-w-full flex flex-col-reverse justify-end h-full shadow-sm gap-0 py-0">
            {/* Footer - "More Options" button */}
            <CardFooter className="px-6 pb-6 pt-6 flex-1 flex flex-col justify-end">
                <Skeleton className="h-9 w-full rounded-md" />
            </CardFooter>

            {/* Price */}
            <CardContent>
                <div className="mt-2">
                    <Skeleton className="h-5 w-16" />
                </div>
            </CardContent>

            {/* Product name + swatches + badges */}
            <CardContent className="px-6 pb-0 pt-0 flex flex-row gap-1.5 items-start justify-start self-stretch relative h-16">
                <div className="flex flex-col gap-1 items-start justify-start relative flex-1 min-w-0 h-full">
                    {/* Product name (2 lines) */}
                    <div className="h-10 flex flex-col gap-1 items-start justify-start w-full">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>

                    {/* Swatches */}
                    <div className="h-8 flex items-end">
                        <ProductTileSwatchesSkeleton count={2} />
                    </div>
                </div>

                {/* Badge placeholder */}
                <div className="flex flex-col gap-2.5 items-end justify-start shrink-0 relative w-max">
                    <Skeleton className="h-5 w-12 rounded-full" />
                </div>
            </CardContent>

            {/* Product image */}
            <CardHeader className="py-8 px-6 flex flex-col gap-4 items-center justify-center">
                <div className="bg-background rounded-xl overflow-hidden flex items-center justify-center w-full">
                    <Skeleton className="aspect-square w-full" />
                </div>
            </CardHeader>
        </Card>
    );
}
