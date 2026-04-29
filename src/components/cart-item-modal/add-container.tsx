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
import { type ReactElement, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useProductFetcher } from '@/hooks/product/use-product-fetcher';
import { useModalStateReset } from '@/hooks/use-modal-state-reset';
import { useProductImages } from '@/hooks/product/use-product-images';
import { isProductBundle, isProductSet } from '@/lib/product-utils';
import { CartItemModalView } from './view';
import type { CartItemModalProps } from './types';

interface CartItemModalAddContainerProps extends CartItemModalProps {
    productId: string;
}

const areVariationValuesEqual = (a: Record<string, string>, b: Record<string, string>): boolean => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => a[key] === b[key]);
};

type Product = ShopperProducts.schemas['Product'];

interface CartItemModalState {
    currentProduct: Product | null;
    variationValues: Record<string, string>;
    hasUserChangedVariant: boolean;
    variantInventoryCache: Record<string, Product>;
}

type CartItemModalAction =
    | { type: 'MODAL_RESET' }
    | { type: 'BASE_PRODUCT_RECEIVED'; product: Product }
    | { type: 'VARIATIONS_SEEDED'; values: Record<string, string> }
    | { type: 'VARIATION_CHANGED_BY_USER'; attributeId: string; value: string }
    | { type: 'VARIANT_INVENTORY_CACHED'; product: Product };

const initialCartItemModalState: CartItemModalState = {
    currentProduct: null,
    variationValues: {},
    hasUserChangedVariant: false,
    variantInventoryCache: {},
};

function cartItemModalReducer(state: CartItemModalState, action: CartItemModalAction): CartItemModalState {
    switch (action.type) {
        case 'MODAL_RESET':
            return initialCartItemModalState;
        case 'BASE_PRODUCT_RECEIVED':
            if (state.currentProduct?.id === action.product.id) {
                return state;
            }
            return { ...state, currentProduct: action.product };
        case 'VARIATIONS_SEEDED': {
            // Keep user-controlled selection stable once initialized.
            if (Object.keys(state.variationValues).length > 0 && state.hasUserChangedVariant) {
                return state;
            }
            if (areVariationValuesEqual(state.variationValues, action.values)) {
                return state;
            }
            return { ...state, variationValues: action.values };
        }
        case 'VARIATION_CHANGED_BY_USER': {
            if (state.variationValues[action.attributeId] === action.value && state.hasUserChangedVariant) {
                return state;
            }
            return {
                ...state,
                variationValues: { ...state.variationValues, [action.attributeId]: action.value },
                hasUserChangedVariant: true,
            };
        }
        case 'VARIANT_INVENTORY_CACHED': {
            const cached = state.variantInventoryCache[action.product.id];
            if (
                cached?.inventory?.ats === action.product.inventory?.ats &&
                cached?.inventory?.orderable === action.product.inventory?.orderable &&
                cached?.inventory?.backorderable === action.product.inventory?.backorderable &&
                cached?.inventory?.preorderable === action.product.inventory?.preorderable
            ) {
                return state;
            }
            return {
                ...state,
                variantInventoryCache: { ...state.variantInventoryCache, [action.product.id]: action.product },
            };
        }
        default:
            return state;
    }
}

export function CartItemModalAddContainer({
    productId,
    onOpenChange,
    initialQuantity = 1,
    initialVariantSelections,
    onBuyNow,
    open = false,
}: CartItemModalAddContainerProps): ReactElement {
    /**
     * Reducer action map:
     *
     * State shape:
     * {
     *   currentProduct: Product | null,
     *   variationValues: Record<string, string>,
     *   hasUserChangedVariant: boolean,
     *   variantInventoryCache: Record<string, Product>
     * }
     *
     * Actions:
     * - MODAL_RESET
     *   payload: none
     *   resets modal state to initial values
     *
     * - BASE_PRODUCT_RECEIVED
     *   payload: { product: Product }
     *   hydrates base product when initial fetch resolves
     *
     * - VARIATIONS_SEEDED
     *   payload: { values: Record<string, string> }
     *   seeds variation values from API/defaults unless user already changed them
     *
     * - VARIATION_CHANGED_BY_USER
     *   payload: { attributeId: string, value: string }
     *   updates variation selection and marks user-changed flag
     *
     * - VARIANT_INVENTORY_CACHED
     *   payload: { product: Product }
     *   upserts variant inventory/pricing fetch results with no-op guard
     */
    const [state, dispatch] = useReducer(cartItemModalReducer, initialCartItemModalState);
    const { currentProduct, variationValues, hasUserChangedVariant, variantInventoryCache } = state;
    const initialHydratedProductIdRef = useRef<string | undefined>(undefined);
    const initialVariantSelectionsRef = useRef(initialVariantSelections);
    const inFlightVariantIdRef = useRef<string | undefined>(undefined);

    useModalStateReset({
        open,
        onReset: useCallback(() => {
            dispatch({ type: 'MODAL_RESET' });
            initialHydratedProductIdRef.current = undefined;
            inFlightVariantIdRef.current = undefined;
        }, []),
        resetOn: 'both',
    });

    const matchingVariant = useMemo(() => {
        if (!currentProduct) return undefined;
        const potentialVariants =
            currentProduct.variants?.filter((variant) =>
                Object.keys(variationValues).every((key) => variant.variationValues?.[key] === variationValues[key])
            ) ?? [];
        // Resolve variant only when the current selection maps to exactly one variant.
        return potentialVariants.length === 1 ? potentialVariants[0] : undefined;
    }, [currentProduct, variationValues]);

    const initialProductFetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: productId },
            query: {
                allImages: true,
                expand: [
                    'variations',
                    'availability',
                    'images',
                    'prices',
                    'promotions',
                    'set_products',
                    'bundled_products',
                ],
            },
        },
    });

    useProductFetcher({
        targetProductId: productId,
        fetcher: initialProductFetcher,
        currentProductId: currentProduct?.id,
        onDataReceived: useCallback((p: ShopperProducts.schemas['Product']) => {
            if (initialHydratedProductIdRef.current === p.id) {
                return;
            }
            initialHydratedProductIdRef.current = p.id;
            dispatch({ type: 'BASE_PRODUCT_RECEIVED', product: p });

            const seededValues = { ...(p.variationValues ?? {}), ...(initialVariantSelectionsRef.current ?? {}) };
            dispatch({ type: 'VARIATIONS_SEEDED', values: seededValues });
        }, []),
        validateProductId: productId,
        enabled: open,
    });

    // Re-fetch the currently selected variant in add mode so inventory/availability
    // reflects the exact variant before enabling cart actions.
    const variantFetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: matchingVariant?.productId || '' },
            query: {
                allImages: true,
                expand: [
                    'variations',
                    'availability',
                    'images',
                    'prices',
                    'promotions',
                    'set_products',
                    'bundled_products',
                ],
            },
        },
    });

    const selectedVariantId = matchingVariant?.productId;
    const cachedVariantProduct = selectedVariantId ? variantInventoryCache[selectedVariantId] : undefined;
    const selectedVariantIdRef = useRef<string | undefined>(selectedVariantId);
    const hasSelectedVariantOnInitialLoad = Boolean(selectedVariantId) && !hasUserChangedVariant;
    const shouldFetchSelectedVariantInventory =
        open &&
        Boolean(selectedVariantId) &&
        !cachedVariantProduct &&
        (hasUserChangedVariant || hasSelectedVariantOnInitialLoad);

    selectedVariantIdRef.current = selectedVariantId;
    initialVariantSelectionsRef.current = initialVariantSelections;

    useEffect(() => {
        const shouldMarkInFlight = shouldFetchSelectedVariantInventory && variantFetcher.state === 'idle';

        if (shouldMarkInFlight) {
            inFlightVariantIdRef.current = selectedVariantId;
        }
    }, [shouldFetchSelectedVariantInventory, selectedVariantId, variantFetcher.state]);

    useProductFetcher({
        targetProductId: selectedVariantId,
        fetcher: variantFetcher,
        // Skip refetch when we already cached this variant's inventory in this modal session.
        currentProductId: cachedVariantProduct?.id,
        onDataReceived: useCallback((p: ShopperProducts.schemas['Product']) => {
            const activeVariantId = selectedVariantIdRef.current;
            if (!activeVariantId || p.id !== activeVariantId) {
                return;
            }
            dispatch({ type: 'VARIANT_INVENTORY_CACHED', product: p });
            if (inFlightVariantIdRef.current === p.id) {
                inFlightVariantIdRef.current = undefined;
            }
        }, []),
        validateProductId: selectedVariantId,
        enabled:
            shouldFetchSelectedVariantInventory &&
            !(variantFetcher.state === 'loading' && inFlightVariantIdRef.current === selectedVariantId),
    });

    const effectiveMatchingVariant = useMemo(() => {
        if (!matchingVariant) return undefined;
        if (!cachedVariantProduct || cachedVariantProduct.id !== matchingVariant.productId) {
            return matchingVariant;
        }

        return {
            ...matchingVariant,
            // Use fetched variant pricing/promo fields for quick-add price display.
            price: cachedVariantProduct.price,
            priceMax: cachedVariantProduct.priceMax,
            priceMin: cachedVariantProduct.priceMin,
            tieredPrices: cachedVariantProduct.tieredPrices,
            productPromotions: cachedVariantProduct.productPromotions,
            inventory: cachedVariantProduct.inventory,
            inventories: cachedVariantProduct.inventories,
            orderable: cachedVariantProduct.inventory?.orderable ?? matchingVariant.orderable,
        };
    }, [matchingVariant, cachedVariantProduct]);

    const isVariantInventoryLoading = shouldFetchSelectedVariantInventory;

    const handleAttributeChange = useCallback((attributeId: string, value: string) => {
        dispatch({ type: 'VARIATION_CHANGED_BY_USER', attributeId, value });
    }, []);

    const safeProduct = currentProduct ?? ({} as ShopperProducts.schemas['Product']);
    const { galleryImages } = useProductImages({ product: safeProduct, selectedAttributes: variationValues });
    const { t } = useTranslation('editItem');

    const isProductASet = currentProduct ? isProductSet(currentProduct) : false;
    const isProductABundle = currentProduct ? isProductBundle(currentProduct) : false;

    const isLoading = !currentProduct && initialProductFetcher.state !== 'idle';
    const hasError =
        !currentProduct &&
        initialProductFetcher.state === 'idle' &&
        initialProductFetcher.data != null &&
        !initialProductFetcher.success;

    const handleCloseModal = useCallback(() => {
        onOpenChange?.(false);
    }, [onOpenChange]);
    const handleRetry = useCallback(() => {
        void initialProductFetcher.load();
    }, [initialProductFetcher]);
    const viewDetailsHref = useMemo(() => {
        const baseProductId = currentProduct?.id ?? productId;
        const params = new URLSearchParams();
        Object.entries(variationValues).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });
        if (selectedVariantId) {
            params.set('pid', selectedVariantId);
        }
        const search = params.toString();
        return search ? `/product/${baseProductId}?${search}` : `/product/${baseProductId}`;
    }, [currentProduct?.id, productId, variationValues, selectedVariantId]);

    return (
        <CartItemModalView
            open={open}
            onOpenChange={onOpenChange}
            dialogTitle={t('quickAddTitle')}
            isLoading={isLoading}
            hasError={hasError}
            onRetry={handleRetry}
            retryLabel={t('retry')}
            loadingLabel={t('loadingProduct')}
            loadErrorLabel={t('loadError')}
            mode="add"
            currentProduct={currentProduct}
            initialQuantity={initialQuantity}
            matchingVariant={effectiveMatchingVariant}
            isVariantInventoryLoading={isVariantInventoryLoading}
            variationValues={variationValues}
            onAttributeChange={handleAttributeChange}
            galleryImages={galleryImages}
            isProductASet={isProductASet}
            isProductABundle={isProductABundle}
            onBeforeCartAction={handleCloseModal}
            onBuyNow={onBuyNow}
            viewDetailsHref={viewDetailsHref}
        />
    );
}
