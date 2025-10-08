import { Skeleton } from '@/components/ui/skeleton';

/**
 * OrderSkeleton component provides a loading state placeholder for order confirmation pages.
 *
 * This skeleton component mimics the layout of an order confirmation page including:
 * - Success header with checkmark icon
 * - Order number and confirmation email
 * - Order summary card
 * - Shipping details card
 * - Payment details card
 * - Action buttons
 *
 * Used to improve perceived performance while order data is being fetched
 * from the commerce API, providing visual feedback to users during loading states.
 *
 * @returns {JSX.Element} A skeleton layout matching the order confirmation page structure
 */
export default function OrderSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Header Skeleton */}
                <div className="text-left mb-8">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Skeleton className="w-8 h-8 rounded-full" />
                    </div>
                    <Skeleton className="h-12 w-96 mb-4" />
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-6 w-80" />
                </div>

                {/* Order Summary Card Skeleton */}
                <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm mb-8">
                    <div className="px-6">
                        <Skeleton className="h-6 w-32 mb-6" />
                    </div>
                    <div className="px-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex justify-between text-sm">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex justify-between text-sm">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shipping Details Card Skeleton */}
                <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm mb-8">
                    <div className="px-6">
                        <Skeleton className="h-6 w-36 mb-6" />
                    </div>
                    <div className="px-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <Skeleton className="h-6 w-32 mb-2" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-4 w-8" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                            </div>
                            <div>
                                <Skeleton className="h-6 w-32 mb-2" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Details Card Skeleton */}
                <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm mb-8">
                    <div className="px-6">
                        <Skeleton className="h-6 w-32 mb-6" />
                    </div>
                    <div className="px-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <Skeleton className="h-6 w-32 mb-2" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-4 w-8" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                            </div>
                            <div>
                                <Skeleton className="h-6 w-32 mb-2" />
                                <div>
                                    <Skeleton className="h-4 w-16 mb-1" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Skeleton className="h-10 w-40 mx-auto sm:mx-0" />
                    <Skeleton className="h-10 w-32 mx-auto sm:mx-0" />
                </div>
            </div>
        </div>
    );
}
