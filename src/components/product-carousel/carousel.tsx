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
import { Link } from '@/components/link';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ProductTile, ProductTileProvider } from '@/components/product-tile';
import DynamicImageProvider from '@/providers/dynamic-image';
import withSuspense from '@/components/with-suspense';
import ProductCarouselSkeleton from './skeleton';
import { cn } from '@/lib/utils';
import type { ComponentType } from '@/components/region';
import { Component } from '@/components/region/component';

export interface ProductCarouselProps {
    /** Array of product search hits to display in the carousel */
    products: ShopperSearch.schemas['ProductSearchHit'][];
    /** Optional title to display above the carousel */
    title?: string;
    /** Optional subtitle displayed below the title */
    subtitle?: string;
    /** Optional "Shop all" link URL displayed next to the title */
    shopAllUrl?: string;
    /** Optional label for the "Shop all" link. Defaults to "Shop all" */
    shopAllText?: string;
    /** Optional className for the title heading. Defaults to text-2xl md:text-3xl font-normal text-foreground tracking-tight */
    titleClassName?: string;
    /** Optional className to apply to the carousel wrapper */
    className?: string;
    /** Optional Page Designer component for container rendering mode */
    component?: ComponentType;
}

// Responsive size of the product images in the product carousel
const responsiveImageWidths = [
    '40vw', // base: 2 columns, ~(100vw - padding) / 2 ≈ 40% of vw
    '23vw', // sm:   3 columns, ~(100vw - padding) / 3 ≈ 23% of vw
    '18vw', // md:   4 columns, ~(100vw - padding) / 4 ≈ 18% of vw
    '20vw', // lg:   4 columns, ~(100vw - padding) / 4 ≈ 20% of vw
    '21vw', // xl:   4 columns, ~(100vw − padding) / 4 ≈ 21% of vw
    '24vw', // 2xl:  4 columns, ~(100vw − padding) / 4 ≈ 24% of vw
];

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
const defaultTitleClassName = 'text-2xl md:text-3xl font-normal text-foreground tracking-tight';

export default function ProductCarousel({
    products,
    title,
    subtitle,
    shopAllUrl,
    shopAllText,
    titleClassName,
    className,
    component,
}: ProductCarouselProps): ReactNode {
    const { t } = useTranslation('common');
    const productsRegion = component?.regions?.find((region) => region.id === 'products');
    const regionComponents = productsRegion?.components ?? [];
    const resolvedTitle = title || ''; // put empty string as the title since dont currently have i18n for these default values.

    const titleSection = (
        <div className="flex items-center justify-between mb-6">
            {subtitle ? (
                <div>
                    <h2 className={titleClassName ?? defaultTitleClassName}>{resolvedTitle}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                </div>
            ) : (
                <h2 className={titleClassName ?? defaultTitleClassName}>{resolvedTitle}</h2>
            )}
            {shopAllText && (
                <div>
                    {shopAllUrl ? (
                        <Link
                            to={shopAllUrl}
                            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0 ml-4">
                            {shopAllText}
                        </Link>
                    ) : (
                        <span className="text-sm font-medium text-primary shrink-0 ml-4">{shopAllText}</span>
                    )}
                </div>
            )}
        </div>
    );

    // Safety check for undefined or null products.
    // In Page Designer container mode, region components are the source of truth.
    if ((!products || products.length === 0) && regionComponents.length === 0) {
        return (
            <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12', className)}>
                {titleSection}
                <div role="status" aria-live="polite">
                    {t('selectProduct')}
                </div>
            </div>
        );
    }

    return (
        <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12', className)}>
            {titleSection}

            <Carousel
                className="w-full"
                opts={{
                    align: 'start',
                }}
                aria-label={`${resolvedTitle} carousel`}>
                <CarouselContent className="-ml-4 items-stretch flex-nowrap">
                    {regionComponents.length > 0 && productsRegion ? (
                        regionComponents.map((comp) => {
                            const typedComp = comp as ComponentType;
                            const key = typedComp.contentLinkUuid ?? typedComp.id;
                            return (
                                <CarouselItem
                                    key={key}
                                    className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex pl-4 min-w-0">
                                    <div className="w-full max-w-full min-w-0 flex">
                                        <Component
                                            component={typedComp}
                                            regionId={productsRegion.id}
                                            className="h-full w-full"
                                        />
                                    </div>
                                </CarouselItem>
                            );
                        })
                    ) : (
                        <ProductTileProvider>
                            <DynamicImageProvider value={{ widths: responsiveImageWidths }}>
                                {products.map((product) => (
                                    <CarouselItem
                                        key={product.productId}
                                        className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex pl-4 min-w-0">
                                        <div className="w-full max-w-full min-w-0 flex">
                                            <ProductTile product={product} className="h-full w-full" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </DynamicImageProvider>
                        </ProductTileProvider>
                    )}
                </CarouselContent>
                <CarouselPrevious className="flex left-0 -translate-x-1/2 size-9 rounded-lg shadow-md" />
                <CarouselNext className="flex right-0 translate-x-1/2 size-9 rounded-lg shadow-md" />
            </Carousel>
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
