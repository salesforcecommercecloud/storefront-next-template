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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ExpressPaymentsSkeleton(): ReactElement {
    return (
        <div className="space-y-2" data-testid="express-payments-skeleton">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
            <div className="relative flex items-center py-2">
                <Skeleton className="flex-1 h-[2px]" />
                <Skeleton className="h-4 w-12 mx-4" />
                <Skeleton className="flex-1 h-[2px]" />
            </div>
        </div>
    );
}

export function ContactInfoSkeleton(): ReactElement {
    return (
        <Card className="relative gap-4">
            <CardHeader>
                <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-full rounded-md" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-12 w-24 rounded-md" />
                    <Skeleton className="h-12 flex-1 rounded-md" />
                </div>
                <div className="flex justify-end pt-4">
                    <Skeleton className="h-12 w-56 rounded-md" />
                </div>
            </CardContent>
        </Card>
    );
}

export function ShippingAddressSkeleton(): ReactElement {
    return (
        <Card className="relative gap-4">
            <CardHeader>
                <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <Skeleton className="h-12 w-56 rounded-md" />
                </div>
            </CardContent>
        </Card>
    );
}

export function ShippingOptionsSkeleton(): ReactElement {
    return (
        <Card className="relative gap-4">
            <CardHeader>
                <Skeleton className="h-6 w-44" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-32" />
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border-2 border-border rounded-lg">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-full max-w-xs" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-4">
                    <Skeleton className="h-12 w-56 rounded-md" />
                </div>
            </CardContent>
        </Card>
    );
}

export function PaymentSkeleton(): ReactElement {
    return (
        <Card className="relative gap-4">
            <CardHeader>
                <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-48" />
                    <div className="space-x-4 p-4 border-2 border-border rounded-lg flex items-center">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <div className="flex-1 flex justify-between items-center">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-5 w-12" />
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                </div>
                <div className="flex items-center gap-2 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </CardContent>
        </Card>
    );
}

export function PickupSkeleton(): ReactElement {
    return (
        <Card className="relative gap-4">
            <CardHeader>
                <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border border-border rounded-lg p-4 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex justify-end pt-4">
                    <Skeleton className="h-12 w-56 rounded-md" />
                </div>
            </CardContent>
        </Card>
    );
}

export function OrderSummarySkeleton(): ReactElement {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="space-y-5" data-testid="order-summary-skeleton">
                    <div className="space-y-4" role="presentation">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4 w-full text-sm">
                        <div className="flex w-full justify-between items-center">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function MyCartSkeleton({ itemCount = 2 }: { itemCount?: number }): ReactElement {
    return (
        <div className="w-full" data-testid="my-cart-skeleton">
            <div className="py-6 flex justify-between items-center border-b border-border">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5" />
                    <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="w-4 h-4" />
            </div>
            <div className="px-0 pb-6 space-y-4">
                {Array.from({ length: itemCount }).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={`cart-item-skeleton-${i}`} className="border border-border rounded-lg p-4">
                        <div className="flex gap-4">
                            <Skeleton className="w-20 h-20 rounded flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <div className="flex justify-between items-center mt-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
