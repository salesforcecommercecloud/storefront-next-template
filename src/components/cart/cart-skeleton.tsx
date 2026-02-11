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
import type { ReactElement } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function CartEmptySkeleton({ isRegistered = false }: { isRegistered?: boolean }): ReactElement {
    return (
        <div className="bg-muted flex-1 min-w-full w-full" data-testid="sf-cart-empty-skeleton">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-8 text-center">
                        <div className="space-y-6">
                            {/* Empty Cart Icon Skeleton */}
                            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <Skeleton className="w-8 h-8 rounded" />
                            </div>

                            {/* Empty Cart Message Skeleton */}
                            <div className="space-y-2 flex flex-col items-center">
                                <Skeleton className="h-7 w-40" />
                                <Skeleton className="h-5 w-72" />
                                <Skeleton className="h-5 w-64" />
                            </div>

                            {/* Action Buttons Skeleton */}
                            <div className="space-y-3">
                                <Skeleton className="h-9 w-full rounded-md" />
                                {!isRegistered && <Skeleton className="h-9 w-full rounded-md" />}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function CartSkeleton({
    isRegistered = false,
    productItemCount,
}: {
    isRegistered?: boolean;
    productItemCount?: number;
}): ReactElement {
    if (!productItemCount) {
        return <CartEmptySkeleton isRegistered={isRegistered} />;
    }

    const productItemSkeletonIds = Array.from(
        { length: productItemCount },
        (_, index) => `sf-product-item-skeleton-${index + 1}`
    );

    return (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-skeleton">
            <div className="max-w-7xl mx-auto px-6">
                <div className="my-6">
                    <Skeleton className="h-8 w-48" />
                </div>

                <div className="md:hidden mb-3">
                    <div className="border rounded-md bg-card px-5 py-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                            {productItemSkeletonIds.map((id) => (
                                <Card className="border-none shadow-none" key={id}>
                                    <CardContent className="px-3 py-4 md:px-6 md:py-7">
                                        <div className="grid md:grid-cols-[140px_1fr] grid-cols-[72px_1fr] gap-5 min-w-0">
                                            <div className="flex-shrink-0 flex items-center justify-center">
                                                <Skeleton className="aspect-square md:w-32 w-16 rounded" />
                                            </div>
                                            <div className="flex-1 space-y-3 min-w-0">
                                                <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 min-w-0">
                                                    <div className="min-w-0 space-y-3">
                                                        <div className="space-y-2">
                                                            <Skeleton className="h-6 w-3/4" />
                                                            <Skeleton className="h-4 w-1/2" />
                                                            <Skeleton className="h-4 w-1/3" />
                                                        </div>
                                                        <Skeleton className="h-4 w-full" />
                                                        <div className="flex gap-2">
                                                            <Skeleton className="h-8 w-20" />
                                                            <Skeleton className="h-8 w-16" />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-4 justify-items-end flex-shrink-0">
                                                        <Skeleton className="h-10 w-[8.5rem] rounded-full" />
                                                        <div className="w-full flex flex-col items-end">
                                                            <Skeleton className="h-4 w-20 mb-2 self-end" />
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <Skeleton className="h-8 w-8 rounded-md" />
                                                                <Skeleton className="h-8 w-11 rounded-md" />
                                                                <Skeleton className="h-8 w-8 rounded-md" />
                                                            </div>
                                                        </div>
                                                        <Skeleton className="h-5 w-20 hidden md:block" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-5 w-20 md:hidden" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <Card className="border shadow-sm">
                            <CardContent className="p-6 space-y-5">
                                <Skeleton className="h-7 w-28" />
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-20" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-20" />
                                        <Skeleton className="h-5 w-12" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-12" />
                                        <Skeleton className="h-5 w-12" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-28" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                </div>
                                {/* Promo Code Accordion */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-2">
                                        <Skeleton className="h-5 w-36" />
                                        <Skeleton className="h-5 w-4" />
                                    </div>
                                </div>
                                {/* Checkout Button */}
                                <Skeleton className="h-9 w-full mt-8 mb-5 rounded-md" />
                                {/* Payment Methods */}
                                <div className="flex justify-center gap-2">
                                    <Skeleton className="h-6 w-10 rounded-md" />
                                    <Skeleton className="h-6 w-10 rounded-md" />
                                    <Skeleton className="h-6 w-10 rounded-md" />
                                    <Skeleton className="h-6 w-10 rounded-md" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
