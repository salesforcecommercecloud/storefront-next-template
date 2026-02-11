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
import { type ReactElement, lazy, Suspense, useCallback, useMemo } from 'react';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import DynamicImageProvider from '@/providers/dynamic-image';
import { ProductTile, ProductTileProvider } from '@/components/product-tile';
import { ProductTileSkeleton } from '@/components/category-skeleton';

interface ProductGridProps {
    products: ShopperSearch.schemas['ProductSearchHit'][];
    handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
    critical?: number;
}

// Lazy-loaded component for below-the-fold products. By wrapping in React.lazy, React
// will defer hydration/rendering of these tiles, allowing the browser to prioritize
// above-the-fold content (images, layout) first.
const NonCriticalGrid = lazy(() =>
    Promise.resolve({
        default: ({
            products,
            handleProductClick,
        }: {
            products: ShopperSearch.schemas['ProductSearchHit'][];
            handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
        }) => (
            <>
                {products.map((product) => (
                    <ProductTile key={product.productId} product={product} handleProductClick={handleProductClick} />
                ))}
            </>
        ),
    })
);

/**
 * ProductGrid wraps all tiles in a shared context provider to reduce hydration overhead.
 * Instead of each tile initializing its own hooks (navigate, config, translation, currency),
 * the provider initializes them once and shares them via context.
 */
export default function ProductGrid({ products, critical, handleProductClick }: ProductGridProps): ReactElement {
    // Initialize the `<DynamicImageProvider/>` behavior for the scope of this grid.
    // Out-of-the-box we make sure that the first product image that's downstream to be displayed inside a
    // `<DynamicImage/>` component, should be loaded with priority.
    const addSource = useCallback((src: string, urls: Set<string>) => {
        if (!urls.size) {
            urls.add(src);
            return true;
        }
        return false;
    }, []);
    const hasSource = useCallback((src: string, urls: Set<string>) => urls.has(src), []);

    const { criticalData, nonCriticalData } = useMemo(() => {
        if (!critical || critical >= products.length) {
            return { criticalData: products, nonCriticalData: [] };
        }
        return {
            criticalData: products.slice(0, critical),
            nonCriticalData: products.slice(critical),
        };
    }, [products, critical]);

    return (
        <ProductTileProvider>
            <DynamicImageProvider value={{ addSource, hasSource }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
                    {criticalData.map((product) => (
                        <ProductTile
                            key={product.productId}
                            product={product}
                            handleProductClick={handleProductClick}
                        />
                    ))}
                    {nonCriticalData.length > 0 && (
                        <Suspense
                            fallback={nonCriticalData.map((product) => (
                                <ProductTileSkeleton key={product.productId} />
                            ))}>
                            <NonCriticalGrid products={nonCriticalData} handleProductClick={handleProductClick} />
                        </Suspense>
                    )}
                </div>

                {/* Show a message when no products are found */}
                {products.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-lg text-muted-foreground">No products found.</p>
                    </div>
                )}
            </DynamicImageProvider>
        </ProductTileProvider>
    );
}
