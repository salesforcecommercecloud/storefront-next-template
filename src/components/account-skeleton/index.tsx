import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton component for the account page layout.
 * Matches the structure of the actual account page with navigation and content areas.
 */
export function AccountSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Mobile Navigation Skeleton */}
                    <div className="lg:hidden">
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <Skeleton className="h-6 w-24 mb-4" />
                                <div className="space-y-1">
                                    {/* Navigation items skeleton */}
                                    {Array.from({ length: 4 }, (_, i) => i).map((index) => (
                                        <div
                                            key={index}
                                            className="w-full px-3 py-2 rounded-md flex items-center gap-2">
                                            <Skeleton className="h-5 w-5 rounded" />
                                            <Skeleton className="h-4 flex-1" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Desktop Sidebar Navigation Skeleton */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-24" />
                            <div className="space-y-1">
                                {/* Navigation items skeleton */}
                                {Array.from({ length: 4 }, (_, i) => i).map((index) => (
                                    <div key={index} className="w-full px-3 py-2 rounded-md flex items-center gap-2">
                                        <Skeleton className="h-5 w-5 rounded" />
                                        <Skeleton className="h-4 flex-1" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Skeleton */}
                    <div className="lg:col-span-3">
                        <div className="space-y-6">
                            {/* Page title skeleton */}
                            <div>
                                <Skeleton className="h-8 w-40" />
                            </div>

                            {/* Profile card skeleton */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-6">
                                        <Skeleton className="h-6 w-24" />
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* Profile fields skeleton */}
                                        {Array.from({ length: 3 }, (_, i) => i).map((index) => (
                                            <div key={index}>
                                                <div className="mb-2">
                                                    <Skeleton className="h-4 w-20" />
                                                </div>
                                                <div>
                                                    <Skeleton className="h-4 w-32" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Password card skeleton */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-6">
                                        <Skeleton className="h-6 w-20" />
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <div>
                                            <div className="mb-2">
                                                <Skeleton className="h-4 w-16" />
                                            </div>
                                            <div>
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AccountSkeleton;
