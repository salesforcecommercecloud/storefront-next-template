/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// React
import { type ReactElement, useState, useEffect, useCallback, useMemo } from 'react';

// Types
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Constants
import uiStrings from '@/temp-ui-string';
import { useProductImages } from '@/hooks/product/use-product-images';
import ImageGallery from '@/components/image-gallery';
import ProductInfo from '@/components/product-view/product-info';
import ProductCartActions from '@/components/product-cart-actions';
import ProductViewProvider from '@/providers/product-view';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { isProductBundle, isProductSet } from '@/lib/product-utils';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';
import ChildProducts from '@/components/product-view/child-products';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { usePickup } from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

export interface CartItemEditModalProps extends Omit<React.ComponentProps<typeof Dialog>, 'onOpenChange'> {
    /** The product being edited */
    product: ShopperProducts.schemas['Product'];
    /** Initial variant selections from cart item */
    initialVariantSelections?: Record<string, string>;
    /** Initial quantity from cart item (required for editing) */
    initialQuantity: number;
    /** Cart item ID for update operations (required for editing) */
    itemId: string;
    /** Callback when dialog open state changes */
    onOpenChange?: (open: boolean) => void;
}

/**
 * CartItemEditModal component displays a dialog for editing cart items
 *
 * This component provides:
 * - Product details display with image gallery
 * - Interactive variant selection (color, size, etc.)
 * - Quantity adjustment
 * - Update button to save changes to cart
 * - Store inventory support: When editing pickup items, fetches variant products
 *   with store inventory data to show accurate stock levels
 *
 * @param props - Component props
 * @param props.product - The product being edited (renamed to initialProduct internally)
 * @param props.initialQuantity - Initial quantity from cart item
 * @param props.onOpenChange - Callback when dialog open state changes
 * @param props.itemId - Id of an Item being displayed in the Modal
 * @returns JSX element with cart item edit modal
 */
export function CartItemEditModal({
    product: initialProduct,
    onOpenChange,
    initialQuantity,
    itemId,
    ...props
}: CartItemEditModalProps): ReactElement {
    // State for current product and current variation attributes
    const [currentProduct, setCurrentProduct] = useState(initialProduct);
    const [variationValues, setVariationValues] = useState<Record<string, string>>(
        initialProduct.variationValues || {}
    );

    // Reset state when modal opens (but not when it closes)
    useEffect(() => {
        if (props.open) {
            setCurrentProduct(initialProduct);
            setVariationValues(initialProduct.variationValues || {});
        }
    }, [initialProduct, props.open]);

    const isProductASet = isProductSet(currentProduct);
    const isProductABundle = isProductBundle(currentProduct);

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Get pickup context to check if this item is for store pickup
    // Use initialProduct.id since pickupBasketItems is keyed by the basket item's productId
    const pickupContext = usePickup();
    const pickupInfo = pickupContext?.pickupBasketItems?.get(initialProduct.id);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Calculate matching variant based on current variation values
    const matchingVariant = useMemo(() => {
        return initialProduct.variants?.find((variant) => {
            return Object.keys(variationValues).every((key) => variant.variationValues?.[key] === variationValues[key]);
        });
    }, [initialProduct.variants, variationValues]);

    // Create fetcher with the current matching variant's product ID
    const fetcher = useScapiFetcher('ShopperProducts', 'getProduct', {
        parameters: {
            id: matchingVariant?.productId,
            allImages: true,
            // @sfdc-extension-block-start SFDC_EXT_BOPIS
            // Include store inventory when fetching variants for pickup items
            ...(pickupInfo?.inventoryId ? { inventoryIds: [pickupInfo.inventoryId] } : {}),
            // @sfdc-extension-block-end SFDC_EXT_BOPIS
        },
    });
    const selectedAttributes = useSelectedVariations({ product: currentProduct });

    // Use color image hook for managing selected color and filtered images
    const { galleryImages } = useProductImages({
        product: currentProduct,
        selectedAttributes,
    });

    // Trigger fetcher load when matching variant changes
    useEffect(() => {
        const targetProductId = matchingVariant?.productId;

        // Skip if no product ID or if it's already the currently displayed product
        if (!targetProductId || targetProductId === currentProduct.id) {
            return;
        }

        // Trigger the fetcher load - React Router will handle the lifecycle
        void fetcher.load();
        // fetcher: stable fetcher, no need to recreate effect
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchingVariant?.productId, currentProduct.id]);

    // Update current product when fetcher data changes
    useEffect(() => {
        if (fetcher.success && fetcher.data && fetcher.state === 'idle') {
            setCurrentProduct(fetcher.data);
        }
    }, [fetcher.success, fetcher.data, fetcher.state]);

    // Handle attribute change - just update variation values, useEffect will handle the fetch
    const handleAttributeChange = useCallback((attributeId: string, value: string) => {
        setVariationValues((prev) => {
            // Only update if the value actually changed
            if (prev[attributeId] === value) {
                return prev;
            }
            const newVariationValues = { ...prev, [attributeId]: value };
            return newVariationValues;
        });
    }, []);

    // Close modal immediately before update (optimistic UI)
    const handleCloseModal = useCallback(() => {
        onOpenChange?.(false);
    }, [onOpenChange]);
    return (
        <Dialog {...props} onOpenChange={(open) => onOpenChange?.(open)}>
            <DialogContent
                className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
                showCloseButton
                aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{uiStrings.editItem.title}</DialogTitle>
                </DialogHeader>
                <ProductViewProvider
                    product={currentProduct}
                    mode="edit"
                    initialQuantity={initialQuantity}
                    itemId={itemId}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                        <div className="order-1">
                            <ImageGallery images={galleryImages} eager={!isProductASet && !isProductABundle} />
                        </div>
                        <div className="order-2">
                            {/* we are controlling the swatches state with onAttributeChange and variationValues */}
                            <ProductInfo
                                product={currentProduct}
                                swatchMode="controlled"
                                onAttributeChange={handleAttributeChange}
                                variationValues={variationValues}
                            />
                            <ProductCartActions product={currentProduct} onBeforeCartAction={handleCloseModal} />
                        </div>
                    </div>
                </ProductViewProvider>
                {isProductASet || isProductABundle ? (
                    <ChildProducts
                        parentProduct={currentProduct}
                        mode="edit"
                        itemId={itemId}
                        initialBundleQuantity={initialQuantity}
                        onBeforeCartAction={handleCloseModal}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
