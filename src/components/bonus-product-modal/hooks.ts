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

import { useEffect, useCallback, useRef } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useProductFetcher } from '@/hooks/product/use-product-fetcher';
import { useModalStateReset } from '@/hooks/use-modal-state-reset';

type Product = ShopperProducts.schemas['Product'];

/**
 * Hook to handle state reset when productId changes mid-session
 * This is specific to bonus product modal's ability to switch between different bonus products
 */
export function useProductIdChangeHandler({
    productId,
    currentProduct,
    prevProductIdRef,
    setCurrentProduct,
    setVariationValues,
    setIsLockedToVariant,
    hasUserChangedAttributesRef,
}: {
    productId: string;
    currentProduct: Product | null;
    prevProductIdRef: React.MutableRefObject<string | undefined>;
    setCurrentProduct: (product: Product | null) => void;
    setVariationValues: (values: Record<string, string>) => void;
    setIsLockedToVariant: (locked: boolean) => void;
    hasUserChangedAttributesRef: React.MutableRefObject<boolean>;
}) {
    useEffect(() => {
        // Check if productId changed from a previous value
        if (prevProductIdRef.current && prevProductIdRef.current !== productId) {
            if (currentProduct) {
                // Don't reset if currentProduct is a variant of the requested product
                // (This allows variant selection to work properly)
                const isVariantOfRequestedProduct =
                    currentProduct.id === productId || // Same product
                    currentProduct.variants?.some((v: { productId?: string }) => v.productId === productId); // currentProduct is master of requested variant

                if (!isVariantOfRequestedProduct) {
                    setCurrentProduct(null);
                    setVariationValues({});
                    setIsLockedToVariant(false);
                    hasUserChangedAttributesRef.current = false; // Reset user interaction flag
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);
}

/**
 * Composite hook that manages product data loading and processing for bonus product modal
 *
 * This hook coordinates:
 * 1. Product fetching when modal opens or productId changes
 * 2. Processing and validating fetched product data
 * 3. Handling productId changes (tracked via refs)
 *
 * @param options - Configuration options
 */
export function useBonusProductData({
    open,
    productId,
    fetcher,
    currentProduct,
    setIsLockedToVariant,
    setCurrentProduct,
    setVariationValues,
    hasUserChangedAttributesRef,
}: {
    open: boolean;
    productId: string;
    fetcher: ScapiFetcher<ShopperProducts.schemas['Product']>;
    currentProduct: Product | null;
    setIsLockedToVariant: (locked: boolean) => void;
    setCurrentProduct: (product: Product | null) => void;
    setVariationValues: (values: Record<string, string>) => void;
    hasUserChangedAttributesRef: React.MutableRefObject<boolean>;
}) {
    // Track if we've processed the initial fetcher data to prevent re-processing
    const hasProcessedInitialDataRef = useRef(false);
    const lastFetcherDataRef = useRef<Product | null>(null);
    const prevProductIdRef = useRef<string | undefined>(productId);

    // Handle productId changes mid-session (specific to bonus modal)
    useProductIdChangeHandler({
        productId,
        currentProduct,
        prevProductIdRef,
        setCurrentProduct,
        setVariationValues,
        setIsLockedToVariant,
        hasUserChangedAttributesRef,
    });

    // Track productId changes for fetch triggering
    useEffect(() => {
        const productIdHasChanged = prevProductIdRef.current !== productId;

        if (productIdHasChanged) {
            hasProcessedInitialDataRef.current = false;
            lastFetcherDataRef.current = null;
            prevProductIdRef.current = productId;
        }
    }, [productId]);

    // Handler for when product data is received
    const handleDataReceived = useCallback(
        (loadedProduct: Product) => {
            // Skip if we've already processed this exact data object
            if (lastFetcherDataRef.current === loadedProduct) {
                return;
            }

            // Only update if we haven't processed the initial data yet
            // (prevents overwriting variant selections)
            if (!hasProcessedInitialDataRef.current) {
                // Check if the loaded product is a variant:
                // Use product.type.variant to determine if this is a variant product.
                // When a variant is loaded, we should hide variant selection to lock to that specific variant.
                const isVariant = Boolean(loadedProduct?.type?.variant);

                setIsLockedToVariant(isVariant);
                setCurrentProduct(loadedProduct);
                setVariationValues(loadedProduct.variationValues || {});
                hasProcessedInitialDataRef.current = true;
                lastFetcherDataRef.current = loadedProduct;
            }
        },
        [setIsLockedToVariant, setCurrentProduct, setVariationValues]
    );

    // Use shared product fetcher hook
    useProductFetcher({
        targetProductId: productId,
        fetcher,
        currentProductId: currentProduct?.id,
        onDataReceived: handleDataReceived,
        validateProductId: productId, // Validate loaded product matches what we requested
        enabled: open && !hasProcessedInitialDataRef.current,
    });

    // Reset refs when modal closes
    useModalStateReset({
        open,
        onReset: useCallback(() => {
            if (currentProduct) {
                hasUserChangedAttributesRef.current = false;
                hasProcessedInitialDataRef.current = false;
                lastFetcherDataRef.current = null;
            }
        }, [currentProduct, hasUserChangedAttributesRef]),
        resetOn: 'close',
    });
}
