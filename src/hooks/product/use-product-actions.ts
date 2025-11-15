/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFetcher, useLocation, useNavigate } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useToast } from '@/components/toast';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { usePickup } from '@/extensions/bopis/context/pickup-context';
import { getStoreIdForBasketItem } from '@/extensions/bopis/lib/basket-utils';
import { getPickupStoreFromMap } from '@/extensions/bopis/lib/store-utils';
// @sfdc-extension-block-end SFDC_EXT_BOPIS
import { useBasket } from '@/providers/basket';
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { useRequireAuth } from '@/hooks/use-require-auth';
import uiStrings from '@/temp-ui-string';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import { getEffectiveStockLevel, getEffectiveInventory, isInStock as isProductInStock } from '@/lib/inventory-utils';

interface ProductSelectionValues {
    product: ShopperProducts.schemas['Product'];
    variant: ShopperProducts.schemas['Variant'];
    quantity: number;
}

interface UseProductActionsProps {
    product: ShopperProducts.schemas['Product'];
    isChildProduct?: boolean;
    /** Current variant (null/undefined if no variant selected) - optional, defaults to undefined */
    currentVariant?: ShopperProducts.schemas['Variant'] | null | undefined;
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
 * @param props.currentVariant - Current variant (null/undefined if no variant selected) - optional, defaults to undefined
 * @returns State, validation flags, and action handlers
 */
export function useProductActions({
    product,
    isChildProduct: _isChildProduct = false,
    currentVariant,
    initialQuantity,
    itemId,
}: UseProductActionsProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);

    const [isAddingToOrUpdatingCart, setIsAddingToOrUpdatingCart] = useState(false);
    const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
    const hasHandledWishlistResponseRef = useRef(false);
    const [quantity, setQuantity] = useState(initialQuantity ?? 1);

    // @sfdc-extension-line SFDC_EXT_BOPIS
    const pickupContext = usePickup();

    // Get basket data for update operations
    const basket = useBasket();
    const basketProductItems = basket?.productItems || [];

    // Toast notifications
    const { addToast } = useToast();
    const cartFetcher = useItemFetcher({ itemId, componentName: 'product-cart-actions' });
    const multipleItemsFetcher = useFetcher();
    const bundleFetcher = useItemFetcher({ itemId, componentName: 'product-bundle-actions' });
    const wishlistFetcher = useFetcher();

    // Get product ID for pickup store check
    const productId = currentVariant?.productId || product.id;

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Get pickup store for this basket item (if in edit mode with itemId)
    const basketPickupStore = useMemo(() => {
        const pickupStoreId = getStoreIdForBasketItem(basket, itemId);
        return getPickupStoreFromMap(pickupStoreId, pickupContext?.pickupStores);
    }, [basket, itemId, pickupContext?.pickupStores]);

    // Check if pickup is selected for this product
    // Priority: existing basket item pickup store (basketPickupStore) OR pending pickup selection in context
    const isPickupSelected = useMemo(() => {
        // If basket item already has a pickup store, pickup is selected
        if (basketPickupStore) return true;
        // Otherwise check if there's a pending pickup selection in context
        return pickupContext?.pickupBasketItems?.has(productId) ?? false;
    }, [basketPickupStore, pickupContext?.pickupBasketItems, productId]);

    // Calculate store inventory ID based on delivery option
    // Priority: existing basket item pickup store (basketPickupStore) OR pending pickup selection in context
    const storeInventoryId = useMemo(() => {
        if (!isPickupSelected) return undefined;
        // If basket item already has a pickup store, use its inventoryId
        if (basketPickupStore?.inventoryId) return basketPickupStore.inventoryId;
        // Otherwise use inventoryId from pending pickup selection in context
        const pickupInfo = pickupContext?.pickupBasketItems?.get(productId);
        return pickupInfo?.inventoryId;
    }, [isPickupSelected, basketPickupStore, pickupContext?.pickupBasketItems, productId]);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Inventory and stock calculations - considers delivery option, store/site inventory, and variant
    const actualStockLevel = useMemo(() => {
        return getEffectiveStockLevel(
            product,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            isPickupSelected,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            storeInventoryId,
            currentVariant
        );
    }, [
        product,
        currentVariant,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        isPickupSelected,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storeInventoryId,
    ]);

    const isInStock = useMemo(() => {
        return isProductInStock(
            product,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            isPickupSelected,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            storeInventoryId,
            quantity,
            currentVariant
        );
    }, [
        product,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        isPickupSelected,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storeInventoryId,
        quantity,
        currentVariant,
    ]);

    const isOutOfStock = !isInStock;

    // Check if product is a master or variant product (has variation attributes like size, color)
    const isMasterOrVariantProduct = product?.type?.master === true || product?.type?.variant === true;

    const unfulfillable = isProductASet
        ? // There is no quantity for product set. Shoppers choose the quantity for each _child_ products instead
          !isInStock
        : actualStockLevel > 0 && actualStockLevel < quantity;

    // Get effective inventory (store or site) for orderable/backorderable checks
    // This considers the selected delivery option (pickup vs delivery)
    const effectiveInventory = useMemo(() => {
        return getEffectiveInventory(
            product,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            isPickupSelected,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            storeInventoryId,
            currentVariant
        );
    }, [
        product,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        isPickupSelected,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storeInventoryId,
        currentVariant,
    ]);

    // Can add to cart validation - defaults to false, only true when explicitly allowed
    const canAddToCart = useMemo(() => {
        // Quantity must be valid
        const hasValidQuantity = quantity > 0 && quantity <= actualStockLevel;
        if (!hasValidQuantity) return false;

        // item must be in stock for order
        // remove if your merchandise does not have inventory
        if (!isInStock) return false;

        // For master/variant products (e.g., t-shirt with color/size)
        // Must have a variant selected and it must be orderable from effective inventory (store or site)
        // effectiveInventory considers the selected delivery option (pickup vs delivery)
        if (isMasterOrVariantProduct) {
            // Master products cannot be added to cart without a variant selection
            if (!currentVariant) return false;
            // Variant must be orderable from effective inventory (store or site)
            return effectiveInventory?.orderable === true;
        }

        // For standard products (non-variant, non-set, non-bundle)
        // Must be orderable/back-order from effective inventory (store or site) and in stock
        if (
            !isProductASet &&
            !isProductABundle &&
            (effectiveInventory?.orderable || effectiveInventory?.backorderable)
        ) {
            return true;
        }

        // For sets/bundles - must be orderable from effective inventory
        // isInStock takes child product inventory data into account
        if (
            (isProductASet || isProductABundle) &&
            (effectiveInventory?.orderable || effectiveInventory?.backorderable)
        ) {
            return true;
        }
        // Default: not allowed
        return false;
    }, [
        quantity,
        actualStockLevel,
        currentVariant,
        isInStock,
        effectiveInventory,
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

    // Generic pending action tracker (after auth redirect)
    // This tracks when actions are automatically executed after login
    // Uses URL params directly - if URL has action params for this product, action is executing
    const productToCheck = isMasterOrVariantProduct ? currentVariant : product;
    const currentProductId = productToCheck?.productId || productToCheck?.id;

    useEffect(() => {
        if (!currentProductId) {
            return;
        }

        // Check URL params to see if wishlist action is executing for this product
        const urlParams = new URLSearchParams(location.search);
        const urlAction = urlParams.get('action');
        const urlActionParamsStr = urlParams.get('actionParams');

        let isPendingWishlistAction = false;
        if (urlAction === 'addToWishlist' && urlActionParamsStr) {
            try {
                const urlActionParams = JSON.parse(urlActionParamsStr);
                const urlProductId = urlActionParams.productId;
                isPendingWishlistAction = urlProductId === currentProductId;
            } catch {
                // Invalid JSON - ignore
            }
        }

        // Show loading state if URL indicates action is executing for this product
        // Always sync state with URL params - don't check current state to avoid timing issues
        setIsAddingToWishlist(isPendingWishlistAction);
    }, [currentProductId, location.search]);

    // Handle wishlist fetcher response (for both direct clicks and component-executed pending actions)
    useEffect(() => {
        // Check if this is a pending action (from URL params)
        const urlParams = new URLSearchParams(location.search);
        const urlAction = urlParams.get('action');
        const isPendingAction = urlAction === 'addToWishlist';

        // Only handle responses when fetcher is idle and we have data
        if (wishlistFetcher.state !== 'idle' || !wishlistFetcher.data) {
            // Reset flag when fetcher starts a new request
            if (wishlistFetcher.state === 'submitting') {
                hasHandledWishlistResponseRef.current = false;
            }
            return;
        }

        // Prevent handling the same response multiple times
        if (hasHandledWishlistResponseRef.current) {
            return;
        }

        const result = wishlistFetcher.data as
            | {
                  success: boolean;
                  error?: string;
                  alreadyInWishlist?: boolean;
              }
            | undefined;

        if (result?.success) {
            hasHandledWishlistResponseRef.current = true;
            setIsAddingToWishlist(false);

            // If this was a pending action, clear URL params after successful execution
            if (isPendingAction) {
                void navigate(location.pathname, { replace: true });
            }

            if (result.alreadyInWishlist) {
                addToast(
                    uiStrings.product.alreadyInWishlist?.replace(
                        '{productName}',
                        product.name || uiStrings.common.productGeneric
                    ) || uiStrings.product.itemAlreadyInWishlist,
                    'info'
                );
            } else {
                addToast(
                    uiStrings.product.addedToWishlist?.replace(
                        '{productName}',
                        product.name || uiStrings.common.productGeneric
                    ) || uiStrings.product.addedToWishlistGeneric,
                    'success'
                );
            }
        } else if (result?.success === false || result?.error) {
            hasHandledWishlistResponseRef.current = true;
            setIsAddingToWishlist(false);

            // If this was a pending action, clear URL params even on error
            if (isPendingAction) {
                void navigate(location.pathname, { replace: true });
            }

            addToast(result.error || uiStrings.product.failedToAddProductToWishlist, 'error');
        }
        //As addToast, setIsAddingToWishlist, navigate are unlikely to change, we don't need to include them in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isAddingToWishlist,
        wishlistFetcher.data,
        wishlistFetcher.state,
        product.name,
        location.pathname,
        location.search,
    ]);

    // Handle adding to cart
    const handleAddToCart = useCallback(async () => {
        if (isAddingToOrUpdatingCart || !canAddToCart) return;

        // Remember: not all products have variation attributes, so `product` in this case could be a standard product
        const productToAdd = isMasterOrVariantProduct ? currentVariant : product;
        const itemProductId = productToAdd?.productId || productToAdd?.id;
        const price = productToAdd?.price;

        // Validate inputs
        if (!itemProductId || quantity <= 0) {
            addToast(uiStrings.product.failedToAddProductToCart, 'error');
            return;
        }

        setIsAddingToOrUpdatingCart(true);

        try {
            // @sfdc-extension-block-start SFDC_EXT_BOPIS
            const pickupInfo = pickupContext?.pickupBasketItems?.get(itemProductId);
            const inventoryId = pickupInfo?.inventoryId ?? null;
            const storeId = pickupInfo?.storeId ?? null;
            // @sfdc-extension-block-end SFDC_EXT_BOPIS

            const productItem = {
                productId: itemProductId,
                quantity,
                price,
                // @sfdc-extension-line SFDC_EXT_BOPIS
                inventoryId,
                // @sfdc-extension-line SFDC_EXT_BOPIS
                storeId,
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
        // @sfdc-extension-line SFDC_EXT_BOPIS
        pickupContext,
    ]);

    /**
     * Generic helper to create product action handlers
     * Abstracts common pattern: validate product, set loading state, submit to action route
     */
    const createProductActionHandler = useCallback(
        <TParams extends Record<string, unknown> = Record<string, unknown>>(config: {
            actionRoute: string;
            isLoading: boolean;
            setLoading: (loading: boolean) => void;
            fetcher: ReturnType<typeof useFetcher>;
            errorMessage: string;
            buildFormData: (params: TParams) => FormData | Record<string, string>;
            actionName?: string; // For debug logging
        }) => {
            return async (
                selectedVariant?: ShopperProducts.schemas['Variant'],
                additionalParams?: Partial<TParams>
            ) => {
                const { actionRoute, isLoading, setLoading, fetcher, errorMessage, buildFormData } = config;

                if (isLoading) {
                    return;
                }

                // Prefer variant if available, otherwise fall back to master product ID
                // Let the API decide if master products are allowed
                const productToAdd = isMasterOrVariantProduct ? selectedVariant || currentVariant : product;
                const itemProductId = productToAdd?.productId || productToAdd?.id || product.id;

                if (!itemProductId) {
                    addToast(errorMessage, 'error');
                    return;
                }

                setLoading(true);

                try {
                    const params = { productId: itemProductId, ...additionalParams } as unknown as TParams;
                    const formData = buildFormData(params);
                    await fetcher.submit(formData, {
                        method: 'POST',
                        action: actionRoute,
                    });
                    // Note: fetcher.data may not be immediately available after submit()
                    // Response handling should be done in a useEffect that watches fetcher.state
                } catch {
                    setLoading(false);
                    addToast(errorMessage, 'error');
                }
            };
        },
        [product, isMasterOrVariantProduct, currentVariant, addToast]
    );

    // Handle adding to wishlist - using generic handler
    const handleAddToWishlistBase = useMemo(
        () =>
            createProductActionHandler<{ productId: string }>({
                actionRoute: '/action/wishlist-add',
                isLoading: isAddingToWishlist,
                setLoading: setIsAddingToWishlist,
                fetcher: wishlistFetcher,
                errorMessage: uiStrings.product.failedToAddProductToWishlist,
                buildFormData: (params) => ({ productId: String(params.productId) }),
                actionName: 'handleAddToWishlistBase',
            }),
        [createProductActionHandler, isAddingToWishlist, wishlistFetcher]
    );

    // Wrap the base handler with auth requirement - must be called at render time (not in async functions)
    const handleAddToWishlist = useRequireAuth(
        (async (...args: unknown[]) => {
            const variant = args[0] as ShopperProducts.schemas['Variant'] | undefined;
            return handleAddToWishlistBase(variant);
        }) as (...args: unknown[]) => Promise<unknown>,
        {
            actionName: 'addToWishlist',
            getActionParams: (...args: unknown[]) => {
                const variant = args[0] as ShopperProducts.schemas['Variant'] | undefined;
                const productToAdd = isMasterOrVariantProduct ? variant || currentVariant : product;
                const itemProductId = productToAdd?.productId || productToAdd?.id || product.id;
                if (!itemProductId) {
                    throw new Error(uiStrings.product.productIdRequired);
                }
                return { productId: itemProductId };
            },
            getReturnUrl: () =>
                typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
            toastMessage: uiStrings.product.signInToAddToWishlist,
        }
    ) as (variant?: ShopperProducts.schemas['Variant']) => Promise<void>;

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
                const productItems = productSelections.map((selection) => {
                    const selectionProductId = selection.variant?.productId || selection.product.id;
                    // @sfdc-extension-block-start SFDC_EXT_BOPIS
                    const pickupInfo = pickupContext?.pickupBasketItems?.get(selectionProductId);
                    const inventoryId = pickupInfo?.inventoryId ?? null;
                    const storeId = pickupInfo?.storeId ?? null;
                    // @sfdc-extension-block-end SFDC_EXT_BOPIS

                    return {
                        productId: selectionProductId,
                        quantity: selection.quantity,
                        price: selection.variant?.price || selection.product.price,
                        // @sfdc-extension-line SFDC_EXT_BOPIS
                        inventoryId,
                        // @sfdc-extension-line SFDC_EXT_BOPIS
                        storeId,
                    };
                });

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
        [
            isAddingToOrUpdatingCart,
            multipleItemsFetcher,
            addToast,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            pickupContext,
        ]
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
                // @sfdc-extension-block-start SFDC_EXT_BOPIS
                const pickupInfo = pickupContext?.pickupBasketItems?.get(product.id);
                const bundleInventoryId = pickupInfo?.inventoryId ?? null;
                const bundleStoreId = pickupInfo?.storeId ?? null;
                // @sfdc-extension-block-end SFDC_EXT_BOPIS

                const bundleItem = {
                    productId: product.id,
                    quantity: qty,
                    price: product.price,
                    // @sfdc-extension-line SFDC_EXT_BOPIS
                    inventoryId: bundleInventoryId,
                    // @sfdc-extension-line SFDC_EXT_BOPIS
                    storeId: bundleStoreId,
                };

                const childSelections = childProductSelections.map((child) => ({
                    productId: child.variant?.productId || child.product.id,
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
        [
            product,
            isAddingToOrUpdatingCart,
            bundleFetcher,
            addToast,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            pickupContext,
        ]
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
            const existingProductId = currentItem?.productId;

            // Case 1: User is only changing quantity (same variant)
            // Only send itemId and quantity (productId not needed for quantity-only updates)
            if (selectedProductId === existingProductId) {
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

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        // BOPIS: Pickup actions
        /** Pickup store for this basket item if it's set for pickup, undefined otherwise */
        basketPickupStore,
        /** Map of productId to {inventoryId, storeId} for items marked for store pickup */
        pickupBasketItems: pickupContext?.pickupBasketItems,
        /** Marks a product for store pickup by adding it to the pickup map */
        addItem: pickupContext?.addItem,
        /** Removes a product from store pickup by removing it from the pickup map */
        removeItem: pickupContext?.removeItem,
        /** Clears all pickup items from the pickup map */
        clearItems: pickupContext?.clearItems,
        // @sfdc-extension-block-end SFDC_EXT_BOPIS
    };
}
