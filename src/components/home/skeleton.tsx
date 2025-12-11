import HeroSkeleton from './hero';

/**
 * Home skeleton component that displays loading placeholders for the home page.
 * This component provides visual feedback while the home page data is loading.
 *
 * @returns JSX element representing the home page skeleton layout
 */
export default function HomeSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Hero Section Skeleton */}
            <HeroSkeleton />

            {/* Featured Products Section Skeleton */}
            <div className="py-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <div className="h-8 bg-muted w-48 rounded" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }, (_, i) => i).map((index) => (
                            <div key={`featured-product-${index}`} className="space-y-4">
                                <div className="bg-muted h-64 w-full rounded" />
                                <div className="space-y-2">
                                    <div className="h-4 bg-muted w-3/4 rounded" />
                                    <div className="h-4 bg-muted w-1/2 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Section Skeleton */}
            <div className="py-16 bg-muted/30">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <div className="h-8 bg-muted w-64 mx-auto rounded mb-4" />
                        <div className="h-4 bg-muted w-96 mx-auto rounded" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {Array.from({ length: 3 }, (_, i) => i).map((index) => (
                            <div key={`feature-${index}`} className="text-center space-y-4">
                                <div className="h-6 bg-muted w-32 mx-auto rounded" />
                                <div className="h-4 bg-muted w-full rounded" />
                                <div className="h-4 bg-muted w-3/4 mx-auto rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Help Section Skeleton */}
            <div className="py-16">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <div className="h-8 bg-muted w-48 mx-auto rounded mb-4" />
                        <div className="h-4 bg-muted w-80 mx-auto rounded" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {Array.from({ length: 4 }, (_, i) => i).map((index) => (
                            <div key={`help-item-${index}`} className="text-center space-y-4">
                                <div className="bg-muted h-12 w-12 mx-auto rounded" />
                                <div className="h-5 bg-muted w-24 mx-auto rounded" />
                                <div className="h-4 bg-muted w-full rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
