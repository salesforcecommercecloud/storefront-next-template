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
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import CartBadge from './cart-badge';
import { useBasketLoader, useBasketSnapshot } from '@/providers/basket';
import { useBasketWithProductsLoader } from '@/hooks/use-basket-with-products';
import { useBasketWithPromotionsLoader } from '@/hooks/use-basket-with-promotions';

vi.mock('@/providers/basket', () => ({
    useBasketSnapshot: vi.fn(),
    useBasketLoader: vi.fn(),
    useMiniCart: () => ({ miniCartOpen: false, setMiniCartOpen: vi.fn() }),
}));

vi.mock('@/hooks/use-basket-with-products', () => ({
    useBasketWithProductsLoader: vi.fn(),
}));

vi.mock('@/hooks/use-basket-with-promotions', () => ({
    useBasketWithPromotionsLoader: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, options?: { count?: number }) => `My Cart (${options?.count ?? 0})`,
    }),
}));

vi.mock('./cart-sheet', () => ({
    default: ({ children }: PropsWithChildren) => <div data-testid="cart-sheet">{children}</div>,
}));

describe('CartBadge', () => {
    const mockUseBasketSnapshot = vi.mocked(useBasketSnapshot);
    const mockUseBasketLoader = vi.mocked(useBasketLoader);
    const mockUseBasketWithProductsLoader = vi.mocked(useBasketWithProductsLoader);
    const mockUseBasketWithPromotionsLoader = vi.mocked(useBasketWithPromotionsLoader);
    const loadBasket = vi.fn();
    const loadProducts = vi.fn();
    const loadPromotions = vi.fn();

    beforeEach(() => {
        mockUseBasketSnapshot.mockReset();
        loadBasket.mockReset();
        loadProducts.mockReset();
        loadPromotions.mockReset();
        mockUseBasketLoader.mockReturnValue(loadBasket);
        mockUseBasketWithProductsLoader.mockReturnValue(loadProducts);
        mockUseBasketWithPromotionsLoader.mockReturnValue(loadPromotions);
    });

    it('renders a badge with the snapshot count', () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 2,
            uniqueProductCount: 2,
        });

        render(<CartBadge />);

        expect(screen.getByRole('button', { name: 'My Cart (2)' })).toBeInTheDocument();
        expect(screen.getByTestId('shopping-cart-badge')).toHaveTextContent('2');
    });

    it('defaults to zero when no snapshot is available', () => {
        mockUseBasketSnapshot.mockReturnValue(undefined);

        render(<CartBadge />);

        expect(screen.getByRole('button', { name: 'My Cart (0)' })).toBeInTheDocument();
        expect(screen.queryByTestId('shopping-cart-badge')).not.toBeInTheDocument();
    });

    it('shows the cart sheet after the first click', async () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 1,
            uniqueProductCount: 1,
        });

        render(<CartBadge />);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'My Cart (1)' }));

        expect(await screen.findByTestId('cart-sheet')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'My Cart (1)' })).toBeInTheDocument();
    });

    it('triggers prefetch on hover without opening the cart sheet', async () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 1,
            uniqueProductCount: 1,
        });

        render(<CartBadge />);

        const user = userEvent.setup();
        await user.hover(screen.getByRole('button', { name: 'My Cart (1)' }));

        expect(loadBasket).toHaveBeenCalledTimes(1);
        expect(loadProducts).toHaveBeenCalledTimes(1);
        expect(loadPromotions).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('cart-sheet')).not.toBeInTheDocument();
    });

    it('triggers prefetch on keyboard focus', async () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 1,
            uniqueProductCount: 1,
        });

        render(<CartBadge />);

        const user = userEvent.setup();
        await user.tab();

        expect(screen.getByRole('button', { name: 'My Cart (1)' })).toHaveFocus();
        expect(loadBasket).toHaveBeenCalled();
        expect(loadProducts).toHaveBeenCalled();
        expect(loadPromotions).toHaveBeenCalled();
        expect(screen.queryByTestId('cart-sheet')).not.toBeInTheDocument();
    });

    it('does not prefetch when the cart is empty', async () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 0,
            uniqueProductCount: 0,
        });

        render(<CartBadge />);

        const user = userEvent.setup();
        await user.hover(screen.getByRole('button', { name: 'My Cart (0)' }));

        expect(loadBasket).not.toHaveBeenCalled();
        expect(loadProducts).not.toHaveBeenCalled();
        expect(loadPromotions).not.toHaveBeenCalled();
    });

    it('keeps prefetch handlers wired after the sheet has been mounted', async () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 1,
            uniqueProductCount: 1,
        });

        render(<CartBadge />);

        const user = userEvent.setup();
        const button = screen.getByRole('button', { name: 'My Cart (1)' });
        await user.click(button);

        // Sheet is now mounted; second hover on the post-click button should still prefetch.
        loadBasket.mockClear();
        loadProducts.mockClear();
        loadPromotions.mockClear();
        await user.hover(screen.getByRole('button', { name: 'My Cart (1)' }));

        expect(loadBasket).toHaveBeenCalled();
        expect(loadProducts).toHaveBeenCalled();
        expect(loadPromotions).toHaveBeenCalled();
    });
});
