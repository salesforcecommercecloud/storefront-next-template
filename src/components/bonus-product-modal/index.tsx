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

import { useState, useEffect, useMemo, useCallback, useRef, type ReactElement } from 'react';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { useFetcher } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useProductImages } from '@/hooks/product/use-product-images';
import { useToast } from '@/components/toast';
import ProductViewProvider, { useProductView } from '@/providers/product-view';
import ImageGallery from '@/components/image-gallery';
import ProductInfo from '@/components/product-view/product-info';
import { useBonusProductData } from './hooks';

export interface BonusDiscountSlot {
    id: string;
    maxBonusItems: number;
    bonusProductsSelected?: number;
}

export interface BonusProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId: string;
    productName: string;
    promotionId: string;
    bonusDiscountLineItemId: string;
    bonusDiscountSlots: BonusDiscountSlot[];
    maxQuantity: number;
}

/**
 * Maximum height for the bonus product modal content area on desktop
 * This prevents the modal from becoming too tall on large screens
 */
const BONUS_MODAL_CONTENT_MAX_HEIGHT = 600;

/**
 * BonusProductModal - Modal for selecting bonus products
 *
 * This component provides:
 * - Full product details with images, description, and variant selection
 * - Automatic variant availability (greyed out unavailable options)
 * - Responsive 2-column layout (mobile: single column, desktop: two columns)
 * - Add to cart functionality with quantity picker
 * - Close functionality (X button, outside click, ESC key)
 *
 * @param props - Component props
 * @returns JSX element with bonus product modal
 */
export function BonusProductModal({
    open,
    onOpenChange,
    productId,
    productName,
    promotionId,
    bonusDiscountLineItemId,
    bonusDiscountSlots,
    maxQuantity: _maxQuantity,
}: BonusProductModalProps): ReactElement {
    // === STATE ===
    const [currentProduct, setCurrentProduct] = useState<ShopperProductsTypes.Product | null>(null);
    const [variationValues, setVariationValues] = useState<Record<string, string>>({});
    // Track if the original productId was a variant (not a master)
    // When true, we should lock to that variant and hide variant selection
    const [isLockedToVariant, setIsLockedToVariant] = useState(false);

    // === HOOKS ===
    const { t } = useTranslation();
    const addToCartFetcher = useFetcher();
    const { addToast } = useToast();

    // Track if user has made any manual attribute changes
    const hasUserChangedAttributesRef = useRef(false);

    // Track if we're currently adding to cart to prevent toast firing on every render
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    // === DATA FETCHING (Initial) ===
    // Note: After merge, API structure changed to params.path and params.query
    // Reference: components/cart-item-edit-modal/index.tsx uses same pattern
    const fetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: productId },
            query: {
                allImages: true,
            },
        },
    });

    // === DATA LOADING & PROCESSING ===
    // Use composite hook to manage product data loading, processing, and state resets
    useBonusProductData({
        open,
        productId,
        fetcher,
        currentProduct,
        setIsLockedToVariant,
        setCurrentProduct,
        setVariationValues,
        hasUserChangedAttributesRef,
    });

    // === TOAST NOTIFICATIONS ===
    // Pattern from Odyssey: Check isAddingToCart flag first to prevent toast fatigue
    useEffect(() => {
        if (!isAddingToCart) {
            // Prevent toast fatigue - only show toast when we're actively adding to cart
            return;
        }

        // Only process if we have data from the fetcher and it's idle (not submitting)
        if (addToCartFetcher.state === 'idle' && addToCartFetcher.data) {
            // Handle success
            if (addToCartFetcher.data.success && addToCartFetcher.data.basket) {
                setIsAddingToCart(false);
                // Show success toast with product name
                const message = t('product:addedToCart', {
                    productName: currentProduct?.name || productName || 'bonus product',
                });
                addToast(message, 'success');

                // Close modal after successful add
                onOpenChange(false);
            }
            // Handle error
            else if (addToCartFetcher.data.success === false) {
                setIsAddingToCart(false);
                // Show error toast with error details
                const errorMessage = t('product:failedToAddToCart', {
                    error: addToCartFetcher.data.error || 'Unknown error',
                });
                addToast(errorMessage, 'error');
                // Note: Modal stays open on error so user can retry
            }
        }
        //As addToast, onOpenChange are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddingToCart, addToCartFetcher.state, addToCartFetcher.data, currentProduct?.name, productName]);

    // === VARIANT LOGIC ===
    // Filter variants where ALL selected attributes match
    // Returns variant only if exactly 1 match (meaning all attributes selected)
    const matchingVariant = useMemo(() => {
        if (!currentProduct?.variants) return undefined;

        // Filter variants where ALL currently selected attributes match
        const potentialVariants = currentProduct.variants.filter(
            (variant: { variationValues?: Record<string, string> }) => {
                return (
                    variant.variationValues &&
                    Object.keys(variationValues).every((key) => variant.variationValues?.[key] === variationValues[key])
                );
            }
        );

        // If exactly 1 variant matches, all attributes must be selected
        // If 0 matches: invalid combination
        // If multiple matches: not all attributes selected yet
        return potentialVariants.length === 1 ? potentialVariants[0] : undefined;
    }, [currentProduct?.variants, variationValues]);

    // === COUNT CALCULATIONS ===
    // Find the specific slot for this bonusDiscountLineItemId (not just the first one)
    const currentSlot = bonusDiscountSlots.find((slot) => slot.id === bonusDiscountLineItemId);
    const alreadySelectedCount = currentSlot?.bonusProductsSelected || 0;
    const totalAllowedCount = currentSlot?.maxBonusItems || 0;
    const remainingCapacity = Math.max(0, totalAllowedCount - alreadySelectedCount);

    // === HANDLERS ===
    const handleAttributeChange = useCallback((attributeId: string, value: string) => {
        hasUserChangedAttributesRef.current = true;

        setVariationValues((prev) => {
            if (prev[attributeId] === value) {
                return prev;
            }
            return { ...prev, [attributeId]: value };
        });
    }, []);

    const handleAddToCart = useCallback(
        (selectedQuantity: number) => {
            // Guard: Don't submit if product not loaded
            if (!currentProduct?.id) {
                return;
            }

            // Determine which product ID to use:
            // - If currentProduct is a variant, use its ID
            // - If currentProduct is a master, use matchingVariant's ID (if we found one)
            // - Otherwise use currentProduct.id
            const productIdToAdd = currentProduct.type?.variant
                ? currentProduct.id
                : matchingVariant?.productId || currentProduct.id;

            if (!currentSlot?.id) {
                addToast('No available bonus discount slot', 'error');
                return;
            }

            // Build array with single bonus item for the current slot
            const bonusItems = [
                {
                    productId: productIdToAdd, // Use variant ID, not master ID
                    quantity: selectedQuantity,
                    bonusDiscountLineItemId: currentSlot.id,
                    promotionId,
                },
            ];

            // Create FormData for server action
            const formData = new FormData();
            formData.append('bonusItems', JSON.stringify(bonusItems));

            // Set flag to indicate we're adding to cart (for toast effect)
            setIsAddingToCart(true);

            // Submit to server action
            void addToCartFetcher.submit(formData, {
                method: 'POST',
                action: '/action/bonus-product-add',
            });
        },
        // currentSlot.id is derived from bonusDiscountSlots[0], so bonusDiscountSlots dependency is sufficient
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            currentProduct?.id,
            currentProduct?.type,
            bonusDiscountSlots,
            promotionId,
            addToCartFetcher,
            addToast,
            matchingVariant,
        ]
    );

    // === IMAGE PREPARATION ===
    const safeProduct = currentProduct || ({} as ShopperProducts.schemas['Product']);
    // In controlled mode, use our variationValues state directly instead of URL-based hook
    const { galleryImages } = useProductImages({
        product: safeProduct,
        selectedAttributes: variationValues,
    });

    // === INLINE HELPER COMPONENT ===
    // Helper component that uses ProductView context for button rendering
    const AddToCartButton = ({ className }: { className?: string }) => {
        const { quantity, canAddToCart, isMasterOrVariantProduct } = useProductView();

        const isDisabled =
            addToCartFetcher.state === 'submitting' ||
            !currentProduct ||
            remainingCapacity === 0 ||
            quantity === 0 ||
            (isMasterOrVariantProduct && !matchingVariant && !currentProduct?.type?.variant) ||
            !canAddToCart;

        return (
            <Button onClick={() => handleAddToCart(quantity)} disabled={isDisabled} size="lg" className={className}>
                {addToCartFetcher.state === 'submitting' ? t('product:addingToCart') : t('product:addToCart')}
            </Button>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex flex-col w-full h-screen max-w-none lg:max-w-4xl lg:max-h-[90vh] lg:h-auto lg:overflow-y-auto"
                showCloseButton
                aria-describedby={undefined}>
                <DialogHeader className="shrink-0">
                    <DialogTitle>
                        {currentProduct?.name || productName} ({alreadySelectedCount} of {totalAllowedCount} selected)
                    </DialogTitle>
                </DialogHeader>

                {fetcher.state === 'loading' && !currentProduct ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : !currentProduct && fetcher.state === 'idle' && fetcher.data != null && !fetcher.success ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-4">
                        <p className="text-destructive text-center">
                            Failed to load product details. Please try again.
                        </p>
                        <Button
                            onClick={() => {
                                void fetcher.load();
                            }}
                            variant="outline">
                            Retry
                        </Button>
                    </div>
                ) : currentProduct ? (
                    <ProductViewProvider
                        product={currentProduct}
                        mode="add"
                        initialQuantity={1}
                        maxQuantity={remainingCapacity}
                        currentVariant={matchingVariant}>
                        {/* Scrollable content area */}
                        <div className="flex-1 overflow-y-auto min-h-0 lg:overflow-visible lg:flex-none">
                            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
                                <div className="lg:order-1">
                                    <ImageGallery
                                        images={galleryImages}
                                        eager={false}
                                        productName={currentProduct.name}
                                    />
                                </div>
                                <div className="lg:order-2">
                                    <div
                                        className="lg:border lg:border-gray-200 lg:rounded-lg lg:p-6 lg:overflow-y-auto"
                                        style={{ maxHeight: `${BONUS_MODAL_CONTENT_MAX_HEIGHT}px` }}>
                                        <ProductInfo
                                            product={currentProduct}
                                            swatchMode="controlled"
                                            onAttributeChange={handleAttributeChange}
                                            variationValues={variationValues}
                                            hideVariantSelection={isLockedToVariant}
                                        />
                                        <div className="text-destructive text-sm mt-2">
                                            Select up to {remainingCapacity}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop button - below both columns, aligned right */}
                            <div className="hidden lg:flex lg:justify-end lg:mt-6">
                                <AddToCartButton className="w-full lg:w-auto" />
                            </div>
                        </div>

                        {/* Sticky button area - only on mobile, outside scrollable area */}
                        <div className="shrink-0 bg-background border-t px-4 py-4 lg:hidden flex flex-col gap-2">
                            <AddToCartButton className="w-full" />
                            <Button
                                variant="outline"
                                className="w-full bg-muted hover:bg-muted/80"
                                onClick={() => onOpenChange(false)}>
                                Back to Cart
                            </Button>
                        </div>
                    </ProductViewProvider>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
