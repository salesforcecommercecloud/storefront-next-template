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
import { lazy, type ReactElement, Suspense, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBasketLoader, useBasketSnapshot, useMiniCart } from '@/providers/basket';
import { useBasketWithProductsLoader } from '@/hooks/use-basket-with-products';
import { useBasketWithPromotionsLoader } from '@/hooks/use-basket-with-promotions';
import CartBadgeIcon from './cart-badge-icon';
import { useTranslation } from 'react-i18next';

const CartSheet = lazy(() => import('./cart-sheet'));

/**
 * The cart badge defers the loading of the mini cart sheet until the very first user interaction
 * with the cart icon. The loading of the sheet component itself could in theory also happen earlier,
 * e.g. right after the initial load on the client. Subject for experiments...
 */
export default function CartBadge(): ReactElement {
    const snapshot = useBasketSnapshot();
    const { t } = useTranslation('cart');
    const numberOfItems = snapshot?.uniqueProductCount ?? 0;
    const [clicked, setClicked] = useState<boolean>(false);
    const { miniCartOpen, setMiniCartOpen } = useMiniCart();

    // Warm the mini-cart data path on hover/focus/touch so the basket and product images ideally are available by the
    // time the user clicks. Each loader handles its own dedup; the cart sheet's open state is unchanged — only data
    // fetching starts sooner. Skip when the cart is empty — there's nothing to enrich and the resource routes would
    // round-trip for no gain.
    const loadBasket = useBasketLoader();
    const loadProducts = useBasketWithProductsLoader();
    const loadPromotions = useBasketWithPromotionsLoader();
    const hasItems = numberOfItems > 0;
    const prefetch = useCallback(() => {
        if (!hasItems) {
            return;
        }
        loadBasket();
        loadProducts();
        loadPromotions();
    }, [hasItems, loadBasket, loadProducts, loadPromotions]);

    // Ensure CartSheet is lazy-loaded when opened externally (e.g. add-to-cart)
    if (miniCartOpen && !clicked) {
        setClicked(true);
    }

    if (clicked) {
        return (
            <Suspense
                fallback={
                    <Button
                        variant="ghost"
                        className="relative pointer-events-none hover:bg-transparent"
                        aria-label={t('badge.ariaLabel', { count: numberOfItems })}>
                        <CartBadgeIcon numberOfItems={numberOfItems} />
                    </Button>
                }>
                <CartSheet>
                    <Button
                        variant="ghost"
                        className="relative cursor-pointer hover:bg-transparent hover:opacity-50 transition-opacity"
                        onPointerEnter={prefetch}
                        onFocus={prefetch}
                        aria-label={t('badge.ariaLabel', { count: numberOfItems })}>
                        <CartBadgeIcon numberOfItems={numberOfItems} />
                    </Button>
                </CartSheet>
            </Suspense>
        );
    }

    return (
        <Button
            variant="ghost"
            className="relative cursor-pointer hover:bg-transparent hover:opacity-50 transition-opacity"
            onClick={() => {
                setClicked(true);
                setMiniCartOpen(true);
            }}
            onPointerEnter={prefetch}
            onFocus={prefetch}
            aria-label={t('badge.ariaLabel', { count: numberOfItems })}>
            <CartBadgeIcon numberOfItems={numberOfItems} />
        </Button>
    );
}
