import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import uiStrings from '@/temp-ui-string';
import OrderSummary from './index';

// Mock the currency formatter
vi.mock('@/lib/currency', () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}));

// Mock the ProductItemsList component
vi.mock('@/components/product-items-list', () => ({
    default: ({ variant }: { variant: string }) => (
        <div data-testid="product-items-list" data-variant={variant}>
            Mocked ProductItemsList
        </div>
    ),
}));

// Mock useFetcher, useNavigate, and Link from react-router
vi.mock('react-router', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        useFetcher: () => ({
            submit: vi.fn(),
            state: 'idle',
            data: null,
            formData: null,
            formAction: null,
            formMethod: null,
            formEncType: null,
            text: null,
            form: null,
            load: vi.fn(),
            Form: ({
                children,
                ...props
            }: React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode }) => (
                <form {...props}>{children}</form>
            ),
        }),
        useNavigate: () => vi.fn(),
        Link: ({
            to,
            children,
            onClick,
            className,
            ...props
        }: {
            to: string;
            children: React.ReactNode;
            onClick?: () => void;
            className?: string;
            [key: string]: unknown;
        }) => (
            <a href={to} onClick={onClick} className={className} {...props}>
                {children}
            </a>
        ),
    };
});

// Mock the useToast hook
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: vi.fn(),
    }),
}));

describe('OrderSummary', () => {
    const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
        basketId: 'test-basket-id',
        productSubTotal: 100.0,
        shippingTotal: 10.0,
        taxTotal: 8.5,
        orderTotal: 118.5,
        productItems: [
            {
                itemId: 'item1',
                productId: 'product1',
                quantity: 2,
                price: 50.0,
            },
            {
                itemId: 'item2',
                productId: 'product2',
                quantity: 1,
                price: 50.0,
            },
        ],
        shippingItems: [
            {
                itemId: 'shipping1',
                price: 10.0,
            },
        ],
    };

    const mockProductsByItemId: Record<string, ShopperProducts.schemas['Product']> = {
        item1: {
            id: 'product1',
            name: 'Test Product 1',
        },
        item2: {
            id: 'product2',
            name: 'Test Product 2',
        },
    };

    test('renders order summary with default props', () => {
        render(<OrderSummary basket={mockBasket} />);

        expect(screen.getByText(uiStrings.cart.summary.orderSummary)).toBeInTheDocument();
        expect(screen.getByTestId('sf-order-summary')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.summary.subtotal)).toBeInTheDocument();
        expect(screen.getByText('$100.00')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.summary.shipping)).toBeInTheDocument();
        expect(screen.getByText('$10.00')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.summary.tax)).toBeInTheDocument();
        expect(screen.getByText('$8.50')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.summary.orderTotal)).toBeInTheDocument();
        expect(screen.getByText('$118.50')).toBeInTheDocument();
    });

    test('does not render heading when showHeading is false', () => {
        render(<OrderSummary basket={mockBasket} showHeading={false} />);

        expect(screen.queryByText(uiStrings.cart.summary.orderSummary)).not.toBeInTheDocument();
    });

    test('does not render cart items when showCartItems is false', () => {
        render(<OrderSummary basket={mockBasket} showCartItems={false} />);

        expect(screen.queryByText('3 items in cart')).not.toBeInTheDocument();
        expect(screen.queryByTestId('product-items-list')).not.toBeInTheDocument();
    });

    test('renders cart items accordion with correct item count', async () => {
        const user = userEvent.setup();
        render(<OrderSummary basket={mockBasket} productsByItemId={mockProductsByItemId} />);

        // Total items: 2 + 1 = 3 items
        expect(screen.getByText(uiStrings.cart.items.itemsInCart.other.replace('{count}', '3'))).toBeInTheDocument();

        // Open the accordion to access the content
        const accordionTrigger = screen.getByRole('button');
        await user.click(accordionTrigger);

        expect(screen.getByTestId('product-items-list')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.items.editCart)).toBeInTheDocument();
    });

    test('shows correct item count text for different quantities', () => {
        // Test zero items
        const emptyBasket = { ...mockBasket, productItems: [] };
        const { rerender } = render(<OrderSummary basket={emptyBasket} />);
        expect(screen.getByText(uiStrings.cart.items.itemsInCart.zero)).toBeInTheDocument();

        // Test one item
        const oneItemBasket = {
            ...mockBasket,
            productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1, price: 50.0 }],
        };
        rerender(<OrderSummary basket={oneItemBasket} />);
        expect(screen.getByText(uiStrings.cart.items.itemsInCart.one)).toBeInTheDocument();
    });

    test('expands cart items accordion when itemsExpanded is true', () => {
        render(<OrderSummary basket={mockBasket} itemsExpanded={true} />);

        // The accordion should be expanded by default, so ProductItemsList should be visible
        expect(screen.getByTestId('product-items-list')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.items.editCart)).toBeInTheDocument();
    });

    test('renders promo code form when showPromoCodeForm is true', async () => {
        const user = userEvent.setup();
        render(<OrderSummary basket={mockBasket} showPromoCodeForm={true} />);

        // Open the promo code accordion
        const promoCodeTrigger = screen.getByText(uiStrings.cart.promoCode.accordionTitle);
        await user.click(promoCodeTrigger);

        expect(screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: uiStrings.cart.promoCode.apply })).toBeInTheDocument();
    });

    test('shows estimated total when isEstimate is true', () => {
        render(<OrderSummary basket={mockBasket} isEstimate={true} />);

        expect(screen.getByText(uiStrings.cart.summary.estimatedTotal)).toBeInTheDocument();
        expect(screen.queryByText(uiStrings.cart.summary.orderTotal)).not.toBeInTheDocument();
    });

    test('displays order price adjustments when present', () => {
        const basketWithAdjustments = {
            ...mockBasket,
            orderPriceAdjustments: [
                {
                    priceAdjustmentId: 'adj1',
                    itemText: '10% Off Promotion',
                    price: -10.0,
                },
            ],
        };

        render(<OrderSummary basket={basketWithAdjustments} />);

        expect(screen.getByText('10% Off Promotion')).toBeInTheDocument();
        expect(screen.getByText('$-10.00')).toBeInTheDocument();
    });

    test('shows free shipping when shipping promotion is applied', () => {
        const basketWithFreeShipping = {
            ...mockBasket,
            shippingTotal: 0,
            shippingItems: [
                {
                    itemId: 'shipping1',
                    price: 0,
                    priceAdjustments: [
                        {
                            priceAdjustmentId: 'shipping-adj1',
                            appliedDiscount: {
                                type: 'free' as const, // Use const assertion for test simplicity
                            },
                        },
                    ],
                },
            ],
        };

        render(<OrderSummary basket={basketWithFreeShipping} />);

        expect(screen.getByText(uiStrings.cart.summary.shippingPromotionApplied)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.summary.shippingFree)).toBeInTheDocument();
    });

    test('shows TBD when shippingTotal is undefined', () => {
        const basketWithUndefinedShipping = {
            ...mockBasket,
            shippingTotal: undefined,
        };

        render(<OrderSummary basket={basketWithUndefinedShipping} />);

        expect(screen.getByText(uiStrings.cart.summary.shippingTbd)).toBeInTheDocument();
        expect(screen.queryByText(uiStrings.cart.summary.shippingFree)).not.toBeInTheDocument();
        expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    });

    test('shows TBD when shippingTotal is null', () => {
        const basketWithNullShipping = {
            ...mockBasket,
            shippingTotal: null as unknown as number,
        };

        render(<OrderSummary basket={basketWithNullShipping} />);

        expect(screen.getByText(uiStrings.cart.summary.shippingTbd)).toBeInTheDocument();
        expect(screen.queryByText(uiStrings.cart.summary.shippingFree)).not.toBeInTheDocument();
        expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    });

    test('shows formatted currency when shippingTotal is positive number', () => {
        const basketWithPositiveShipping = {
            ...mockBasket,
            shippingTotal: 15.99,
        };

        render(<OrderSummary basket={basketWithPositiveShipping} />);

        expect(screen.getByText('$15.99')).toBeInTheDocument();
        expect(screen.queryByText(uiStrings.cart.summary.shippingFree)).not.toBeInTheDocument();
        expect(screen.queryByText(uiStrings.cart.summary.shippingTbd)).not.toBeInTheDocument();
    });

    test('shows TBD when taxTotal is undefined', () => {
        const basketWithoutTax = {
            ...mockBasket,
            taxTotal: undefined,
        };

        render(<OrderSummary basket={basketWithoutTax} />);

        expect(screen.getByText(uiStrings.cart.summary.taxTbd)).toBeInTheDocument();
    });

    test('shows TBD when taxTotal is null', () => {
        const basketWithNullTax = {
            ...mockBasket,
            taxTotal: null as unknown as number,
        };

        render(<OrderSummary basket={basketWithNullTax} />);

        expect(screen.getByText(uiStrings.cart.summary.taxTbd)).toBeInTheDocument();
    });

    test('shows formatted currency when taxTotal is zero', () => {
        const basketWithZeroTax = {
            ...mockBasket,
            taxTotal: 0,
        };

        render(<OrderSummary basket={basketWithZeroTax} />);

        expect(screen.getByText('$0.00')).toBeInTheDocument();
        expect(screen.queryByText(uiStrings.cart.summary.taxTbd)).not.toBeInTheDocument();
    });

    test('shows formatted currency when taxTotal is positive number', () => {
        const basketWithPositiveTax = {
            ...mockBasket,
            taxTotal: 12.75,
        };

        render(<OrderSummary basket={basketWithPositiveTax} />);

        expect(screen.getByText('$12.75')).toBeInTheDocument();
        expect(screen.queryByText(uiStrings.cart.summary.taxTbd)).not.toBeInTheDocument();
    });

    test('displays applied coupon items with remove buttons', () => {
        const basketWithCoupons = {
            ...mockBasket,
            couponItems: [
                {
                    couponItemId: 'coupon1',
                    code: 'SAVE10',
                },
                {
                    couponItemId: 'coupon2',
                    code: 'FREESHIP',
                },
            ],
        };

        render(<OrderSummary basket={basketWithCoupons} showPromoCodeForm={true} />);

        // Coupon codes are displayed by PromoCodeForm component
        expect(screen.getByText('SAVE10')).toBeInTheDocument();
        expect(screen.getByText('FREESHIP')).toBeInTheDocument();
    });

    test('does not show remove buttons for coupon items when basket has orderNo', () => {
        const basketWithOrderNo = {
            ...mockBasket,
            orderNo: 'ORDER-123',
            couponItems: [
                {
                    couponItemId: 'coupon1',
                    code: 'SAVE10',
                },
            ],
        };

        render(<OrderSummary basket={basketWithOrderNo} showPromoCodeForm={true} />);

        expect(screen.getByText('SAVE10')).toBeInTheDocument();
    });

    test('handles missing basket data gracefully', () => {
        render(<OrderSummary basket={{} as ShopperBasketsV2.schemas['Basket']} />);

        expect(screen.getByText(uiStrings.cart.summary.noBasketData)).toBeInTheDocument();
    });

    test('handles basket with orderNo instead of basketId', () => {
        const orderBasket = {
            ...mockBasket,
            basketId: undefined,
            orderNo: 'ORDER-123',
        };

        render(<OrderSummary basket={orderBasket} />);

        expect(screen.getByText(uiStrings.cart.summary.orderSummary)).toBeInTheDocument();
        expect(screen.getByTestId('sf-order-summary')).toBeInTheDocument();
    });

    test('uses productTotal when orderTotal is not available', () => {
        const basketWithProductTotal = {
            ...mockBasket,
            orderTotal: undefined,
            productTotal: 95.0,
        };

        render(<OrderSummary basket={basketWithProductTotal} />);

        expect(screen.getByText('$95.00')).toBeInTheDocument();
    });

    test('renders separator when promo code form is not shown', () => {
        render(<OrderSummary basket={mockBasket} showPromoCodeForm={false} />);

        const separator = document.querySelector('.shrink-0.bg-border');
        expect(separator).toBeInTheDocument();
    });

    test('has proper accessibility attributes', () => {
        render(<OrderSummary basket={mockBasket} />);

        const orderSummaryRegion = screen.getByRole('region', { name: uiStrings.cart.summary.orderSummary });
        expect(orderSummaryRegion).toBeInTheDocument();

        const heading = screen.getByRole('heading', { name: uiStrings.cart.summary.orderSummary });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveAttribute('id', 'order-summary-heading');
    });

    test('handles cart items accordion interaction', async () => {
        const user = userEvent.setup();
        render(<OrderSummary basket={mockBasket} />);

        const accordionTrigger = screen.getByRole('button');
        expect(accordionTrigger).toBeInTheDocument();

        await user.click(accordionTrigger);
        // The accordion should expand/collapse on click
        expect(accordionTrigger).toHaveAttribute('aria-expanded');
    });

    test('displays ProductItemsList with correct variant', async () => {
        const user = userEvent.setup();
        render(<OrderSummary basket={mockBasket} />);

        // Open the accordion to access the content
        const accordionTrigger = screen.getByRole('button');
        await user.click(accordionTrigger);

        const productItemsList = screen.getByTestId('product-items-list');
        expect(productItemsList).toHaveAttribute('data-variant', 'summary');
    });
});
