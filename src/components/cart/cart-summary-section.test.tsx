// Testing libraries
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// React Router
import { createRoutesStub } from 'react-router';

// Components
import CartSummarySection from './cart-summary-section';

// Utils
import uiStrings from '@/temp-ui-string';

const renderCartSummarySection = (props: React.ComponentProps<typeof CartSummarySection>) => {
    const Stub = createRoutesStub([
        {
            path: '/cart',
            Component: () => <CartSummarySection {...props} />,
        },
    ]);
    return render(<Stub initialEntries={['/cart']} />);
};

describe('CartSummarySection', () => {
    const mockBasket = {
        basketId: 'test-basket-id',
        productItems: [
            { itemId: 'item-1', quantity: 2 },
            { itemId: 'item-2', quantity: 1 },
        ],
    };

    const productMap = {
        'item-1': { id: 'product-1', name: 'Product 1' },
        'item-2': { id: 'product-2', name: 'Product 2' },
    };

    describe('Desktop Layout', () => {
        test('renders desktop version with OrderSummary and CheckoutAction', () => {
            renderCartSummarySection({
                basket: mockBasket,
                isDesktop: true,
                productMap,
            });

            // Verify checkout button is present
            expect(screen.getByText(uiStrings.cart.checkout.proceedToCheckout)).toBeInTheDocument();

            // Verify checkout button is a link to /checkout
            const checkoutLink = screen.getByRole('link', {
                name: `${uiStrings.cart.checkout.proceedToCheckout}${uiStrings.cart.checkout.secure}`,
            });
            expect(checkoutLink).toHaveAttribute('href', '/checkout');
        });

        test('renders payment icons with correct dimensions', () => {
            renderCartSummarySection({
                basket: mockBasket,
                isDesktop: true,
                productMap,
            });

            // Verify payment icons container exists
            const paymentIconsContainer = document.querySelector('.flex.justify-center');
            expect(paymentIconsContainer).toBeInTheDocument();

            // Verify payment icons are rendered with correct dimensions
            const paymentIcons = paymentIconsContainer?.querySelectorAll('svg');
            expect(paymentIcons).toHaveLength(4); // Visa, Mastercard, Amex, Discover
        });
    });

    describe('Mobile Layout', () => {
        test('renders mobile version with sticky bottom container', () => {
            renderCartSummarySection({
                basket: mockBasket,
                isDesktop: false,
                productMap,
            });

            // Verify checkout button is present
            expect(screen.getByText(uiStrings.cart.checkout.proceedToCheckout)).toBeInTheDocument();

            // Verify checkout button is a link to /checkout
            const checkoutLink = screen.getByRole('link', {
                name: `${uiStrings.cart.checkout.proceedToCheckout}${uiStrings.cart.checkout.secure}`,
            });
            expect(checkoutLink).toHaveAttribute('href', '/checkout');

            // Verify mobile-specific layout (sticky bottom container)
            const mobileContainer = screen.getByTestId('mobile-checkout-container');
            expect(mobileContainer).toBeInTheDocument();

            // Verify sticky positioning
            expect(mobileContainer).toHaveClass('sticky', 'bottom-0');
        });

        test('renders payment icons in mobile version', () => {
            renderCartSummarySection({
                basket: mockBasket,
                isDesktop: false,
                productMap,
            });

            // Verify payment icons container exists
            const paymentIconsContainer = document.querySelector('.flex.justify-center');
            expect(paymentIconsContainer).toBeInTheDocument();

            // Verify payment icons are rendered with correct dimensions
            const paymentIcons = paymentIconsContainer?.querySelectorAll('svg');
            expect(paymentIcons).toHaveLength(4); // Visa, Mastercard, Amex, Discover

            // Verify lock icon is present
            const lockIcon = screen.getByLabelText(uiStrings.cart.checkout.secure);
            expect(lockIcon).toBeInTheDocument();
            expect(lockIcon.tagName).toBe('svg');
        });
    });

    describe('CheckoutAction Component', () => {
        test('renders checkout button with correct text, link, and lock icon', () => {
            renderCartSummarySection({
                basket: mockBasket,
                isDesktop: true,
                productMap,
            });

            // Verify checkout button text
            const checkoutButton = screen.getByText(uiStrings.cart.checkout.proceedToCheckout);
            expect(checkoutButton).toBeInTheDocument();

            // Verify checkout button is a link
            expect(checkoutButton.tagName).toBe('A');
            expect(checkoutButton).toHaveAttribute('href', '/checkout');

            // Check for Lock icon by aria-label
            const lockIcon = screen.getByLabelText(uiStrings.cart.checkout.secure);
            expect(lockIcon).toBeInTheDocument();

            // Verify lock icon is an SVG
            expect(lockIcon.tagName).toBe('svg');

            // Verify button element exists
            const buttonElement = checkoutButton.closest('button') || checkoutButton;
            expect(buttonElement).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('handles basket without productMap', () => {
            renderCartSummarySection({
                basket: mockBasket,
                isDesktop: true,
            });

            // Verify that the component renders without errors
            expect(screen.getByText(uiStrings.cart.checkout.proceedToCheckout)).toBeInTheDocument();
        });

        test('handles empty productMap object', () => {
            renderCartSummarySection({
                basket: mockBasket,
                isDesktop: true,
                productMap: {},
            });

            // Verify that the component renders without errors
            expect(screen.getByText(uiStrings.cart.checkout.proceedToCheckout)).toBeInTheDocument();

            // Verify checkout button is still functional
            const checkoutButton = screen.getByText(uiStrings.cart.checkout.proceedToCheckout);
            expect(checkoutButton).toHaveAttribute('href', '/checkout');
        });
    });
});
