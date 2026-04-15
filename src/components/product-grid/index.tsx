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
import { type ReactElement, Suspense, use, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeferredRender } from '@/hooks/use-deferred-render';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { useShowPickupAvailable } from './use-pickup-filter';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import DynamicImageProvider from '@/providers/dynamic-image';
import { ProductTile, ProductTileProvider } from '@/components/product-tile';
import { ProductTileSkeleton } from '@/components/category-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

type ProductSearchHit = ShopperSearch.schemas['ProductSearchHit'];

// Responsive size of the product images in the product grid when the refinement panel is visible.
// Values are based on the grid column configuration and refinement panel width
// (w-64 + gap-8 --> 256px + 32px = 288px).
const responsiveImageWidthsWithRefinements = [
    '40vw', // base: 2 grid columns, no refinement panel, ~(100vw - col padding) / 2 ≈ 40% of vw
    '25vw', // sm:   3 grid columns, no refinement panel, ~(100vw - col padding) / 3 ≈ 25% of vw
    '18vw', // md:   4 grid columns, no refinement panel, ~(100vw - col padding) / 4 ≈ 18% of vw
    '14vw', // lg:   4 grid columns, refinement panel, ~(100vw − 288px − col padding) / 4 ≈ 14% of vw
    '16vw', // xl:   4 grid columns, refinement panel, ~(100vw − 288px − col padding) / 4 ≈ 16% of vw
    '16vw', // 2xl:  4 grid columns, refinement panel, ~(100vw − 288px − col padding) / 4 ≈ 16% of vw
];

// Responsive size of product images when refinements panel is collapsed.
const responsiveImageWidthsWithoutRefinements = [
    '40vw', // base: 2 grid columns, no refinement panel, ~(100vw - col padding) / 2 ≈ 40% of vw
    '25vw', // sm:   3 grid columns, no refinement panel, ~(100vw - col padding) / 3 ≈ 25% of vw
    '18vw', // md:   4 grid columns, no refinement panel, ~(100vw - col padding) / 4 ≈ 18% of vw
    '18vw', // lg:   4 grid columns, no refinement panel, ~(100vw - col padding) / 4 ≈ 18% of vw
    '20vw', // xl:   4 grid columns, no refinement panel, ~(100vw - col padding) / 4 ≈ 20% of vw
    '20vw', // 2xl:  4 grid columns, no refinement panel, ~(100vw - col padding) / 4 ≈ 20% of vw
];

function NoProductsMessage({ criticalSize, nonCriticalSize }: { criticalSize: number; nonCriticalSize: number }) {
    const { t } = useTranslation('common');

    if (criticalSize > 0 || nonCriticalSize > 0) {
        return null;
    }
    return (
        <div className="col-span-full text-center py-12">
            <p className="text-lg text-muted-foreground">{t('noProductsFound')}</p>
        </div>
    );
}

function NonCriticalContent({
    nonCritical,
    criticalSize,
    responsiveImageWidths,
    handleProductClick,
    topCategoryName,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showPickupAvailable,
}: {
    nonCritical: Promise<ProductSearchHit[]>;
    criticalSize: number;
    responsiveImageWidths: string[];
    handleProductClick?: (product: ProductSearchHit) => void;
    topCategoryName?: string;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showPickupAvailable?: boolean;
}) {
    const products = use(nonCritical);
    return (
        <DynamicImageProvider value={{ widths: responsiveImageWidths }}>
            {products.map((product) => (
                <ProductTile
                    key={product.productId}
                    product={product}
                    handleProductClick={handleProductClick}
                    showNavigationArrows
                    topCategoryName={topCategoryName}
                    // @sfdc-extension-line SFDC_EXT_BOPIS
                    showPickupAvailable={showPickupAvailable}
                />
            ))}
            <NoProductsMessage criticalSize={criticalSize} nonCriticalSize={products.length} />
        </DynamicImageProvider>
    );
}

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
            {Array.from({ length: count }, (_, index) => (
                <div key={`grid-skeleton-${index}`} className="space-y-3">
                    <Skeleton className="aspect-square w-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * ProductGrid wraps all tiles in a shared context provider to reduce hydration overhead. Instead of each tile
 * initializing its own hooks (navigate, config, translation, currency), the provider initializes them once and shares
 * them via context.
 *
 * Performance optimizations: The grid accepts both synchronous (critical) and asynchronous (non-critical) data as
 * input. Depending on the positioning of the grid in the DOM, this allows the consumer to influence metrics such as
 * LCP. The images associated with product items that have been marked as critical are also loaded with high priority
 * and eagerly. Non-critical tiles are deferred until an idle frame is available, reducing initial render blocking time
 * (TBT) and improving LCP by prioritizing the first batch of visible tiles.
 */
export default function ProductGrid({
    critical,
    nonCritical,
    nonCriticalCount = 0,
    hasRefinementsPanel = true,
    handleProductClick,
    topCategoryName,
    isLoading = false,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showPickupAvailable: showPickupAvailableProp,
}: {
    critical?: ProductSearchHit[];
    nonCritical?: Promise<ProductSearchHit[]>;
    nonCriticalCount?: number;
    hasRefinementsPanel?: boolean;
    handleProductClick?: (product: ProductSearchHit) => void;
    topCategoryName?: string;
    isLoading?: boolean;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showPickupAvailable?: boolean;
}): ReactElement {
    const criticalData = critical ?? [];
    const l = criticalData.length;
    const responsiveImageWidths = hasRefinementsPanel
        ? responsiveImageWidthsWithRefinements
        : responsiveImageWidthsWithoutRefinements;

    // Initialize the `<DynamicImageProvider/>` behavior for the scope of this grid.
    // Out-of-the-box we make sure that the product images of all products considered critical (displayed inside a
    // `<DynamicImage/>` component) should be loaded eagerly with high priority.
    const hasSource = useCallback(() => true, []);

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const pickupFromUrl = useShowPickupAvailable();
    const showPickupAvailable = showPickupAvailableProp ?? pickupFromUrl;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
    const loadingSkeletonCount = Math.max(criticalData.length + nonCriticalCount, 4);

    // Defer rendering of non-critical tiles until an idle frame is available.
    // This improves initial render performance by prioritizing the critical (above-the-fold) tiles.
    const shouldRenderNonCritical = useDeferredRender(nonCriticalCount > 0);

    if (isLoading) {
        return (
            <ProductTileProvider>
                <div data-testid="product-grid-loading-state" aria-busy>
                    <ProductGridSkeleton count={loadingSkeletonCount} />
                </div>
            </ProductTileProvider>
        );
    }

    return (
        <ProductTileProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
                {l > 0 && (
                    <DynamicImageProvider value={{ hasSource, widths: responsiveImageWidths }}>
                        {criticalData.map((product) => (
                            <ProductTile
                                key={product.productId}
                                product={product}
                                handleProductClick={handleProductClick}
                                showNavigationArrows
                                topCategoryName={topCategoryName}
                                // @sfdc-extension-line SFDC_EXT_BOPIS
                                showPickupAvailable={showPickupAvailable}
                            />
                        ))}
                    </DynamicImageProvider>
                )}
                {/*
                    Three-phase rendering strategy for non-critical content:

                    Phase 1 (Pre-Idle): nonCritical exists BUT shouldRenderNonCritical is false
                    - We have a promise with non-critical products, but idle callback hasn't triggered yet
                    - Show simple skeletons without mounting the Suspense boundary (until requestIdleCallback fires)
                    - Why: Mounting Suspense immediately would force React to process it during initial render,
                      blocking the main thread (causing TBT, delaying LCP). By deferring the Suspense boundary
                      itself, we keep the initial render minimal (just critical tiles + lightweight skeletons).

                    Phase 2 (Post-Idle, Pending): shouldRenderNonCritical is true, promise is pending
                    - Idle callback has triggered, Suspense boundary is now mounted
                    - Show skeletons via Suspense fallback while the promise resolves

                    Phase 3 (Resolved): shouldRenderNonCritical is true, promise resolved
                    - All non-critical tiles are rendered
                    - Skeletons are replaced with actual product tiles
                */}
                {nonCritical && shouldRenderNonCritical ? (
                    // Phase 2 & 3: Post-idle — mount Suspense boundary and render tiles
                    <Suspense
                        fallback={Array.from({ length: nonCriticalCount }, (_, i) => (
                            <ProductTileSkeleton key={i} />
                        ))}>
                        <NonCriticalContent
                            nonCritical={nonCritical}
                            criticalSize={l}
                            responsiveImageWidths={responsiveImageWidths}
                            handleProductClick={handleProductClick}
                            topCategoryName={topCategoryName}
                            // @sfdc-extension-line SFDC_EXT_BOPIS
                            showPickupAvailable={showPickupAvailable}
                        />
                    </Suspense>
                ) : nonCritical ? (
                    // Phase 1: Pre-idle — show lightweight skeletons before Suspense boundary mounts
                    // This prevents React from processing the Suspense boundary during initial render,
                    // reducing Total Blocking Time (TBT) and improving LCP for critical tiles.
                    Array.from({ length: nonCriticalCount }, (_, i) => <ProductTileSkeleton key={i} />)
                ) : (
                    // No non-critical promise exists — show empty state if no critical tiles either
                    <NoProductsMessage criticalSize={l} nonCriticalSize={0} />
                )}
            </div>
        </ProductTileProvider>
    );
}
