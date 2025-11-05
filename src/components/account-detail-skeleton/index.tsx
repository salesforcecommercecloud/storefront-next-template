import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton component for the account details page content.
 * Matches the structure of the actual account details with profile and password cards.
 */
export function AccountDetailSkeleton() {
    return (
        <div className="space-y-6">
            {/* Page Header Skeleton */}
            <div>
                <Skeleton className="h-8 w-40" />
            </div>

            {/* My Profile Card Skeleton */}
            <Card className="border-border">
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

            {/* Password Card Skeleton */}
            <Card className="border-border">
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
    );
}

export default AccountDetailSkeleton;
