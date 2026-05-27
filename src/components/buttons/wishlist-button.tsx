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
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperSearch } from '@/scapi';
import { HeartIcon } from '../icons';
import { useToast } from '@/components/toast';
import { useIsInWishlist, useWishlistActions } from '@/providers/wishlist';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAnalytics } from '@/hooks/use-analytics';
import { useCheckAndExecutePendingAction } from '@/hooks/check-and-execute-pending-action';
import { ACTION_PARAMS } from '@/hooks/use-filters-panel-state';

interface WishlistButtonProps {
    product: ShopperSearch.schemas['ProductSearchHit'];
    variant?: ShopperSearch.schemas['ProductSearchHit'];
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    tabIndex?: number;
    surface: 'pdp' | 'plp' | 'cart' | 'wishlist-page';
}

const WishlistButton = ({ product, variant, size = 'md', className, tabIndex, surface }: WishlistButtonProps) => {
    const { t } = useTranslation('product');
    const { addToast } = useToast();
    const { toggle, isPending } = useWishlistActions();
    const { trackWishlistItemAdded, trackWishlistItemRemoved } = useAnalytics();

    const productId = variant?.productId || product.productId;
    // Per-product subscription via useSyncExternalStore — only re-renders when *this*
    // product's entry changes, not on unrelated wishlist mutations.
    const inWishlist = useIsInWishlist(productId);

    // Snapshot the membership flag at click time without re-subscribing on every
    // unrelated render — the toggle callback resolves the truth from the store via
    // the action result, but we still need the prior value for toast/analytics.
    const inWishlistRef = useRef(inWishlist);
    inWishlistRef.current = inWishlist;

    const toggleBase = useCallback(async () => {
        if (!productId || isPending) {
            return;
        }
        const wasInWishlist = inWishlistRef.current;
        const result = await toggle(productId);
        if (!result.success) {
            const errorKey = wasInWishlist ? 'failedToRemoveFromWishlist' : 'failedToAddToWishlist';
            addToast(t(errorKey), 'error');
            return;
        }
        // Detect the "already in wishlist" signal from add() (fast-path for stale state).
        const productName = product.productName || 'product';
        if ((result.data as { alreadyInWishlist?: boolean } | undefined)?.alreadyInWishlist) {
            addToast(t('alreadyInWishlist', { productName }), 'info');
            return;
        }
        // Match the existing useWishlist toast UX: confirm add/remove on success.
        const successKey = wasInWishlist ? 'removedFromWishlist' : 'addedToWishlist';
        addToast(t(successKey, { productName }), 'success');

        // Emit analytics event by surface — only for state-changing operations,
        // not for `alreadyInWishlist` no-ops (handled in the early return above).
        if (wasInWishlist) {
            void trackWishlistItemRemoved({ surface, productId });
        } else {
            void trackWishlistItemAdded({ surface, productId });
        }
    }, [
        productId,
        isPending,
        toggle,
        addToast,
        t,
        product.productName,
        surface,
        trackWishlistItemAdded,
        trackWishlistItemRemoved,
    ]);

    // Wrap with auth requirement (preserves the post-login redirect flow).
    const handleWishlistToggle = useRequireAuth(toggleBase as (...args: unknown[]) => Promise<unknown>, {
        actionName: 'addToWishlist',
        getActionParams: () => (productId ? { productId } : {}),
        getReturnUrl: () => window.location.pathname + window.location.search,
        toastMessage: t('signInToContinue'),
    }) as () => Promise<void>;

    const pendingActionRef = useRef(false);
    const wasPendingRef = useRef(false);

    useCheckAndExecutePendingAction({
        actionName: 'addToWishlist',
        shouldExecute: (params) => params.productId === productId,
        onMatch: () => {
            pendingActionRef.current = true;
            void handleWishlistToggle();
        },
    });

    // Scrub action params from the URL after a pending-action completes.
    useEffect(() => {
        if (!pendingActionRef.current) return;
        if (wasPendingRef.current && !isPending) {
            pendingActionRef.current = false;
            const url = new URL(window.location.href);
            for (const key of ACTION_PARAMS) {
                url.searchParams.delete(key);
            }
            window.history.replaceState(null, '', url.pathname + url.search);
        }
        wasPendingRef.current = isPending;
    }, [isPending]);

    return (
        <HeartIcon
            isFilled={inWishlist}
            isLoading={isPending}
            // Wrap to discard the Promise return — HeartIcon's onClick is `() => void`,
            // so passing `handleWishlistToggle` directly trips no-misused-promises.
            onClick={() => void handleWishlistToggle()}
            size={size}
            className={className}
            tabIndex={tabIndex}
        />
    );
};

export { WishlistButton };
