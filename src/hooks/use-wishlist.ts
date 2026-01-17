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

import { useCallback, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { useToast } from '@/components/toast';
import { useRequireAuth } from '@/hooks/use-require-auth';
/**
 * Hook for wishlist functionality using action routes for server-side state management.
 * Note: This hook maintains optimistic client-side state. For server-side wishlist data,
 * use the loader in account.wishlist.tsx route.
 */
export const useWishlist = () => {
    const { t } = useTranslation();
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
                addToast(t('product:failedToAddToWishlist'), 'error');
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
                    // In this case, we have access to only the product id (not item id)
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
                        addToast(t('product:removedFromWishlist') || 'Removed from wishlist', 'success');
                    } else if (result.alreadyInWishlist) {
                        // Product is already in wishlist - optimistic update was correct, keep it
                        // No need to revert since the product should be in the wishlist
                        addToast(
                            t('product:alreadyInWishlist', { productName: product.productName || 'product' }) ||
                                'Product is already in your wishlist',
                            'info'
                        );
                    } else {
                        addToast(
                            t('product:addedToWishlist', { productName: product.productName || 'product' }) ||
                                'Added to wishlist',
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
                    addToast(result?.error || t('product:failedToAddToWishlist'), 'error');
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
                addToast(t('product:failedToAddToWishlist'), 'error');
            }
        },
        [productIds, addFetcher, removeFetcher, addToast, t]
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
        toastMessage: t('product:signInToAddToWishlist'),
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
