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
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import CartSkeleton from '../../cart/cart-skeleton';

const CART_HARNESS_ATTR = 'data-cart-skeleton-harness';

function CartSkeletonHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('cart-skeleton-click'), []);
    const logHover = useMemo(() => action('cart-skeleton-hover'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${CART_HARNESS_ATTR}]`));

        const getLabel = (element: HTMLElement) =>
            element.getAttribute('aria-label') || element.getAttribute('data-testid') || element.tagName.toLowerCase();

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const element = target.closest('[data-testid], [aria-label], button, input, a');
            if (!element || !(element instanceof HTMLElement) || !isInsideHarness(element)) {
                return;
            }
            const label = getLabel(element);
            if (!label) return;
            logClick({ label });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const element = target.closest('[data-testid], [aria-label], button, input, a');
            if (!element || !(element instanceof HTMLElement) || !isInsideHarness(element)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && element.contains(related)) {
                return;
            }
            const label = getLabel(element);
            if (!label) return;
            logHover({ label });
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logClick, logHover]);

    return (
        <div ref={containerRef} {...{ [CART_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof CartSkeleton> = {
    title: 'CART/CartSkeleton',
    component: CartSkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
The CartSkeleton component provides a loading state for the cart page while cart data is being fetched. It displays skeleton placeholders that match the structure and layout of the actual cart components.

## Features

- **Complete Cart Layout**: Skeleton for the entire cart page structure
- **Product Item Skeletons**: Loading placeholders for individual cart items
- **Order Summary Skeleton**: Loading placeholder for cart totals and summary
- **Checkout CTA Skeleton**: Loading placeholder for checkout button and payment icons
- **Responsive Design**: Adapts skeleton layout for different screen sizes
- **Mobile Optimization**: Includes mobile sticky checkout skeleton
- **Accessibility**: Proper semantic structure with loading indicators

## Skeleton Components

### ProductItemSkeleton
- Product image placeholder (16x16 on mobile, 20x20 on desktop)
- Product name and attributes placeholders
- Price placeholder (responsive positioning)
- Card-based layout matching actual product items

### OrderSummarySkeleton
- Order summary title placeholder
- Cart items accordion placeholder
- Subtotal, shipping, and tax line item placeholders
- Promo code form placeholder
- Total amount placeholder

### CartCtaSkeleton
- Checkout button placeholder
- Payment method icons placeholders (4 credit card icons)
- Responsive sizing and positioning

## Layout Structure

- **Desktop**: Two-column grid with items on left, summary on right
- **Mobile**: Single column with sticky bottom checkout section
- **Responsive**: Adapts skeleton dimensions for different viewports
- **Consistent**: Matches actual cart component dimensions and spacing

## Usage

This skeleton is displayed while:
- Cart data is being fetched from the API
- User navigates to the cart page
- Cart items are being loaded or updated
- Any cart-related data operations are in progress

## Props

This component doesn't accept any props as it's a static loading state that doesn't depend on external data.
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <CartSkeletonHarness>
                <Story />
            </CartSkeletonHarness>
        ),
    ],
};

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Default cart skeleton loading state. This shows:

- Complete cart page skeleton layout
- Product item skeleton with image, name, and price placeholders
- Order summary skeleton with totals and promo code form
- Checkout button and payment icons skeletons
- Desktop two-column layout
- Proper spacing and card-based structure
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export const MobileView: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton on mobile devices. This demonstrates:

- Single column layout for mobile screens
- Smaller product image skeletons (16x16)
- Mobile-optimized spacing and typography
- Sticky bottom checkout section skeleton
- Touch-friendly skeleton dimensions
- Mobile-specific responsive behavior
                `,
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton on tablet devices. This shows:

- Medium screen layout optimization
- Balanced skeleton dimensions
- Tablet-appropriate spacing
- Two-column layout on larger tablets
- Responsive skeleton sizing
- Optimal tablet viewing experience
                `,
            },
        },
    },
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export const DesktopView: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton on desktop devices. This demonstrates:

- Full desktop layout with two-column grid
- Larger product image skeletons (20x20)
- Desktop-optimized spacing and typography
- Hidden mobile checkout section
- Desktop checkout CTA in sidebar
- Optimal desktop viewing experience
                `,
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export const WithCustomBackground: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton with custom background styling. This shows:

- How the skeleton adapts to different background colors
- Skeleton visibility on various backgrounds
- Proper contrast and readability
- Background color customization options
- Visual consistency across themes
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export const WithDarkBackground: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton on dark background. This demonstrates:

- Skeleton visibility on dark backgrounds
- Proper contrast for dark themes
- Dark mode compatibility
- Visual consistency in dark environments
- Accessibility considerations for dark themes
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export const LoadingState: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton in loading state context. This shows:

- How the skeleton appears during data fetching
- Loading state user experience
- Skeleton animation and behavior
- Transition from skeleton to actual content
- Loading state best practices
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div style={{ position: 'relative' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        background: '#0056b3',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        zIndex: 10,
                    }}>
                    Loading cart data...
                </div>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export const AccessibilityDemo: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton with accessibility considerations. This demonstrates:

- Proper semantic structure for screen readers
- Loading state announcements
- Keyboard navigation support
- ARIA labels and roles
- Accessibility best practices for loading states
- Screen reader compatibility
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div>
                <div
                    role="status"
                    aria-label="Loading cart contents"
                    style={{
                        position: 'absolute',
                        left: '-10000px',
                        width: '1px',
                        height: '1px',
                        overflow: 'hidden',
                    }}>
                    Loading cart contents, please wait...
                </div>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export const PerformanceDemo: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Cart skeleton performance demonstration. This shows:

- Fast rendering of skeleton components
- Minimal layout shift during loading
- Efficient skeleton animations
- Performance benefits of skeleton loading
- User experience improvements
- Loading state optimization
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <div>
                <div
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#1e7e34',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        zIndex: 10,
                    }}>
                    ⚡ Fast Loading
                </div>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
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

export default meta;
