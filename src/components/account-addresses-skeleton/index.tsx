/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Card, CardContent, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton component for the account addresses page content.
 * Matches the structure of the actual addresses page with a grid of address cards.
 */
export function AccountAddressesSkeleton() {
    return (
        <div className="space-y-6">
            {/* Page Header Skeleton */}
            <div>
                <Skeleton className="h-8 w-40" />
            </div>

            {/* Address Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }, (_, i) => i).map((index) => (
                    <Card key={index} className="border-border gap-0 py-4">
                        <CardHeader>
                            <CardTitle>
                                <Skeleton className="h-5 w-16" />
                            </CardTitle>
                            <CardAction>
                                <Skeleton className="h-5 w-20" />
                            </CardAction>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Skeleton className="h-8 w-12" />
                            <Skeleton className="h-8 w-16" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default AccountAddressesSkeleton;
