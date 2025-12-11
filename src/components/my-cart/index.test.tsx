import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import MyCart from './index';

const mockProductItemsList = vi.fn();

vi.mock('@/components/product-items-list', () => ({
    __esModule: true,
    default: (props: unknown) => {
        mockProductItemsList(props);
        return <div data-testid="product-items-list" />;
    },
}));

vi.mock('@/components/ui/accordion', () => {
    const Accordion = ({ children, defaultValue }: { children: ReactNode; defaultValue?: string }) => (
        <div data-testid="accordion" data-default-value={defaultValue}>
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

    const productMap = {
        'item-1': { id: 'prod-1', name: 'Product 1' },
    };

    beforeEach(() => {
        mockProductItemsList.mockClear();
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

    it('passes summary props to ProductItemsList', () => {
        render(<MyCart basket={basket} productMap={productMap} />);

        expect(mockProductItemsList).toHaveBeenCalledTimes(1);
        expect(mockProductItemsList).toHaveBeenCalledWith(
            expect.objectContaining({
                productItems: basket.productItems,
                productsByItemId: productMap,
                variant: 'summary',
                separateCards: true,
            })
        );
    });

    it('passes promotions to ProductItemsList when provided', () => {
        const promotions = {
            'promo-1': { id: 'promo-1', name: 'Test Promotion', calloutMsg: 'Save 20%' },
        };

        render(<MyCart basket={basket} productMap={productMap} promotions={promotions} />);

        expect(mockProductItemsList).toHaveBeenCalledTimes(1);
        expect(mockProductItemsList).toHaveBeenCalledWith(
            expect.objectContaining({
                productItems: basket.productItems,
                productsByItemId: productMap,
                promotions,
                variant: 'summary',
                separateCards: true,
            })
        );
    });

    it('handles missing promotions gracefully', () => {
        render(<MyCart basket={basket} productMap={productMap} />);

        expect(mockProductItemsList).toHaveBeenCalledTimes(1);
        const callArgs = mockProductItemsList.mock.calls[0][0];
        expect(callArgs.promotions).toBeUndefined();
    });
});
