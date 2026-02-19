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

import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from '@/components/ui/carousel';
import { ProductTile, ProductTileProvider } from '@/components/product-tile';
import { useConfig } from '@/config';

export interface PaginatedProductCarouselProps {
    /** Initial products to display (may include null placeholders for unfetched products) */
    products: (ShopperSearch.schemas['ProductSearchHit'] | null)[];
    /** Total number of items available (for pagination calculation) */
    total: number;
    /** Current offset (number of items already loaded) */
    offset: number;
    /** Number of items to load per page. Defaults to config.global.paginatedProductCarousel.defaultLimit */
    limit?: number;
    /** Callback to load more products. Should return a promise that resolves to new products (may include null placeholders) */
    onLoadMore: (offset: number, limit: number) => Promise<(ShopperSearch.schemas['ProductSearchHit'] | null)[]>;
    /** Optional title to display above the carousel */
    title?: string;
    /** Custom render function for each product tile. If not provided, uses default ProductTile */
    renderTile?: (product: ShopperSearch.schemas['ProductSearchHit'], index: number) => ReactNode;
    /** Whether to show loading indicator when fetching more items */
    showLoadingIndicator?: boolean;
    /** Custom loading component */
    loadingComponent?: ReactNode;
}

/**
 * PaginatedProductCarousel component displays a horizontal carousel with on-demand data loading.
 *
 * This component renders a responsive carousel that automatically loads more products as the user
 * scrolls near the end. It supports both server-side pagination (for APIs that support it) and
 * client-side pagination with lazy loading (for APIs that don't support pagination).
 *
 * @param props - The component props
 * @param props.products - Initial array of product search hits to display
 * @param props.total - Total number of items available
 * @param props.offset - Current offset (number of items already loaded)
 * @param props.limit - Number of items to load per page
 * @param props.onLoadMore - Callback function to fetch more products
 * @param props.title - Optional title to display above the carousel
 * @param props.renderTile - Custom render function for each product tile
 * @param props.showLoadingIndicator - Whether to show loading indicator (default: true)
 * @param props.loadingComponent - Custom loading component
 *
 * @returns JSX element representing the paginated product carousel
 *
 * @example
 * ```tsx
 * // Basic usage with server-side pagination
 * <PaginatedProductCarousel
 *   products={initialProducts}
 *   total={100}
 *   offset={0}
 *   limit={12}
 *   onLoadMore={async (offset, limit) => {
 *     const response = await fetchProducts({ offset, limit });
 *     return response.hits;
 *   }}
 *   title="Featured Products"
 * />
 *
 * // Usage with custom tile rendering (e.g., for wishlist)
 * <PaginatedProductCarousel
 *   products={products}
 *   total={items.length}
 *   offset={0}
 *   limit={8}
 *   onLoadMore={async (offset, limit) => {
 *     return await fetchMoreProductDetails(items.slice(offset, offset + limit));
 *   }}
 *   renderTile={(product, index) => (
 *     <ProductTile
 *       product={product}
 *       footerAction={<RemoveButton productId={product.productId} />}
 *     />
 *   )}
 * />
 * ```
 */
export default function PaginatedProductCarousel({
    products: initialProducts,
    total,
    offset: initialOffset,
    limit: limitProp,
    onLoadMore,
    title,
    renderTile,
    showLoadingIndicator = true,
    loadingComponent,
}: PaginatedProductCarouselProps): ReactNode {
    const { t } = useTranslation('common');
    const config = useConfig();
    const limit = limitProp ?? config.global.paginatedProductCarousel.defaultLimit;
    const [products, setProducts] = useState<(ShopperSearch.schemas['ProductSearchHit'] | null)[]>(initialProducts);
    // currentOffset tracks where the next load should start from (after currently loaded products)
    const [currentOffset, setCurrentOffset] = useState(initialOffset + initialProducts.length);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialOffset + initialProducts.length < total);
    const [api, setApi] = useState<CarouselApi | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const lastItemRef = useRef<HTMLDivElement | null>(null);
    const loadingRef = useRef<HTMLDivElement | null>(null);

    // Update products when initialProducts change
    useEffect(() => {
        setProducts(initialProducts);
        // currentOffset should be where the NEXT load starts, which is after all currently loaded products
        const nextLoadPosition = initialOffset + initialProducts.length;
        setCurrentOffset(nextLoadPosition);
        setHasMore(nextLoadPosition < total);
    }, [initialProducts, initialOffset, total]);

    // Load more products when approaching the end
    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore) return;

        // currentOffset represents the number of items already loaded
        // So the next batch should start at currentOffset
        const nextOffset = currentOffset;
        if (nextOffset >= total) {
            setHasMore(false);
            return;
        }

        setIsLoading(true);
        try {
            const newProducts = await onLoadMore(nextOffset, limit);
            if (newProducts.length > 0) {
                setProducts((prev) => [...prev, ...newProducts]);
                // Update offset to reflect the new total number of items loaded
                setCurrentOffset(nextOffset + newProducts.length);
                setHasMore(nextOffset + newProducts.length < total);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading more products:', error);
            // Don't set hasMore to false on error, allow retry
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, currentOffset, total, limit, onLoadMore]);

    // Set up Intersection Observer and carousel scroll detection
    useEffect(() => {
        if (!hasMore || isLoading || !api) return;

        // Clean up previous observer
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        // Get the carousel's scroll container
        const carouselContainer = api.containerNode();
        if (!carouselContainer) return;

        // Create new observer with carousel container as root
        observerRef.current = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && hasMore && !isLoading) {
                    void loadMore();
                }
            },
            {
                root: carouselContainer,
                rootMargin: '200px', // Start loading when within 200px of the loading indicator
                threshold: 0.1,
            }
        );

        // Observe the loading indicator
        const target = loadingRef.current;
        if (target) {
            observerRef.current.observe(target);
        }

        // Also listen to carousel scroll events as a fallback
        const handleScroll = () => {
            if (!hasMore || isLoading || !api) return;

            const scrollProgress = api.scrollProgress();
            // Load more when scrolled 80% through the carousel
            if (scrollProgress > 0.8) {
                void loadMore();
            }
        };

        api.on('scroll', handleScroll);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            api.off('scroll', handleScroll);
        };
    }, [hasMore, isLoading, loadMore, api]);

    // Default render function for product tiles
    const defaultRenderTile = useCallback(
        (product: ShopperSearch.schemas['ProductSearchHit'], index: number) => (
            <ProductTile key={product.productId || index} product={product} className="h-auto" />
        ),
        []
    );

    const renderProductTile = renderTile || defaultRenderTile;

    // Safety check for empty products
    if (products.length === 0 && !isLoading) {
        return <div>No products found</div>;
    }

    return (
        <>
            {title && (
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h2>
                </div>
            )}

            <Carousel
                className="w-full"
                setApi={setApi}
                opts={{
                    align: 'start',
                }}>
                <CarouselContent className="items-stretch flex-nowrap">
                    <ProductTileProvider>
                        {products.map((product, index) => (
                            <CarouselItem
                                key={product?.productId || `placeholder-${index}`}
                                className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex justify-center pl-0 min-w-0">
                                <div
                                    ref={index === products.length - 1 ? lastItemRef : null}
                                    className="w-full max-w-full min-w-0">
                                    {product ? (
                                        renderProductTile(product, index)
                                    ) : (
                                        <div className="w-full flex items-center justify-center min-h-[200px]">
                                            <div className="text-muted-foreground text-sm">{t('loadingMore')}</div>
                                        </div>
                                    )}
                                </div>
                            </CarouselItem>
                        ))}
                    </ProductTileProvider>
                    {/* Loading indicator - observed by Intersection Observer */}
                    {hasMore && (
                        <CarouselItem
                            ref={loadingRef}
                            className="basis-1/2 sm:basis-1/3 md:basis-1/4 py-1 flex justify-center pl-0">
                            <div className="w-full flex items-center justify-center min-h-[200px]">
                                {showLoadingIndicator &&
                                    (loadingComponent || (
                                        <div className="text-muted-foreground text-sm">
                                            {isLoading ? t('loadingMore') : ''}
                                        </div>
                                    ))}
                            </div>
                        </CarouselItem>
                    )}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </>
    );
}
