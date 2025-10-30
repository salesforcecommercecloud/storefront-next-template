/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useFetcher } from 'react-router';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { useToast } from '@/components/toast';
import { useCurrentVariant } from '@/hooks/product/use-current-variant';
import { useBasket } from '@/providers/basket';
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import uiStrings from '@/temp-ui-string';
import { isProductSet, isProductBundle } from '@/lib/product-utils';

interface ProductSelectionValues {
    product: ShopperProductsTypes.Product;
    variant: ShopperProductsTypes.Variant;
    quantity: number;
}

interface UseProductActionsProps {
    product: ShopperProductsTypes.Product;
    isChildProduct?: boolean;
    stockLevel?: number;
    initialQuantity?: number;
    itemId?: string; // Cart item ID for update operations
}

/**
 * Manages cart operations, inventory validation, and loading states for products.
 * Internally determines the current variant based on URL parameters and manages quantity state.
 *
 * @example Basic usage in ProductInfo
 * ```tsx
 * const {
 *   isAddingToOrUpdatingCart,
 *   canAddToCart,
 *   handleAddToCart,
 *   quantity,
 *   setQuantity,
 * } = useProductActions({
 *   product,
 *   stockLevel: inventory?.ats || 0,
 * });
 *
 * // Simple call - no parameters needed!
 * await handleAddToCart();
 * ```
 *
 * @example Product sets and bundles
 * ```tsx
 * const { handleProductSetAddToCart, handleProductBundleAddToCart } =
 *   useProductActions({ product: parentProduct });
 *
 * await handleProductSetAddToCart(selectedProducts);
 * await handleProductBundleAddToCart(quantity, childSelections);
 * ```
 *
 * @param props - Configuration object
 * @param props.product - Product data from Commerce Cloud
 * @param props.isChildProduct - Whether this is a child product (for sets/bundles). Defaults to false.
 * @param props.stockLevel - Override stock level (falls back to product inventory). Defaults to 0.
 * @returns State, validation flags, and action handlers
 */
export function useProductActions({
    product,
    isChildProduct = false,
    stockLevel = 0,
    initialQuantity,
    itemId,
}: UseProductActionsProps) {
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);

    const [isAddingToOrUpdatingCart, setIsAddingToOrUpdatingCart] = useState(false);
    const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
    const [quantity, setQuantity] = useState(initialQuantity ?? 1);

    // Get current variant based on URL parameters
    const currentVariant = useCurrentVariant({ product, isChildProduct });

    // Get basket data for update operations
    const basket = useBasket();
    const basketProductItems = basket?.productItems || [];

    // Toast notifications
    const { addToast } = useToast();
    const cartFetcher = useItemFetcher({ itemId, componentName: 'product-cart-actions' });
    const multipleItemsFetcher = useFetcher();
    const bundleFetcher = useItemFetcher({ itemId, componentName: 'product-bundle-actions' });

    // Inventory and stock calculations
    const inventory = product.inventory;
    const actualStockLevel = stockLevel || inventory?.ats || 0;

    const isInStock = useMemo(() => {
        if (isProductASet && product.setProducts) {
            return product.setProducts.every((childProduct) => {
                const ats = childProduct.inventory?.ats ?? 0;
                return ats > 0;
            });
        }
        return actualStockLevel > 0;
    }, [isProductASet, product.setProducts, actualStockLevel]);

    const isOutOfStock = !isInStock;
    let unfulfillable = isInStock && actualStockLevel < quantity;

    if (isProductASet) {
        // There is no quantity for product set. Shoppers choose the quantity for each _child_ products instead
        unfulfillable = !isInStock;
    }

    // Check if product is a master or variant product (has variation attributes like size, color)
    const isMasterOrVariantProduct = product?.type?.master === true || product?.type?.variant === true;

    // Can add to cart validation - defaults to false, only true when explicitly allowed
    const canAddToCart = useMemo(() => {
        // Master products cannot be added to cart - user must select a variant
        if (product?.type?.master === true) return false;

        // Quantity must be valid
        const hasValidQuantity = quantity > 0 && quantity <= actualStockLevel;
        if (!hasValidQuantity) return false;

        // item must be in stock for order
        // remove if your merchandise does not have inventory
        if (!isInStock) return false;

        // For variant products (e.g., t-shirt with color/size)
        // Must have a variant selected and it must be orderable
        if (product?.type?.variant === true && currentVariant && currentVariant.orderable === true) {
            return true;
        }

        // For standard products (non-variant, non-set, non-bundle)
        // Must be orderable/back-order and in stock
        if (
            !isMasterOrVariantProduct &&
            !isProductASet &&
            !isProductABundle &&
            (product?.inventory?.orderable || product?.inventory?.backorderable)
        ) {
            return true;
        }

        // For sets/bundles - must be orderable
        // isInStock takes child product inventory data into account
        if (
            (isProductASet || isProductABundle) &&
            (product?.inventory?.orderable || product?.inventory?.backorderable)
        ) {
            return true;
        }
        // Default: not allowed
        return false;
    }, [
        product,
        quantity,
        actualStockLevel,
        currentVariant,
        isInStock,
        isMasterOrVariantProduct,
        isProductASet,
        isProductABundle,
    ]);

    // Handle successful cart updates
    useEffect(() => {
        if (!isAddingToOrUpdatingCart) {
            // Prevent toast fatigue
            return;
        }
        if (cartFetcher.data?.success && cartFetcher.data.basket) {
            setIsAddingToOrUpdatingCart(false);
            // Only show toast for add to cart action, not edit cart
            if (!itemId) {
                addToast(uiStrings.product.addedToCart.replace('{productName}', product.name || 'product'), 'success');
            }
        } else if (cartFetcher.data?.success === false) {
            // Show error toast for both add and edit mode
            const errorMessage = itemId
                ? uiStrings.product.failedToUpdateCart.replace('{error}', cartFetcher.data.error)
                : uiStrings.product.failedToAddToCart.replace('{error}', cartFetcher.data.error);
            addToast(errorMessage, 'error');
            setIsAddingToOrUpdatingCart(false);
        }
        //As addToast, setIsAddingToOrUpdatingCart are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddingToOrUpdatingCart, cartFetcher.data, product.name, itemId]);

    useEffect(() => {
        if (!isAddingToOrUpdatingCart) {
            // Prevent toast fatigue
            return;
        }
        if (multipleItemsFetcher.data?.success && multipleItemsFetcher.data.basket) {
            setIsAddingToOrUpdatingCart(false);
            addToast(uiStrings.product.addedSetToCart, 'success');
        } else if (multipleItemsFetcher.data?.success === false) {
            addToast(
                uiStrings.product.failedToAddItemsToCart.replace('{error}', multipleItemsFetcher.data.error),
                'error'
            );
            setIsAddingToOrUpdatingCart(false);
        }
        //As addToast, setIsAddingToOrUpdatingCart are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddingToOrUpdatingCart, multipleItemsFetcher.data]);

    useEffect(() => {
        if (!isAddingToOrUpdatingCart) {
            // Prevent toast fatigue
            return;
        }
        if (bundleFetcher.data?.success && bundleFetcher.data.basket) {
            setIsAddingToOrUpdatingCart(false);
            addToast(uiStrings.product.addedBundleToCart, 'success');
        } else if (bundleFetcher.data?.success === false) {
            addToast(uiStrings.product.failedToAddBundleToCart.replace('{error}', bundleFetcher.data.error), 'error');
            setIsAddingToOrUpdatingCart(false);
        }
        //As addToast, setIsAddingToOrUpdatingCart are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddingToOrUpdatingCart, bundleFetcher.data]);

    // Handle adding to cart
    const handleAddToCart = useCallback(async () => {
        if (isAddingToOrUpdatingCart || !canAddToCart) return;

        // Remember: not all products have variation attributes, so `product` in this case could be a standard product
        const productToAdd = isMasterOrVariantProduct ? currentVariant : product;
        const productId = productToAdd?.productId || productToAdd?.id;
        const price = productToAdd?.price;

        // Validate inputs
        if (!productId || quantity <= 0) {
            addToast(uiStrings.product.failedToAddProductToCart, 'error');
            return;
        }

        setIsAddingToOrUpdatingCart(true);

        try {
            const productItem = {
                productId,
                quantity,
                price,
            };

            // Use server action to add item to cart
            await cartFetcher.submit(
                { productItem: JSON.stringify(productItem) },
                {
                    method: 'POST',
                    action: '/action/cart-item-add',
                }
            );
        } catch {
            setIsAddingToOrUpdatingCart(false);
            addToast(uiStrings.product.failedToAddProductToCart, 'error');
        }
    }, [
        product,
        quantity,
        isMasterOrVariantProduct,
        currentVariant,
        isAddingToOrUpdatingCart,
        canAddToCart,
        cartFetcher,
        addToast,
    ]);

    // Handle adding to wishlist
    //TODO: update this function when we work on wishlist
    const handleAddToWishlist = useCallback((_selectedVariant?: ShopperProductsTypes.Variant) => {
        setIsAddingToWishlist(true);

        // TODO: Implement actual add to wishlist API call
        // This will be implemented when wishlist functionality is added

        setIsAddingToWishlist(false);

        // TODO: Promise.resolve used to mimic future async behavior
        return Promise.resolve({ success: true });
    }, []);

    // Handle product set add to cart (multiple products)
    const handleProductSetAddToCart = useCallback(
        async (productSelections: ProductSelectionValues[]) => {
            if (isAddingToOrUpdatingCart) return;

            // Validate inputs
            if (!productSelections || productSelections.length === 0) {
                addToast(uiStrings.product.failedToAddItemsToCartError, 'error');
                return;
            }

            setIsAddingToOrUpdatingCart(true);

            try {
                const productItems = productSelections.map((selection) => ({
                    productId: selection.variant.productId || selection.product.id,
                    quantity: selection.quantity,
                    price: selection.variant.price || selection.product.price,
                }));

                // Use server action to add multiple items to cart
                await multipleItemsFetcher.submit(
                    { productItems: JSON.stringify(productItems) },
                    {
                        method: 'POST',
                        action: '/action/cart-set-add',
                    }
                );
            } catch {
                setIsAddingToOrUpdatingCart(false);
                addToast(uiStrings.product.failedToAddItemsToCartError, 'error');
            }
        },
        [isAddingToOrUpdatingCart, multipleItemsFetcher, addToast]
    );

    // Handle product bundle add to cart
    const handleProductBundleAddToCart = useCallback(
        async (qty: number, childProductSelections: ProductSelectionValues[]) => {
            if (isAddingToOrUpdatingCart) return;

            // Validate inputs
            if (!product.id || qty <= 0 || !childProductSelections || childProductSelections.length === 0) {
                addToast(uiStrings.product.failedToAddBundleToCartError, 'error');
                return;
            }

            setIsAddingToOrUpdatingCart(true);

            try {
                const bundleItem = {
                    productId: product.id,
                    quantity: qty,
                    price: product.price,
                };

                const childSelections = childProductSelections.map((child) => ({
                    productId: child.variant.productId || child.product.id,
                    quantity: child.quantity,
                }));

                // Use server action to add bundle to cart
                await bundleFetcher.submit(
                    {
                        bundleItem: JSON.stringify(bundleItem),
                        childSelections: JSON.stringify(childSelections),
                    },
                    {
                        method: 'POST',
                        action: '/action/cart-bundle-add',
                    }
                );
            } catch {
                setIsAddingToOrUpdatingCart(false);
                addToast(uiStrings.product.failedToAddBundleToCartError, 'error');
            }
        },
        [product, isAddingToOrUpdatingCart, bundleFetcher, addToast]
    );

    // Handle product bundle update (quantity and/or child variants)
    const handleUpdateBundle = useCallback(
        async (bundleQuantity: number, childProductSelections: ProductSelectionValues[]) => {
            if (isAddingToOrUpdatingCart || !canAddToCart || !itemId) return;

            // Validate inputs
            if (!product.id || bundleQuantity <= 0 || !childProductSelections || childProductSelections.length === 0) {
                addToast(uiStrings.product.failedToUpdateBundleToCartError, 'error');
                return;
            }

            setIsAddingToOrUpdatingCart(true);

            try {
                // Find the current bundle item in the basket
                const currentBundleItem = basketProductItems.find((item) => item.itemId === itemId) || {};

                if (!currentBundleItem?.bundledProductItems) {
                    setIsAddingToOrUpdatingCart(false);
                    return;
                }

                const itemsToBeUpdated: Array<{ itemId: string; productId: string; quantity: number }> = [];

                // Check each bundled child product to see if it needs updating
                currentBundleItem.bundledProductItems.forEach((bundleChild) => {
                    const childSelection = childProductSelections.find(
                        (childProduct) =>
                            childProduct.product?.id === bundleChild.productId ||
                            childProduct.product?.id === bundleChild.productId
                    );

                    const selectedProductId = childSelection?.variant?.productId || childSelection?.product?.id;

                    // Only update the item if the selected product is different from what's in the current bundle
                    if (childSelection && selectedProductId && selectedProductId !== bundleChild.productId) {
                        itemsToBeUpdated.push({
                            itemId: bundleChild.itemId || '',
                            productId: selectedProductId,
                            quantity: childSelection.quantity ?? bundleChild.quantity ?? 1,
                        });
                    }
                });

                // Update the parent bundle when the quantity changes
                // Since top level bundles don't have variants
                if (currentBundleItem.quantity !== bundleQuantity) {
                    itemsToBeUpdated.unshift({
                        itemId,
                        productId: currentBundleItem.productId || product.id || '',
                        quantity: bundleQuantity,
                    });
                }

                // Only make API call if there are items to update
                if (itemsToBeUpdated.length > 0) {
                    await bundleFetcher.submit(
                        { items: JSON.stringify(itemsToBeUpdated) },
                        {
                            method: 'PATCH',
                            action: '/action/cart-bundle-update',
                        }
                    );
                } else {
                    // No changes detected, just close the modal
                    setIsAddingToOrUpdatingCart(false);
                }
            } catch {
                setIsAddingToOrUpdatingCart(false);
                addToast(uiStrings.product.failedToUpdateBundleToCartError, 'error');
            }
        },
        // eslint complains about bundleFetcher and addToast missing from deps, these instances are not likely to change
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [product, isAddingToOrUpdatingCart, itemId, basketProductItems]
    );

    // Handle updating cart item (variant and/or quantity)
    const handleUpdateCart = useCallback(async () => {
        if (isAddingToOrUpdatingCart || !canAddToCart || !itemId) return;

        const productToUpdate = isMasterOrVariantProduct ? currentVariant : product;

        const selectedProductId = productToUpdate?.productId || productToUpdate?.id;
        // Validate inputs
        if (!selectedProductId || quantity <= 0) {
            addToast(uiStrings.product.failedToUpdateItemToCart, 'error');
            return;
        }

        setIsAddingToOrUpdatingCart(true);

        try {
            // Check if the selected variant already exists in the basket
            const existingItemWithSameVariant = basketProductItems.find(
                (item) => item.productId === selectedProductId && item.itemId !== itemId
            );

            const currentItem = basketProductItems.find((item) => item.itemId === itemId);
            const currentProductId = currentItem?.productId;

            // Case 1: User is only changing quantity (same variant)
            // Only send itemId and quantity (productId not needed for quantity-only updates)
            if (selectedProductId === currentProductId) {
                const updateFormData = new FormData();
                updateFormData.append('itemId', itemId);
                updateFormData.append('quantity', quantity.toString());
                await cartFetcher.submit(updateFormData, {
                    method: 'PATCH',
                    action: '/action/cart-item-update',
                });
            }
            // Case 2: User is selecting a different variant that already exists in basket
            // Remove current item and update the existing variant's quantity
            else if (existingItemWithSameVariant?.itemId) {
                // First remove the current item
                const removeFormData = new FormData();
                removeFormData.append('itemId', itemId);
                await cartFetcher.submit(removeFormData, {
                    method: 'POST',
                    action: '/action/cart-item-remove',
                });
                // Check if remove succeeded
                if (cartFetcher.data?.success === false) {
                    throw new Error(cartFetcher.data.error || uiStrings.product.failedToRemoveItem);
                }

                // Then update the existing variant's quantity
                const newQuantity = (existingItemWithSameVariant.quantity || 0) + quantity;
                const updateFormData = new FormData();
                updateFormData.append('itemId', existingItemWithSameVariant.itemId);
                updateFormData.append('productId', selectedProductId);
                updateFormData.append('quantity', newQuantity.toString());
                await cartFetcher.submit(updateFormData, {
                    method: 'PATCH',
                    action: '/action/cart-item-update',
                });

                // Check if update succeeded, if not, restore the removed item
                if (cartFetcher.data?.success === false) {
                    // Restore the removed item
                    const restoreFormData = new FormData();
                    restoreFormData.append(
                        'productItem',
                        JSON.stringify({
                            productId: currentItem?.productId,
                            quantity: currentItem?.quantity,
                            price: currentItem?.price,
                        })
                    );
                    await cartFetcher.submit(restoreFormData, {
                        method: 'POST',
                        action: '/action/cart-item-add',
                    });
                    throw new Error(cartFetcher.data.error || uiStrings.product.failedToUpdateItemQuantity);
                }
            }
            // Case 3: User is selecting a different variant that doesn't exist in basket
            // Update current item with new variant
            else {
                const updateFormData = new FormData();
                updateFormData.append('itemId', itemId);
                updateFormData.append('productId', selectedProductId);
                updateFormData.append('quantity', quantity.toString());
                await cartFetcher.submit(updateFormData, {
                    method: 'PATCH',
                    action: '/action/cart-item-update',
                });
            }
        } catch (error) {
            setIsAddingToOrUpdatingCart(false);
            const errorMessage = error instanceof Error ? error.message : uiStrings.product.failedToUpdateItemToCart;
            addToast(errorMessage, 'error');
        }
        // eslint complains about cartFetcher and addToast missing from deps, these instances are not likely to change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        product,
        quantity,
        isMasterOrVariantProduct,
        currentVariant,
        isAddingToOrUpdatingCart,
        canAddToCart,
        itemId,
        basketProductItems,
    ]);

    return {
        // State
        /** Indicates if any add-to-cart operation is currently in progress */
        isAddingToOrUpdatingCart:
            isAddingToOrUpdatingCart ||
            cartFetcher.state === 'submitting' ||
            multipleItemsFetcher.state === 'submitting' ||
            bundleFetcher.state === 'submitting',
        /** Indicates if an add-to-wishlist operation is currently in progress */
        isAddingToWishlist,
        /** Current quantity selected for the product */
        quantity,

        // Validation and inventory
        /** Determines if the product can be added to cart based on validation criteria */
        canAddToCart,
        /** Indicates if the product is currently in stock */
        isInStock,
        /** Convenience boolean - opposite of isInStock */
        isOutOfStock,
        /** Indicates if the current quantity selection cannot be fulfilled due to insufficient stock */
        unfulfillable,
        /** Indicates if the product is a master or variant product (has variation attributes like size, color, etc.) */
        isMasterOrVariantProduct,
        /** Actual available stock level for the product */
        stockLevel: actualStockLevel,

        // Actions
        /** Adds the current product/variant to cart using the selected quantity. No parameters needed - the hook manages all state internally. */
        handleAddToCart,
        /** Updates an existing cart item with new variant and/or quantity */
        handleUpdateCart,
        /** Adds a product to the wishlist (placeholder implementation) */
        handleAddToWishlist,
        /** Adds multiple products from a product set to the cart simultaneously */
        handleProductSetAddToCart,
        /** Adds a product bundle (parent + child products) to the cart */
        handleProductBundleAddToCart,
        /** Updates an existing bundle item with new quantity and/or child variants */
        handleUpdateBundle,
        /** Updates the selected quantity for the product */
        setQuantity,
    };
}
