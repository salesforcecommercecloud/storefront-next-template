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
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import DynamicImageProvider from '@/providers/dynamic-image';
import { ProductTile, ProductTileProvider } from '@/components/product-tile';
import { ProductTileSkeleton } from '@/components/category-skeleton';

type ProductSearchHit = ShopperSearch.schemas['ProductSearchHit'];

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
    handleProductClick,
}: {
    nonCritical: Promise<ProductSearchHit[]>;
    criticalSize: number;
    handleProductClick?: (product: ProductSearchHit) => void;
}) {
    const products = use(nonCritical);
    return (
        <>
            {products.map((product) => (
                <ProductTile key={product.productId} product={product} handleProductClick={handleProductClick} />
            ))}
            <NoProductsMessage criticalSize={criticalSize} nonCriticalSize={products.length} />
        </>
    );
}

/**
 * ProductGrid wraps all tiles in a shared context provider to reduce hydration overhead. Instead of each tile
 * initializing its own hooks (navigate, config, translation, currency), the provider initializes them once and shares
 * them via context.
 *
 * The grid accepts both synchronous (critical) and asynchronous (non-critical) data as input. Depending on the
 * positioning of the grid in the DOM, this allows the consumer to influence metrics such as LCP. The images associated
 * with product items that have been marked as critical are also loaded with high priority and eagerly.
 */
export default function ProductGrid({
    critical,
    nonCritical,
    nonCriticalCount = 0,
    handleProductClick,
}: {
    critical?: ProductSearchHit[];
    nonCritical?: Promise<ProductSearchHit[]>;
    nonCriticalCount?: number;
    handleProductClick?: (product: ProductSearchHit) => void;
}): ReactElement {
    const criticalData = critical ?? [];
    const l = criticalData.length;

    // Initialize the `<DynamicImageProvider/>` behavior for the scope of this grid.
    // Out-of-the-box we make sure that the product images of all products considered critical (displayed inside a
    // `<DynamicImage/>` component) should be loaded eagerly with high priority.
    const hasSource = useCallback(() => true, []);

    return (
        <ProductTileProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
                {l > 0 && (
                    <DynamicImageProvider value={{ hasSource }}>
                        {criticalData.map((product) => (
                            <ProductTile
                                key={product.productId}
                                product={product}
                                handleProductClick={handleProductClick}
                            />
                        ))}
                    </DynamicImageProvider>
                )}
                {nonCritical ? (
                    <Suspense
                        fallback={Array.from({ length: nonCriticalCount }, (_, i) => (
                            <ProductTileSkeleton key={i} />
                        ))}>
                        <NonCriticalContent
                            nonCritical={nonCritical}
                            criticalSize={l}
                            handleProductClick={handleProductClick}
                        />
                    </Suspense>
                ) : (
                    <NoProductsMessage criticalSize={l} nonCriticalSize={0} />
                )}
            </div>
        </ProductTileProvider>
    );
}
