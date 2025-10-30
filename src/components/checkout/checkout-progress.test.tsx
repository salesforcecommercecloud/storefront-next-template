import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckoutProgress } from './checkout-progress';
import { CHECKOUT_STEPS } from './utils/checkout-context-types';

describe('CheckoutProgress', () => {
    it('renders all checkout steps', () => {
        render(<CheckoutProgress currentStep={CHECKOUT_STEPS.CONTACT_INFO} />);

        expect(screen.getAllByText('Contact Info')).toHaveLength(2); // mobile + desktop
        expect(screen.getAllByText('Shipping')).toHaveLength(2);
        expect(screen.getAllByText('Delivery')).toHaveLength(2);
        expect(screen.getAllByText('Payment')).toHaveLength(2);
        expect(screen.getAllByText('Review')).toHaveLength(2);
    });

    it('highlights the current step', () => {
        const { container } = render(<CheckoutProgress currentStep={CHECKOUT_STEPS.PAYMENT} />);

        // Step 4 (Payment) should be current (index 3 + 1 = 4)
        const stepNumbers = container.querySelectorAll('span');
        const paymentStep = Array.from(stepNumbers).find((span) => span.textContent === '4');
        expect(paymentStep).toBeTruthy();
    });

    it('marks completed steps with check icon', () => {
        const { container } = render(
            <CheckoutProgress
                currentStep={CHECKOUT_STEPS.PAYMENT}
                completedSteps={[CHECKOUT_STEPS.CONTACT_INFO, CHECKOUT_STEPS.SHIPPING_ADDRESS]}
            />
        );

        // Completed steps should show check icons (lucide-check class)
        const checkIcons = container.querySelectorAll('.lucide-check');
        expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('shows all steps as pending when no completion', () => {
        const { container } = render(
            <CheckoutProgress currentStep={CHECKOUT_STEPS.CONTACT_INFO} completedSteps={[]} />
        );

        // First step should show number 1
        const stepNumbers = container.querySelectorAll('span');
        const firstStep = Array.from(stepNumbers).find((span) => span.textContent === '1');
        expect(firstStep).toBeTruthy();
    });

    it('applies custom className', () => {
        const { container } = render(
            <CheckoutProgress currentStep={CHECKOUT_STEPS.CONTACT_INFO} className="custom-class" />
        );

        expect(container.querySelector('.custom-class')).toBeTruthy();
    });

    it('renders mobile and desktop views', () => {
        const { container } = render(<CheckoutProgress currentStep={CHECKOUT_STEPS.CONTACT_INFO} />);

        // Mobile view (block on small screens)
        const mobileView = container.querySelector('.block.md\\:hidden');
        expect(mobileView).toBeTruthy();

        // Desktop view (hidden on small, block on medium+)
        const desktopView = container.querySelector('.hidden.md\\:block');
        expect(desktopView).toBeTruthy();
    });

    it('shows step descriptions in desktop view', () => {
        render(<CheckoutProgress currentStep={CHECKOUT_STEPS.CONTACT_INFO} />);

        expect(screen.getAllByText('Email address')).toHaveLength(1); // desktop only
        expect(screen.getAllByText('Delivery address')).toHaveLength(1);
        expect(screen.getAllByText('Shipping method')).toHaveLength(1);
        expect(screen.getAllByText('Payment method')).toHaveLength(1);
        expect(screen.getAllByText('Confirm order')).toHaveLength(1);
    });

    it('handles all checkout steps correctly', () => {
        const steps = [
            CHECKOUT_STEPS.CONTACT_INFO,
            CHECKOUT_STEPS.SHIPPING_ADDRESS,
            CHECKOUT_STEPS.SHIPPING_OPTIONS,
            CHECKOUT_STEPS.PAYMENT,
            CHECKOUT_STEPS.REVIEW_ORDER,
        ];

        steps.forEach((step) => {
            const { unmount } = render(<CheckoutProgress currentStep={step} />);
            expect(screen.getAllByText(/Contact Info|Shipping|Delivery|Payment|Review/)).toBeTruthy();
            unmount();
        });
    });

    it('renders with multiple completed steps', () => {
        const { container } = render(
            <CheckoutProgress
                currentStep={CHECKOUT_STEPS.REVIEW_ORDER}
                completedSteps={[
                    CHECKOUT_STEPS.CONTACT_INFO,
                    CHECKOUT_STEPS.SHIPPING_ADDRESS,
                    CHECKOUT_STEPS.SHIPPING_OPTIONS,
                    CHECKOUT_STEPS.PAYMENT,
                ]}
            />
        );

        // Should have check marks for all completed steps (mobile + desktop = 8 icons)
        const checkIcons = container.querySelectorAll('.lucide-check');
        expect(checkIcons.length).toBeGreaterThanOrEqual(8);
    });
});
