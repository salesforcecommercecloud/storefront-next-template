// React
import type { ReactElement } from 'react';

// Components
import { ProductItemSkeleton } from '@/components/product-item-skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function OrderSummarySkeleton(): ReactElement {
    return (
        <Card data-testid="cart-order-summary">
            <CardContent className="p-6">
                <div className="space-y-5">
                    {/* Order Summary Title Skeleton */}
                    <Skeleton className="h-6 w-32" />

                    <div className="space-y-4">
                        {/* Cart Items Accordion Skeleton */}
                        <div className="border border-border rounded">
                            <div className="p-4 flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4" />
                            </div>
                        </div>

                        {/* Order Summary Details Skeleton */}
                        <div className="space-y-4">
                            {/* Subtotal */}
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-20" />
                            </div>

                            {/* Shipping */}
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>

                            {/* Tax */}
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>

                        {/* Promo Code Form Skeleton */}
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-8 w-20" />
                        </div>

                        <Separator className="w-full" />

                        {/* Total Skeleton */}
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CartCtaSkeleton(): ReactElement {
    return (
        <>
            {/* Button Skeleton - matches Button component styling */}
            <div className="w-full sm:w-[95%] lg:w-full mt-6 sm:mt-6 lg:mt-2 mb-4">
                <Skeleton className="h-10 w-full rounded-md lg:bg-background" />
            </div>

            {/* Credit Card Icons Skeleton - matches actual icon dimensions */}
            <div className="flex justify-center gap-2">
                <Skeleton className="w-10 h-8 rounded lg:bg-background" />
                <Skeleton className="w-10 h-8 rounded lg:bg-background" />
                <Skeleton className="w-10 h-8 rounded lg:bg-background" />
                <Skeleton className="w-10 h-8 rounded lg:bg-background" />
            </div>
        </>
    );
}

export default function CartSkeleton(): ReactElement {
    return (
        <div className="bg-muted flex-1" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
                <div className="space-y-24">
                    <div className="space-y-4">
                        {/* Cart Title Skeleton */}
                        <Skeleton className="h-7 lg:h-8 w-48" data-testid="cart-title-skeleton" />

                        <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] gap-10 xl:gap-20">
                            {/* Product Items List Skeleton */}
                            <div className="space-y-4">
                                <Card className="border border-border shadow-sm" data-testid="cart-product-item">
                                    <CardContent className="p-4">
                                        <ProductItemSkeleton />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Cart Summary Section Skeleton */}
                            <div className="space-y-4">
                                <OrderSummarySkeleton />
                                <div className="hidden lg:block" data-testid="cart-cta-desktop">
                                    <CartCtaSkeleton />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile CTA Skeleton */}
            <div
                className="h-32 sticky bottom-0 bg-background flex items-center flex-col lg:hidden"
                data-testid="cart-cta-mobile">
                <CartCtaSkeleton />
            </div>
        </div>
    );
}
