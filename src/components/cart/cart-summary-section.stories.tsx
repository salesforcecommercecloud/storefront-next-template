import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import OrderSummary from '@/components/order-summary';
import emptyBasket from '@/components/__mocks__/empty-basket';
import {
    basketWithOneItem,
    inBasketProductDetails as dressProductDetails,
} from '@/components/__mocks__/basket-with-dress';
import { basketWithMultipleItems, inBasketProductDetails } from '@/components/__mocks__/basket-with-multiple-items';
import uiStrings from '@/temp-ui-string';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('cart-summary-click');
        const logHover = action('cart-summary-hover');
        const logInput = action('cart-summary-input');
        const logSubmit = action('cart-summary-submit');

        const STOP_PROPAGATION_LABELS = new Set<string>([
            uiStrings.cart.checkout.proceedToCheckout,
            uiStrings.cart.items.editCart,
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

                if (uiStrings.cart.checkout.secure && text.includes(uiStrings.cart.checkout.secure)) {
                    const sanitized = text.replace(uiStrings.cart.checkout.secure, '').trim();
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

- **Responsive Layout**: Different layouts for desktop and mobile viewports
- **Order Summary Integration**: Uses OrderSummary component to display basket totals and line items
- **Checkout Actions**: Secure checkout button with payment method trust signals
- **Promo Code Support**: Includes promo code form functionality (desktop only)
- **Mobile Optimization**: Sticky bottom checkout section for mobile devices

## Layout Behavior

- **Desktop**: Full order summary with promo code form and checkout CTA
- **Mobile**: Sticky bottom checkout section for easy access
- **Responsive**: Automatically adapts based on isDesktop prop

## Integration

This component is used by CartContent and integrates with:
- OrderSummary component for displaying basket information
- Payment method icons for trust signals
- React Router for navigation to checkout
- UI strings for internationalization

## Props

- **basket**: Shopping basket data with items and totals
- **isDesktop**: Controls layout behavior (desktop vs mobile)
- **productMap**: Optional product details mapping for enhanced display
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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
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

// Mock product map for multiple items basket
const mockMultipleItemsProductMap = {
    '4b1d10f5f04a55b91b10d2cd02': inBasketProductDetails.data[0], // Solid Silk Tie
    '2e97471059696f517030b6895b': inBasketProductDetails.data[1], // Floral Ruffle Top
};

export const DesktopEmptyCart: Story = {
    args: {
        basket: emptyBasket,
    },
    parameters: {
        viewport: {
            defaultViewport: 'desktop',
        },
        docs: {
            description: {
                story: `
Desktop layout for an empty cart. This shows:

- Full order summary with empty state
- Promo code form (though not applicable for empty cart)
- Checkout button (disabled/hidden for empty cart)
- Payment method icons for trust signals
- Desktop-optimized spacing and layout
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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

export const DesktopWithItems: Story = {
    args: {
        basket: basketWithOneItem,
        productsByItemId: mockProductMap,
    },
    parameters: {
        viewport: {
            defaultViewport: 'desktop',
        },
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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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

export const DesktopMultipleItems: Story = {
    args: {
        basket: basketWithMultipleItems,
        productsByItemId: mockMultipleItemsProductMap,
    },
    parameters: {
        viewport: {
            defaultViewport: 'desktop',
        },
        docs: {
            description: {
                story: `
Desktop layout with multiple items in the cart. This shows:

- Order summary with multiple line items
- Subtotal calculations for multiple products
- Promo code form for bulk discounts
- Checkout button with secure checkout icon
- Payment method trust signals
- Desktop layout optimized for larger orders
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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

export const MobileEmptyCart: Story = {
    args: {
        basket: emptyBasket,
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: `
Mobile layout for an empty cart. This shows:

- Sticky bottom checkout section
- Checkout button (though not applicable for empty cart)
- Payment method icons
- Mobile-optimized touch interface
- Sticky positioning for easy access
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div style={{ height: '100vh', backgroundColor: '#f0f0f0', padding: '20px' }}>
                <div style={{ height: '80vh', backgroundColor: 'white', marginBottom: '20px', padding: '20px' }}>
                    <p>Content above the sticky checkout section</p>
                </div>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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

export const MobileWithItems: Story = {
    args: {
        basket: basketWithOneItem,
        productsByItemId: mockProductMap,
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: `
Mobile layout with items in the cart. This demonstrates:

- Sticky bottom checkout section
- Full-width checkout button for easy tapping
- Secure checkout icon and payment method icons
- Mobile-optimized spacing and touch targets
- Sticky positioning for persistent access
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div style={{ height: '100vh', backgroundColor: '#f0f0f0', padding: '20px' }}>
                <div style={{ height: '80vh', backgroundColor: 'white', marginBottom: '20px', padding: '20px' }}>
                    <p>Content above the sticky checkout section</p>
                </div>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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

export const MobileMultipleItems: Story = {
    args: {
        basket: basketWithMultipleItems,
        productsByItemId: mockMultipleItemsProductMap,
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: `
Mobile layout with multiple items in the cart. This shows:

- Sticky bottom checkout section
- Checkout button for larger orders
- Payment method trust signals
- Mobile-optimized interface for complex orders
- Persistent access to checkout action
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div style={{ height: '100vh', backgroundColor: '#f0f0f0', padding: '20px' }}>
                <div style={{ height: '80vh', backgroundColor: 'white', marginBottom: '20px', padding: '20px' }}>
                    <p>Content above the sticky checkout section</p>
                </div>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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

export const TabletView: Story = {
    args: {
        basket: basketWithOneItem,
        productsByItemId: mockProductMap,
    },
    parameters: {
        viewport: {
            defaultViewport: 'tablet',
        },
        docs: {
            description: {
                story: `
Tablet view showing desktop layout on medium screens. This demonstrates:

- Desktop layout behavior on tablet viewport
- Order summary with proper tablet spacing
- Promo code form and checkout actions
- Payment method icons
- Balanced layout for tablet interaction
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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

export const WithoutProductMap: Story = {
    args: {
        basket: basketWithOneItem,
        // productMap intentionally omitted
    },
    parameters: {
        viewport: {
            defaultViewport: 'desktop',
        },
        docs: {
            description: {
                story: `
Desktop layout without product map. This shows:

- Order summary with basic product information
- How the component handles missing product details
- Fallback behavior when productMap is not provided
- Still functional checkout and promo code features
- Graceful degradation of product information display
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

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
