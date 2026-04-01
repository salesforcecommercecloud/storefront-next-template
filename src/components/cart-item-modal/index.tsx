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

import { type ReactElement, useState, useCallback, useMemo } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useProductImages } from '@/hooks/product/use-product-images';
import ImageGallery from '@/components/image-gallery';
import ProductInfo from '@/components/product-view/product-info';
import ProductCartActions from '@/components/product-cart-actions';
import ProductViewProvider from '@/providers/product-view';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { isProductBundle, isProductSet } from '@/lib/product-utils';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';
import ChildProducts from '@/components/product-view/child-products';
import { useProductFetcher } from '@/hooks/product/use-product-fetcher';
import { useModalStateReset } from '@/hooks/use-modal-state-reset';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { usePickup } from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

export interface CartItemModalProps extends Omit<React.ComponentProps<typeof Dialog>, 'onOpenChange'> {
    /**
     * Full product data. Required for edit mode. In add mode, supply `productId` instead
     * and the modal will fetch the product internally.
     */
    product?: ShopperProducts.schemas['Product'];
    /**
     * Product ID used in add mode when `product` is not provided.
     * The modal fetches the full product internally and shows a spinner while loading.
     */
    productId?: string;
    /** Initial variant selections */
    initialVariantSelections?: Record<string, string>;
    /**
     * Initial quantity. Defaults to 1 in add mode.
     */
    initialQuantity?: number;
    /**
     * Cart item ID for update operations. When provided the modal operates in edit mode
     * (Update button, quantity picker). When omitted the modal operates in add mode
     * (Add to Cart + Buy it Now buttons).
     */
    itemId?: string;
    /**
     * Called when the shopper clicks "Buy it Now" in add mode.
     * Typically navigates to the PDP with the currently selected variant pre-seeded.
     */
    onBuyNow?: () => void;
    /** Callback when dialog open state changes */
    onOpenChange?: (open: boolean) => void;
}

/**
 * CartItemModal displays a dialog for viewing and modifying a product before or after adding to cart.
 *
 * Supports two modes:
 * - **Add mode** (`productId` prop, no `itemId`): fetches the product internally, shows a spinner while
 *   loading, then presents "Add to Cart" and "Buy it Now" side-by-side.
 * - **Edit mode** (`product` + `itemId` props): pre-populated with cart item data, presents an "Update"
 *   button and quantity picker.
 *
 * @param props.product - Full product data (edit mode)
 * @param props.productId - Product ID to fetch (add mode)
 * @param props.itemId - Cart item ID (triggers edit mode when present)
 * @param props.initialQuantity - Starting quantity (defaults to 1)
 * @param props.onBuyNow - Called when "Buy it Now" is clicked in add mode
 * @param props.onOpenChange - Called when the dialog open state changes
 */
export function CartItemModal({
    product: productProp,
    productId: productIdProp,
    onOpenChange,
    initialQuantity = 1,
    initialVariantSelections,
    itemId,
    onBuyNow,
    ...props
}: CartItemModalProps): ReactElement {
    const mode = itemId ? 'edit' : 'add';
    const isAddMode = mode === 'add';

    // In add mode the product starts null and is populated by the fetcher.
    // In edit mode the product is provided directly via props.
    const [currentProduct, setCurrentProduct] = useState<ShopperProducts.schemas['Product'] | null>(
        productProp ?? null
    );
    const [variationValues, setVariationValues] = useState<Record<string, string>>(productProp?.variationValues || {});

    // Reset state each time the modal opens
    useModalStateReset({
        open: props.open ?? false,
        onReset: useCallback(() => {
            setCurrentProduct(productProp ?? null);
            setVariationValues(productProp?.variationValues || {});
        }, [productProp]),
        resetOn: 'open',
    });

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Get pickup context to check if this item is for store pickup.
    // Use productProp.id (the original cart item product) since pickupBasketItems is keyed by productId.
    const pickupContext = usePickup();
    const pickupInfo = pickupContext?.pickupBasketItems?.get(productProp?.id ?? '');
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Matching variant from current variation values (used by the edit-mode variant fetcher)
    const matchingVariant = useMemo(() => {
        if (!currentProduct) return undefined;
        return currentProduct.variants?.find((variant) =>
            Object.keys(variationValues).every((key) => variant.variationValues?.[key] === variationValues[key])
        );
    }, [currentProduct, variationValues]);

    // ── Add-mode fetcher: loads the full product when only a productId is provided ──────────
    const initialProductFetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: isAddMode ? (productIdProp ?? '') : '' },
            query: { allImages: true },
        },
    });

    useProductFetcher({
        targetProductId: isAddMode ? productIdProp : undefined,
        fetcher: initialProductFetcher,
        currentProductId: currentProduct?.id,
        onDataReceived: useCallback(
            (p: ShopperProducts.schemas['Product']) => {
                setCurrentProduct(p);
                // Seed with the product's defaults, then layer the caller's pre-selections
                // (e.g. the color the shopper was hovering on the tile) on top.
                setVariationValues({ ...(p.variationValues ?? {}), ...(initialVariantSelections ?? {}) });
            },
            [initialVariantSelections]
        ),
        enabled: isAddMode && (props.open ?? false),
    });

    // ── Edit-mode fetcher: re-fetches when variant selection changes ────────────────────────
    const variantFetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: !isAddMode ? matchingVariant?.productId || '' : '' },
            query: {
                allImages: true,
                // @sfdc-extension-block-start SFDC_EXT_BOPIS
                ...(pickupInfo?.inventoryId ? { inventoryIds: [pickupInfo.inventoryId] } : {}),
                // @sfdc-extension-block-end SFDC_EXT_BOPIS
            },
        },
    });

    useProductFetcher({
        targetProductId: !isAddMode ? matchingVariant?.productId : undefined,
        fetcher: variantFetcher,
        currentProductId: currentProduct?.id,
        onDataReceived: setCurrentProduct,
        enabled: !isAddMode,
    });

    // Safe fallback so image/variation hooks always receive a product object
    const safeProduct = currentProduct ?? ({} as ShopperProducts.schemas['Product']);
    const selectedAttributes = useSelectedVariations({ product: safeProduct });
    const { galleryImages } = useProductImages({ product: safeProduct, selectedAttributes });

    const handleAttributeChange = useCallback((attributeId: string, value: string) => {
        setVariationValues((prev) => {
            if (prev[attributeId] === value) return prev;
            return { ...prev, [attributeId]: value };
        });
    }, []);

    const { t } = useTranslation('editItem');
    const handleCloseModal = useCallback(() => {
        onOpenChange?.(false);
    }, [onOpenChange]);
    const dialogTitle = mode === 'edit' ? t('title') : t('quickAddTitle');

    const isProductASet = currentProduct ? isProductSet(currentProduct) : false;
    const isProductABundle = currentProduct ? isProductBundle(currentProduct) : false;

    // Loading / error states for add mode
    const isLoading = isAddMode && !currentProduct && initialProductFetcher.state !== 'idle';
    const hasError =
        isAddMode &&
        !currentProduct &&
        initialProductFetcher.state === 'idle' &&
        initialProductFetcher.data != null &&
        !initialProductFetcher.success;

    return (
        <Dialog {...props} onOpenChange={(open) => onOpenChange?.(open)}>
            <DialogContent
                className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
                showCloseButton
                aria-describedby={undefined}>
                <DialogHeader className="sr-only">
                    <DialogTitle>{dialogTitle}</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                        <p className="text-sm text-muted-foreground">{t('loadingProduct')}</p>
                    </div>
                ) : hasError ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-4">
                        <p className="text-destructive text-center">{t('loadError')}</p>
                        <Button onClick={() => void initialProductFetcher.load()} variant="outline">
                            {t('retry')}
                        </Button>
                    </div>
                ) : currentProduct ? (
                    <>
                        <ProductViewProvider
                            product={currentProduct}
                            mode={mode}
                            initialQuantity={initialQuantity}
                            itemId={itemId}
                            currentVariant={matchingVariant}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 pt-2">
                                <div className="order-1">
                                    <ImageGallery
                                        key={currentProduct.id}
                                        images={galleryImages}
                                        eager={!isProductASet && !isProductABundle}
                                        showNavigationArrows
                                        horizontalThumbnails
                                        productName={currentProduct.name}
                                    />
                                </div>
                                <div className="order-2 flex flex-col">
                                    {/* Swatches state is controlled via onAttributeChange + variationValues */}
                                    <ProductInfo
                                        product={currentProduct}
                                        swatchMode="controlled"
                                        onAttributeChange={handleAttributeChange}
                                        variationValues={variationValues}
                                        variantStyle="compact"
                                        showQuantityInEditMode={mode === 'edit'}
                                    />
                                </div>
                            </div>
                            <hr className="border-border border-t-2" />
                            <ProductCartActions
                                product={currentProduct}
                                onBeforeCartAction={handleCloseModal}
                                onBuyNow={mode === 'add' ? onBuyNow : undefined}
                            />
                        </ProductViewProvider>
                        {(isProductASet || isProductABundle) &&
                            (mode === 'edit' && itemId ? (
                                <ChildProducts
                                    parentProduct={currentProduct}
                                    mode="edit"
                                    itemId={itemId}
                                    initialBundleQuantity={initialQuantity}
                                    onBeforeCartAction={handleCloseModal}
                                />
                            ) : (
                                <ChildProducts
                                    parentProduct={currentProduct}
                                    mode="add"
                                    initialBundleQuantity={initialQuantity}
                                    onBeforeCartAction={handleCloseModal}
                                />
                            ))}
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
