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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import OrderSummary from '@/components/order-summary';
import {
    basketWithOneItem,
    inBasketProductDetails as dressProductDetails,
} from '@/components/__mocks__/basket-with-dress';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockConfig, mockLocale } from '@/test-utils/config';

const mockSite = mockConfig.commerce.sites[0];

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const { t } = getTranslation();

        const logClick = action('cart-summary-click');
        const logHover = action('cart-summary-hover');
        const logInput = action('cart-summary-input');
        const logSubmit = action('cart-summary-submit');

        const STOP_PROPAGATION_LABELS = new Set<string>([
            t('cart:checkout.continueToCheckout'),
            t('cart:items.editCart'),
        ]);

        const isInsideHarness = (element: Element) => root.contains(element);

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label')?.trim();
            if (ariaLabel) {
                return ariaLabel;
            }

            if (element instanceof HTMLInputElement) {
                const placeholder = element.placeholder?.trim();
                if (placeholder) {
                    return placeholder;
                }
            }

            const text = element.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                for (const label of STOP_PROPAGATION_LABELS) {
                    if (text.includes(label)) {
                        return label;
                    }
                }

                if (t('cart:checkout.secure') && text.includes(t('cart:checkout.secure'))) {
                    const sanitized = text.replace(t('cart:checkout.secure'), '').trim();
                    if (sanitized) {
                        return sanitized;
                    }
                }

                return text;
            }

            const title = element.getAttribute('title')?.trim();
            return title ?? '';
        };

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            if (!start) {
                return null;
            }

            const selectors = 'button, a, [role="button"], input, textarea, select';
            const closestMatch = start.closest(selectors);
            if (closestMatch instanceof HTMLElement) {
                return closestMatch;
            }

            if (start instanceof HTMLElement && (start.getAttribute('aria-label') || start.hasAttribute('role'))) {
                return start;
            }

            if (start.parentElement) {
                return findInteractiveElement(start.parentElement);
            }

            return null;
        };

        const maybePreventNavigation = (event: Event, label: string) => {
            if (STOP_PROPAGATION_LABELS.has(label)) {
                event.preventDefault();
                event.stopImmediatePropagation?.();
            }
        };

        let lastHoverElement: HTMLElement | null = null;
        const inputLogState = new WeakMap<HTMLInputElement, boolean>();

        const handleClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (interactive instanceof HTMLButtonElement && interactive.type === 'submit') {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            maybePreventNavigation(event, label);
            logClick({ label });
        };

        const handlePointerOver = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive) || interactive === lastHoverElement) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            lastHoverElement = interactive;
            logHover({ label });
        };

        const handlePointerOut = (event: PointerEvent) => {
            if (!lastHoverElement) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || interactive !== lastHoverElement) {
                return;
            }

            const related = event.relatedTarget as Element | null;
            if (related && lastHoverElement.contains(related)) {
                return;
            }

            lastHoverElement = null;
        };

        const handleInput = (event: Event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !isInsideHarness(target)) {
                return;
            }

            const label = deriveLabel(target);
            if (!label) {
                return;
            }

            if (inputLogState.has(target)) {
                return;
            }

            inputLogState.set(target, true);
            logInput({ label });
        };

        const handleBlur = (event: FocusEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            inputLogState.delete(target);
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !isInsideHarness(form)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation?.();

            const submitter = (event.submitter as Element | null) ?? form.querySelector('[type="submit"]');
            const interactive = submitter ? findInteractiveElement(submitter) : null;
            const label = interactive ? deriveLabel(interactive) : '';

            if (label) {
                logSubmit({ label });
            }
        };

        const originalFetch = window.fetch;
        window.fetch = (async (...args) => {
            const [input] = args;
            let url = '';

            if (typeof input === 'string') {
                url = input;
            } else if (input instanceof URL) {
                url = input.toString();
            } else if (input instanceof Request) {
                url = input.url;
            }

            let pathname = '';
            try {
                pathname = new URL(url, window.location.origin).pathname;
            } catch {
                pathname = url;
            }

            if (pathname.startsWith('/action/promo-code-add') || pathname.startsWith('/action/promo-code-remove')) {
                return Promise.resolve(
                    new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                );
            }

            return originalFetch(...args);
        }) as typeof window.fetch;

        root.addEventListener('click', handleClick, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);
        root.addEventListener('input', handleInput, true);
        root.addEventListener('change', handleInput, true);
        root.addEventListener('blur', handleBlur, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            window.fetch = originalFetch;
            lastHoverElement = null;

            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('change', handleInput, true);
            root.removeEventListener('blur', handleBlur, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof OrderSummary> = {
    title: 'CART/CartSummarySection',
    component: OrderSummary,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
The CartSummarySection component renders the order summary and checkout actions for the shopping cart. It adapts its layout based on the viewport to provide an optimal user experience.

## Features

- **Order Summary**: Subtotal, shipping, tax, and estimated total breakdown
- **Promo Code Support**: Collapsible accordion for entering promo codes
- **Checkout Actions**: Secure checkout button with payment method trust signals (Visa, Mastercard, Amex, Discover)
- **Responsive**: Adapts padding for mobile and desktop viewports

## Props

- **basket**: Shopping basket data with items and totals
- **showPromoCodeForm**: Whether to display the promo code accordion
- **showCheckoutAction**: Whether to display the checkout button and payment icons
- **showCartItems**: Whether to display the cart items accordion
- **isEstimate**: Whether to show "Estimated" prefix for totals
- **productsByItemId**: Optional product details mapping for enhanced display
                `,
            },
        },
    },
    argTypes: {
        basket: {
            description: 'Shopping basket data containing items, totals, and pricing information',
            control: 'object',
            table: {
                type: { summary: 'ShopperBasketsV2.schemas["Basket"]' },
            },
        },
        showPromoCodeForm: {
            description: 'Whether to display the promo code form',
            control: 'boolean',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
        showCartItems: {
            description: 'Whether to display the cart items accordion',
            control: 'boolean',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
        showHeading: {
            description: 'Whether to display the "Order Summary" heading',
            control: 'boolean',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'true' },
            },
        },
        isEstimate: {
            description: 'Whether to show "Est." prefix for totals',
            control: 'boolean',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
        productsByItemId: {
            description: 'Optional mapping of product IDs to product details for enhanced display',
            control: 'object',
            table: {
                type: { summary: 'Record<string, ShopperProducts.schemas["Product"]>' },
                defaultValue: { summary: 'undefined' },
            },
        },
        showCheckoutAction: {
            description: 'Whether to display the checkout button and payment icons',
            control: 'boolean',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="GBP">
                    <Story />
                </SiteProvider>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock product map for single item basket
const mockProductMap = {
    '2a54fe1a10d9d9bbbeea6f205f': dressProductDetails.data[0], // Button Front Jacket
};

export const DesktopWithItems: Story = {
    args: {
        basket: {
            ...basketWithOneItem,
            productSubTotal: 75,
            productTotal: 75,
            shippingTotal: 0,
            taxTotal: 6,
            orderTotal: 81,
        },
        productsByItemId: mockProductMap,
        showCartItems: false,
        showPromoCodeForm: true,
        showCheckoutAction: true,
        isEstimate: true,
    },
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                story: `
Desktop layout with items in the cart. This demonstrates:

- Full order summary with item details and totals
- Promo code form for applying discounts
- Prominent checkout button with secure checkout icon
- Payment method icons (Visa, Mastercard, Amex, Discover)
- Desktop-optimized layout with proper spacing
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div style={{ width: 343 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test component interaction
        const buttons = canvas.queryAllByRole('button');
        const inputs = canvas.queryAllByRole('textbox');

        // Perform basic interactions
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        // Verify component renders
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};
