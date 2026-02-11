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
import { useBasketSnapshot } from '@/providers/basket';

vi.mock('@/providers/basket', () => ({
    useBasketSnapshot: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, options?: { count?: number }) => `Cart (${options?.count ?? 0})`,
    }),
}));

vi.mock('./cart-sheet', () => ({
    default: ({ children }: PropsWithChildren) => <div data-testid="cart-sheet">{children}</div>,
}));

describe('CartBadge', () => {
    const mockUseBasketSnapshot = vi.mocked(useBasketSnapshot);

    beforeEach(() => {
        mockUseBasketSnapshot.mockReset();
    });

    it('renders a badge with the snapshot count', () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 2,
            uniqueProductCount: 2,
        });

        render(<CartBadge />);

        expect(screen.getByRole('button', { name: 'Cart (2)' })).toBeInTheDocument();
        expect(screen.getByTestId('shopping-cart-badge')).toHaveTextContent('2');
    });

    it('defaults to zero when no snapshot is available', () => {
        mockUseBasketSnapshot.mockReturnValue(undefined);

        render(<CartBadge />);

        expect(screen.getByRole('button', { name: 'Cart (0)' })).toBeInTheDocument();
        expect(screen.getByTestId('shopping-cart-badge')).toHaveTextContent('0');
    });

    it('shows the cart sheet after the first click', async () => {
        mockUseBasketSnapshot.mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 1,
            uniqueProductCount: 1,
        });

        render(<CartBadge />);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Cart (1)' }));

        expect(await screen.findByTestId('cart-sheet')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cart (1)' })).toBeInTheDocument();
    });
});
