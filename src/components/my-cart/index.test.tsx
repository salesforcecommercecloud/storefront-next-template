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
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import MyCart from './index';

vi.mock('react-i18next', () => ({
    useTranslation: (ns?: string) => {
        const tCheckout = (key: string, opts?: { amount?: number }) => {
            if (key === 'myCart.title') return 'My Cart';
            if (key === 'myCart.saved') return `Saved ${opts?.amount ?? ''}`;
            return key;
        };
        const tCart = (key: string) => (key === 'attributes.promotions' ? 'Promotions' : key);
        return {
            t: ns === 'cart' ? tCart : tCheckout,
            i18n: { language: 'en' },
            tCart,
        };
    },
}));

vi.mock('@/providers/currency', () => ({
    useCurrency: () => 'USD',
}));

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => ({}),
}));

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
    };
});

vi.mock('@/components/promo-popover', () => ({
    __esModule: true,
    default: ({ children }: { children: ReactNode }) => <div data-testid="promo-popover">{children}</div>,
}));

vi.mock('@/components/product-price', () => ({
    __esModule: true,
    default: () => <span data-testid="product-price" />,
}));

vi.mock('@/targets/ui-target', () => ({
    UITarget: () => null,
}));

vi.mock('@/lib/dynamic-image', () => ({
    toImageUrl: () => '',
}));

vi.mock('@/components/ui/accordion', () => {
    const Accordion = ({
        children,
        defaultValue,
        ...rest
    }: {
        children: ReactNode;
        defaultValue?: string;
        [key: string]: unknown;
    }) => (
        <div data-testid="accordion" data-default-value={defaultValue} {...rest}>
            {children}
        </div>
    );

    const passthrough = ({ children }: { children: ReactNode }) => <div>{children}</div>;

    return {
        Accordion,
        AccordionItem: passthrough,
        AccordionTrigger: passthrough,
        AccordionContent: passthrough,
    };
});

describe('MyCart', () => {
    const basket = {
        basketId: 'basket-1',
        productItems: [
            { itemId: 'item-1', productId: 'prod-1', quantity: 2 },
            { itemId: 'item-2', productId: 'prod-2', quantity: 1 },
        ],
    };

    const productMap: Record<string, { id: string; name: string }> = {
        'item-1': { id: 'prod-1', name: 'Product 1' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the cart title with total quantity', () => {
        render(<MyCart basket={basket} productMap={productMap} />);

        expect(screen.getByText(/My Cart \(3\)/)).toBeInTheDocument();
    });

    it('expands the accordion when itemsExpanded is true', () => {
        render(<MyCart basket={basket} productMap={productMap} itemsExpanded />);

        const accordion = screen.getByTestId('accordion');
        expect(accordion).toHaveAttribute('data-default-value', 'my-cart-items');
    });

    it('renders a card per product item', () => {
        render(<MyCart basket={basket} productMap={productMap} />);

        expect(screen.getByTestId('my-cart-item-prod-1')).toBeInTheDocument();
        expect(screen.getByTestId('my-cart-item-prod-2')).toBeInTheDocument();
    });

    it('displays product name from productMap when available', () => {
        render(<MyCart basket={basket} productMap={productMap} />);

        expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    it('handles missing promotions gracefully', () => {
        render(<MyCart basket={basket} productMap={productMap} />);

        expect(screen.getByText(/My Cart \(3\)/)).toBeInTheDocument();
        expect(screen.getByTestId('my-cart-item-prod-1')).toBeInTheDocument();
    });
});
