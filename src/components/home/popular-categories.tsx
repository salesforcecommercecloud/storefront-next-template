import { Suspense } from 'react';
import { Await } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { ContentCard } from '@/components/content-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/typography';
import uiStrings from '@/temp-ui-string';
import heroImage from '/images/hero-cube.png';

interface PopularCategoriesProps {
    categoriesPromise: Promise<ShopperProducts.schemas['Category'][]>;
    paddingX?: string;
}

/**
 * Skeleton component for category grid loading state
 */
function CategoryGridSkeleton({ paddingX = 'px-4 sm:px-6 lg:px-8' }: { paddingX?: string }) {
    return (
        <div className="w-full">
            <div className={`text-center mb-8 ${paddingX}`}>
                <Skeleton className="h-10 w-64 mx-auto" />
            </div>
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 ${paddingX}`}>
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Popular Categories component that displays a grid of category cards
 * Shows the first 4 categories in a responsive grid layout
 */
export function PopularCategories({ categoriesPromise, paddingX = 'px-4 sm:px-6 lg:px-8' }: PopularCategoriesProps) {
    return (
        <div className="pt-16">
            <div className={`max-w-screen-2xl mx-auto ${paddingX}`}>
                <Suspense fallback={<CategoryGridSkeleton paddingX={paddingX} />}>
                    <Await resolve={categoriesPromise}>
                        {(categories) => {
                            const displayCategories = categories.slice(0, 4);

                            return (
                                <>
                                    <div className="text-center mb-8">
                                        <Typography
                                            variant="h2"
                                            align="center"
                                            className="text-3xl font-extrabold text-foreground sm:text-4xl">
                                            {uiStrings.home.categoryGrid.title}
                                        </Typography>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:grid-flow-col lg:auto-cols-fr">
                                        {displayCategories.map((category) => {
                                            const { image, c_slotBannerImage } = category;
                                            const imageUrl = image ?? c_slotBannerImage ?? heroImage;
                                            return (
                                                <ContentCard
                                                    key={category.id}
                                                    title={category.name || ''}
                                                    description={category.pageDescription || ''}
                                                    imageUrl={imageUrl}
                                                    imageAlt={category.name}
                                                    buttonText={uiStrings.home.categoryGrid.shopNowButton}
                                                    buttonLink={`/category/${category.id}`}
                                                    showBackground={true}
                                                    showBorder={true}
                                                    loading="eager"
                                                />
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        }}
                    </Await>
                </Suspense>
            </div>
        </div>
    );
}
