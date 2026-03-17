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

/**
 * CartEmptySkeleton component that displays a loading skeleton for the empty cart state
 *
 * This component mirrors the layout of CartEmpty component:
 * - Centered card with icon placeholder
 * - Title and message text placeholders
 * - Action button placeholders (shows sign-in button only for guests)
 *
 * Used as a loading fallback when the cart page is hydrating and the cart is empty.
 *
 * @returns JSX element with empty cart skeleton display
 */
export default function CartEmptySkeleton({ isRegistered = false }: { isRegistered?: boolean }): ReactElement {
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
