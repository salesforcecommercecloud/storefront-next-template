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
}

/**
 * Manages cart operations, inventory validation, and loading states for products.
 * Internally determines the current variant based on URL parameters and manages quantity state.
 *
 * @example Basic usage in ProductInfo
 * ```tsx
 * const {
 *   isAddingToCart,
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
export function useProductActions({ product, isChildProduct = false, stockLevel = 0 }: UseProductActionsProps) {
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);

    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Get current variant based on URL parameters
    const currentVariant = useCurrentVariant({ product, isChildProduct });

    // Toast notifications
    const { addToast } = useToast();

    // Fetchers for server actions
    const cartFetcher = useFetcher();
    const multipleItemsFetcher = useFetcher();
    const bundleFetcher = useFetcher();

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
    const isMasterOrVariantProduct = product.variationAttributes && product.variationAttributes.length > 0;

    // Can add to cart validation
    const canAddToCart = useMemo(() => {
        if (quantity <= 0) return false;

        if (quantity > actualStockLevel) return false;

        if (isMasterOrVariantProduct && !currentVariant) return false;
        if (isMasterOrVariantProduct && !currentVariant?.orderable) return false;
        if (!isMasterOrVariantProduct && !product.inventory?.orderable) return false;

        if (!isProductASet && !isProductABundle && !isInStock) return false;

        return true;
    }, [
        quantity,
        actualStockLevel,
        isMasterOrVariantProduct,
        currentVariant,
        product.inventory?.orderable,
        isProductASet,
        isProductABundle,
        isInStock,
    ]);

    // Handle successful cart updates
    useEffect(() => {
        if (!isAddingToCart) {
            // Prevent toast fatigue
            return;
        }
        if (cartFetcher.data?.success && cartFetcher.data.basket) {
            setIsAddingToCart(false);
            addToast(uiStrings.product.addedToCart.replace('{productName}', product.name || 'product'), 'success');
        } else if (cartFetcher.data?.success === false) {
            addToast(uiStrings.product.failedToAddToCart.replace('{error}', cartFetcher.data.error), 'error');
            setIsAddingToCart(false);
        }
        //As addToast, setIsAddingToCart are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddingToCart, cartFetcher.data, product.name]);

    useEffect(() => {
        if (!isAddingToCart) {
            // Prevent toast fatigue
            return;
        }
        if (multipleItemsFetcher.data?.success && multipleItemsFetcher.data.basket) {
            setIsAddingToCart(false);
            addToast(uiStrings.product.addedSetToCart, 'success');
        } else if (multipleItemsFetcher.data?.success === false) {
            addToast(
                uiStrings.product.failedToAddItemsToCart.replace('{error}', multipleItemsFetcher.data.error),
                'error'
            );
            setIsAddingToCart(false);
        }
        //As addToast, setIsAddingToCart are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddingToCart, multipleItemsFetcher.data]);

    useEffect(() => {
        if (!isAddingToCart) {
            // Prevent toast fatigue
            return;
        }
        if (bundleFetcher.data?.success && bundleFetcher.data.basket) {
            setIsAddingToCart(false);
            addToast(uiStrings.product.addedBundleToCart, 'success');
        } else if (bundleFetcher.data?.success === false) {
            addToast(uiStrings.product.failedToAddBundleToCart.replace('{error}', bundleFetcher.data.error), 'error');
            setIsAddingToCart(false);
        }
        //As addToast, setIsAddingToCart are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddingToCart, bundleFetcher.data]);

    // Handle adding to cart
    const handleAddToCart = useCallback(async () => {
        if (isAddingToCart || !canAddToCart) return;

        // Remember: not all products have variation attributes, so `product` in this case could be a standard product
        const productToAdd = isMasterOrVariantProduct ? currentVariant : product;
        const productId = productToAdd?.productId || productToAdd?.id;
        const price = productToAdd?.price;

        // Validate inputs
        if (!productId) {
            addToast(uiStrings.product.failedToAddProductToCart, 'error');
            return;
        }

        if (quantity <= 0) {
            addToast(uiStrings.product.failedToAddProductToCart, 'error');
            return;
        }

        setIsAddingToCart(true);

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
            setIsAddingToCart(false);
            addToast(uiStrings.product.failedToAddProductToCart, 'error');
        }
    }, [
        product,
        quantity,
        isMasterOrVariantProduct,
        currentVariant,
        isAddingToCart,
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
            if (isAddingToCart) return;

            // Validate inputs
            if (!productSelections || productSelections.length === 0) {
                addToast(uiStrings.product.failedToAddItemsToCartError, 'error');
                return;
            }

            setIsAddingToCart(true);

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
                setIsAddingToCart(false);
                addToast(uiStrings.product.failedToAddItemsToCartError, 'error');
            }
        },
        [isAddingToCart, multipleItemsFetcher, addToast]
    );

    // Handle product bundle add to cart
    const handleProductBundleAddToCart = useCallback(
        async (qty: number, childProductSelections: ProductSelectionValues[]) => {
            if (isAddingToCart) return;

            // Validate inputs
            if (!product.id) {
                addToast(uiStrings.product.failedToAddBundleToCartError, 'error');
                return;
            }

            if (qty <= 0) {
                addToast(uiStrings.product.failedToAddBundleToCartError, 'error');
                return;
            }

            if (!childProductSelections || childProductSelections.length === 0) {
                addToast(uiStrings.product.failedToAddBundleToCartError, 'error');
                return;
            }

            setIsAddingToCart(true);

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
                setIsAddingToCart(false);
                addToast(uiStrings.product.failedToAddBundleToCartError, 'error');
            }
        },
        [product, isAddingToCart, bundleFetcher, addToast]
    );

    return {
        // State
        /** Indicates if any add-to-cart operation is currently in progress */
        isAddingToCart:
            isAddingToCart ||
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
        /** Adds a product to the wishlist (placeholder implementation) */
        handleAddToWishlist,
        /** Adds multiple products from a product set to the cart simultaneously */
        handleProductSetAddToCart,
        /** Adds a product bundle (parent + child products) to the cart */
        handleProductBundleAddToCart,
        /** Updates the selected quantity for the product */
        setQuantity,
    };
}
