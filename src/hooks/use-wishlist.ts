'use client';

import { useCallback, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { useToast } from '@/components/toast';
import { useRequireAuth } from '@/hooks/use-require-auth';
import uiStrings from '@/temp-ui-string';

/**
 * Hook for wishlist functionality using action routes for server-side state management.
 * Note: This hook maintains optimistic client-side state. For full wishlist data,
 * use the loader in account.wishlist.tsx route.
 */
export const useWishlist = () => {
    const addFetcher = useFetcher();
    const removeFetcher = useFetcher();
    const { addToast } = useToast();

    // Optimistic client-side state for tracking wishlist items
    const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());

    const productIds = useMemo(() => wishlistItems, [wishlistItems]);

    const isLoading = addFetcher.state !== 'idle' || removeFetcher.state !== 'idle';

    const isItemInWishlist = useCallback(
        (product: ShopperSearch.schemas['ProductSearchHit'], variant?: ShopperSearch.schemas['ProductSearchHit']) => {
            const productId = variant?.productId || product.productId;
            return productId ? productIds.has(productId) : false;
        },
        [productIds]
    );

    // Base toggle function (without auth check)
    const toggleWishlistBase = useCallback(
        async (
            product: ShopperSearch.schemas['ProductSearchHit'],
            variant?: ShopperSearch.schemas['ProductSearchHit']
        ) => {
            const productId = variant?.productId || product.productId;
            if (!productId) {
                addToast(uiStrings.product.failedToAddToWishlist, 'error');
                return;
            }

            const isInWishlist = productIds.has(productId);
            const fetcher = isInWishlist ? removeFetcher : addFetcher;
            const actionRoute = isInWishlist ? '/action/wishlist-remove' : '/action/wishlist-add';

            // Optimistic update
            setWishlistItems((prev) => {
                const next = new Set(prev);
                if (isInWishlist) {
                    next.delete(productId);
                } else {
                    next.add(productId);
                }
                return next;
            });

            try {
                await fetcher.submit(
                    { productId },
                    {
                        method: 'POST',
                        action: actionRoute,
                    }
                );

                const result = fetcher.data as
                    | {
                          success: boolean;
                          error?: string;
                          alreadyInWishlist?: boolean;
                      }
                    | undefined;
                if (result?.success) {
                    if (isInWishlist) {
                        addToast(uiStrings.product.removedFromWishlist || 'Removed from wishlist', 'success');
                    } else if (result.alreadyInWishlist) {
                        // Product is already in wishlist - optimistic update was correct, keep it
                        // No need to revert since the product should be in the wishlist
                        addToast(
                            uiStrings.product.alreadyInWishlist?.replace(
                                '{productName}',
                                product.productName || 'product'
                            ) || 'Product is already in your wishlist',
                            'info'
                        );
                    } else {
                        addToast(
                            uiStrings.product.addedToWishlist?.replace(
                                '{productName}',
                                product.productName || 'product'
                            ) || 'Added to wishlist',
                            'success'
                        );
                    }
                } else {
                    // Revert optimistic update on error
                    setWishlistItems((prev) => {
                        const next = new Set(prev);
                        if (isInWishlist) {
                            next.add(productId);
                        } else {
                            next.delete(productId);
                        }
                        return next;
                    });
                    addToast(result?.error || uiStrings.product.failedToAddToWishlist, 'error');
                }
            } catch {
                // Revert optimistic update on error
                setWishlistItems((prev) => {
                    const next = new Set(prev);
                    if (isInWishlist) {
                        next.add(productId);
                    } else {
                        next.delete(productId);
                    }
                    return next;
                });
                addToast(uiStrings.product.failedToAddToWishlist, 'error');
            }
        },
        [productIds, addFetcher, removeFetcher, addToast]
    );

    // Wrap with auth requirement
    const toggleWishlist = useRequireAuth(toggleWishlistBase as (...args: unknown[]) => Promise<unknown>, {
        actionName: 'toggleWishlist',
        getActionParams: (...args: unknown[]) => {
            const product = args[0] as ShopperSearch.schemas['ProductSearchHit'];
            const variant = args[1] as ShopperSearch.schemas['ProductSearchHit'] | undefined;
            const productId = variant?.productId || product.productId;
            return productId ? { productId } : {};
        },
        getReturnUrl: () => window.location.pathname + window.location.search,
        toastMessage: uiStrings.product.signInToAddToWishlist,
    }) as (
        product: ShopperSearch.schemas['ProductSearchHit'],
        variant?: ShopperSearch.schemas['ProductSearchHit']
    ) => Promise<void>;

    return {
        wishlist: Array.from(productIds),
        isLoading,
        isItemInWishlist,
        toggleWishlist,
    };
};
