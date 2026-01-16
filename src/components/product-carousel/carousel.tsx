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
'use client';

import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ProductTile } from '@/components/product-tile';
import withSuspense from '@/components/with-suspense';
import ProductCarouselSkeleton from './skeleton';
import { cn } from '@/lib/utils';

export interface ProductCarouselProps {
    /** Array of product search hits to display in the carousel */
    products: ShopperSearch.schemas['ProductSearchHit'][];
    /** Optional title to display above the carousel */
    title?: string;
    /** Optional className to apply to the carousel wrapper */
    className?: string;
}

/**
 * ProductCarousel component displays a horizontal carousel of product tiles.
 *
 * This component renders a responsive carousel with navigation controls that displays
 * a collection of products in a scrollable horizontal layout. It's commonly used
 * for featured products, recommendations, or product collections on home and category pages.
 *
 * @param props - The component props
 * @param props.products - Array of product search hits to display in the carousel
 * @param props.title - Optional title to display above the carousel
 * @param props.className - Optional className to apply to the carousel wrapper
 *
 * @returns JSX element representing the product carousel, or a translated "No products found" message
 *
 * @example
 * ```tsx
 * // Basic usage with products array
 * <ProductCarousel
 *   products={searchResult.hits}
 *   title="Featured Products"
 * />
 *
 * // Usage without title
 * <ProductCarousel products={products} />
 *
 * // Usage with custom className
 * <ProductCarousel products={products} className="mt-8" />
 * ```
 *
 * @since 1.0.0
 */
export default function ProductCarousel({ products, title, className }: ProductCarouselProps): ReactNode {
    const { t } = useTranslation('common');

    // Safety check for undefined or null products
    if (!products || products.length === 0) {
        return (
            <div className={cn(className)} role="status" aria-live="polite">
                {t('noProductsFound')}
            </div>
        );
    }

    return (
        <div className={cn(className)}>
            {title && (
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h2>
                </div>
            )}

            {/* Add horizontal padding to prevent arrows from overlapping products */}
            {/* px-14 (3.5rem) provides space for navigation arrows positioned at -left-14/-right-14 */}
            <div className="px-14">
                <Carousel
                    className="w-full"
                    opts={{
                        align: 'start',
                    }}
                    aria-label={title ? `${title} carousel` : t('productCarousel')}>
                    {/* Passing -ml-4 to the CarouselContent to prevent CLS issues during hydration */}
                    <CarouselContent className="-ml-4 items-stretch flex-nowrap">
                        {products.map((product) => (
                            <CarouselItem
                                key={product.productId}
                                className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex pl-0 min-w-0">
                                <div className="w-full max-w-full min-w-0 flex">
                                    <ProductTile product={product} className="h-full w-full" />
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {/* Position arrows outside the product area */}
                    <CarouselPrevious className="-left-14" />
                    <CarouselNext className="-right-14" />
                </Carousel>
            </div>
        </div>
    );
}

/**
 * ProductCarouselWithSuspense component provides a ProductCarousel wrapped with a Suspense boundary.
 *
 * This component automatically shows the ProductCarouselSkeleton as a fallback while the
 * ProductCarousel is loading, providing better user experience during data fetching.
 *
 * When used with a `resolve` prop, the resolved data should be a ProductSearchResult
 * that will be passed as the `products` prop to the ProductCarousel component.
 *
 * @example
 * ```tsx
 * // Basic usage with Suspense boundary
 * <ProductCarouselWithSuspense
 *   products={searchResult.hits}
 *   title="Featured Products"
 * />
 *
 * // Usage with promise resolution as a prop
 * <ProductCarouselWithSuspense
 *   resolve={searchResultPromise}
 *   title="Featured Products"
 * />
 *
 * // Usage in a page with streaming
 * function HomePage() {
 *   return (
 *     <div>
 *       <Hero />
 *       <ProductCarouselWithSuspense resolve={searchResultPromise} title="Shop Products" />
 *     </div>
 *   );
 * }
 * ```
 */
export const ProductCarouselWithSuspense = withSuspense(ProductCarouselWithData, {
    fallback: (props) => <ProductCarouselSkeleton {...props} />,
});

/**
 * Internal component that handles data transformation for ProductCarousel.
 * This component receives the resolved data and transforms it to the expected format.
 * Only supports ProductSearchResult and ProductSearchHit types for simplicity.
 */
export function ProductCarouselWithData({
    data,
    title,
    ...props
}: {
    data?: ShopperSearch.schemas['ProductSearchResult'] | ShopperSearch.schemas['ProductSearchHit'][];
    title?: string;
    [key: string]: unknown;
}) {
    // If data is provided (from resolve), extract products from it
    if (data) {
        // Handle ProductSearchResult (has hits property)
        if ('hits' in data && Array.isArray(data.hits)) {
            return <ProductCarousel products={data.hits} title={title} {...props} />;
        }

        // Handle direct ProductSearchHit array
        if (Array.isArray(data)) {
            return <ProductCarousel products={data} title={title} {...props} />;
        }
    }

    // If no data or unsupported format, render empty state
    return <ProductCarousel products={[]} title={title} {...props} />;
}
