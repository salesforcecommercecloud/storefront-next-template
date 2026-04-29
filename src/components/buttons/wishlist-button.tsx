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
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { HeartIcon } from '../icons';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCheckAndExecutePendingAction } from '@/hooks/check-and-execute-pending-action';
import { ACTION_PARAMS } from '@/hooks/use-filters-panel-state';

interface WishlistButtonProps {
    product: ShopperSearch.schemas['ProductSearchHit'];
    variant?: ShopperSearch.schemas['ProductSearchHit'];
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    tabIndex?: number;
}

const WishlistButton = ({ product, variant, size = 'md', className, tabIndex }: WishlistButtonProps) => {
    const { isItemInWishlist, toggleWishlist, isLoading } = useWishlist();

    const isInWishlist = useMemo(() => isItemInWishlist(product, variant), [isItemInWishlist, product, variant]);

    const handleWishlistToggle = useCallback(() => {
        void toggleWishlist(product, variant);
    }, [product, variant, toggleWishlist]);

    const pendingActionRef = useRef(false);
    const wasLoadingRef = useRef(false);

    useCheckAndExecutePendingAction({
        actionName: 'addToWishlist',
        shouldExecute: (params) => {
            const productId = variant?.productId || product.productId;
            return params.productId === productId;
        },
        onMatch: () => {
            pendingActionRef.current = true;
            void toggleWishlist(product, variant);
        },
    });

    // Scrub action params from the URL after a pending-action fetcher completes.
    // Uses replaceState to avoid a second React Router navigation cycle.
    useEffect(() => {
        if (!pendingActionRef.current) return;

        if (wasLoadingRef.current && !isLoading) {
            pendingActionRef.current = false;
            const url = new URL(window.location.href);
            for (const key of ACTION_PARAMS) {
                url.searchParams.delete(key);
            }
            window.history.replaceState(null, '', url.pathname + url.search);
        }
        wasLoadingRef.current = isLoading;
    }, [isLoading]);

    return (
        <HeartIcon
            isFilled={isInWishlist}
            isLoading={isLoading}
            onClick={handleWishlistToggle}
            size={size}
            className={className}
            tabIndex={tabIndex}
        />
    );
};

export { WishlistButton };
