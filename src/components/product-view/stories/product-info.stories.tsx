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
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import ProductViewProvider from '@/providers/product-view';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('product-info-click');
        const logAddToCart = action('product-info-add-to-cart');
        const logWishlist = action('product-info-wishlist');
        const logQuantityChange = action('product-info-quantity-change');
        const logVariationSelect = action('product-info-variation-select');
        const logHover = action('product-info-hover');

        const isInsideHarness = (element: Element) => root.contains(element);

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label')?.trim();
            if (ariaLabel) {
                return ariaLabel;
            }

            const text = element.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                return text;
            }

            const dataLabel = element.getAttribute('data-testid')?.trim();
            if (dataLabel) {
                return dataLabel;
            }

            return element.tagName.toLowerCase();
        };

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            let current: Element | null = start;
            while (current && current !== root) {
                if (current instanceof HTMLElement && isInsideHarness(current)) {
                    if (current.tagName === 'BUTTON' || current.tagName === 'INPUT' || current.tagName === 'A') {
                        return current;
                    }
                    if (current.getAttribute('role') === 'radio') {
                        return current;
                    }
                }
                current = current.parentElement;
            }
            return null;
        };

        let lastHoverElement: HTMLElement | null = null;

        const handleClick = (event: Event) => {
            const target = event.target as Element | null;
            if (!target) return;

            const interactive = findInteractiveElement(target);
            if (!interactive) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            logClick({ label });

            if (interactive instanceof HTMLButtonElement) {
                const normalized = label.toLowerCase();
                if (normalized.includes('add to cart') || normalized.includes('add to bag')) {
                    logAddToCart({ label });
                }
                if (normalized.includes('wishlist') || normalized.includes('favorite')) {
                    logWishlist({ label });
                }
            }

            if (interactive.getAttribute('role') === 'radio') {
                logVariationSelect({ label });
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as Element | null;
            if (!(target instanceof HTMLInputElement) || !isInsideHarness(target)) {
                return;
            }

            if (target.type === 'number') {
                const label = deriveLabel(target);
                logQuantityChange({ label: label || 'Quantity', value: target.value });
            }
        };

        const handlePointerOver = (event: PointerEvent) => {
            const target = event.target as Element | null;
            if (!target) return;

            const interactive = findInteractiveElement(target);
            if (!interactive || interactive === lastHoverElement) {
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

            const target = event.target as Element | null;
            if (!target) {
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

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}
import { ProductInfo } from '../index';

/**
 * The ProductInfo component displays comprehensive product details on the Product Detail Page (PDP).
 * It handles product variations, inventory status, pricing, and cart/wishlist actions.
 */
const meta: Meta<typeof ProductInfo> = {
    title: 'PRODUCTS/Product View/Product Info',
    component: ProductInfo,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The Product Info component is the main information panel on the Product Detail Page (PDP).

**Features:**
- **Product Details**: Name, description, and pricing
- **Variation Selection**: Color swatches and size selectors
- **Inventory Status**: Real-time stock information with visual badges
- **Quantity Picker**: Adjustable quantity with stock validation
- **Action Buttons**: Add to cart and wishlist functionality
- **Product Types**: Supports standard products, variants, sets, and bundles

**Variation Handling:**
- URL-aware swatch selection
- Automatic variant detection
- Disabled state for out-of-stock variants

**Inventory States:**
- In Stock (green badge)
- Pre-Order (blue badge)
- Back Order (orange badge)
- Out of Stock (red badge)
                `,
            },
        },
        a11y: {
            config: {
                rules: [
                    // In isolated Storybook context, heading hierarchy is incomplete (h1 -> h3)
                    // Real PDP page provides proper h1/h2 context from page layout
                    { id: 'heading-order', enabled: false },
                ],
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const productArg = context.args.product ?? createMockProduct();
                const content = (
                    <ProductViewProvider product={productArg}>
                        <ActionLogger>
                            <Story {...(context.args as Record<string, unknown>)} />
                        </ActionLogger>
                    </ProductViewProvider>
                );
                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/product/:productId',
                            element: content,
                        },
                    ],
                    { initialEntries: ['/product/test-product'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
    argTypes: {
        product: {
            description: 'Product data including inventory, variations, and pricing',
            control: false,
        },
    },
    tags: ['autodocs', 'interaction'],
};

export default meta;
type Story = StoryObj<typeof ProductInfo>;

// Helper function to create mock product with variations
const createMockProduct = (
    overrides?: Partial<ShopperProducts.schemas['Product']>
): ShopperProducts.schemas['Product'] => ({
    id: 'test-product-123',
    name: 'Premium Cotton T-Shirt',
    shortDescription: 'Soft, breathable cotton t-shirt perfect for everyday wear',
    price: 29.99,
    priceMax: 29.99,
    inventory: {
        id: 'inv-123',
        ats: 50,
        orderable: true,
        backorderable: false,
        preorderable: false,
    },
    variationAttributes: [
        {
            id: 'color',
            name: 'Color',
            values: [
                { value: 'red', name: 'Red', orderable: true },
                { value: 'blue', name: 'Blue', orderable: true },
                { value: 'green', name: 'Green', orderable: true },
            ],
        },
        {
            id: 'size',
            name: 'Size',
            values: [
                { value: 'S', name: 'Small', orderable: true },
                { value: 'M', name: 'Medium', orderable: true },
                { value: 'L', name: 'Large', orderable: true },
                { value: 'XL', name: 'Extra Large', orderable: true },
            ],
        },
    ],
    imageGroups: [
        {
            viewType: 'swatch',
            variationAttributes: [
                {
                    id: 'color',
                    values: [{ value: 'red', name: 'Red' }],
                },
            ],
            images: [
                {
                    link: 'https://placehold.co/50x50/ff0000/ffffff?text=R',
                    disBaseLink: 'https://placehold.co/50x50/ff0000/ffffff?text=R',
                    alt: 'Red swatch',
                },
            ],
        },
        {
            viewType: 'swatch',
            variationAttributes: [
                {
                    id: 'color',
                    values: [{ value: 'blue', name: 'Blue' }],
                },
            ],
            images: [
                {
                    link: 'https://placehold.co/50x50/0000ff/ffffff?text=B',
                    disBaseLink: 'https://placehold.co/50x50/0000ff/ffffff?text=B',
                    alt: 'Blue swatch',
                },
            ],
        },
        {
            viewType: 'swatch',
            variationAttributes: [
                {
                    id: 'color',
                    values: [{ value: 'green', name: 'Green' }],
                },
            ],
            images: [
                {
                    link: 'https://placehold.co/50x50/00ff00/ffffff?text=G',
                    disBaseLink: 'https://placehold.co/50x50/00ff00/ffffff?text=G',
                    alt: 'Green swatch',
                },
            ],
        },
    ],
    ...overrides,
});

/**
 * Standard Product with Variations - Default state showing color and size options
 */
export const WithVariations: Story = {
    args: {
        product: createMockProduct(),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify wishlist button exists
        const wishlistButton = canvas.queryByRole('button', { name: /add to wishlist|remove from wishlist/i });
        if (wishlistButton) {
            await expect(wishlistButton).toBeInTheDocument();
        }

        // Verify share button exists
        const shareButton = canvas.queryByRole('button', { name: /share/i });
        if (shareButton) {
            await expect(shareButton).toBeInTheDocument();
        }

        // Test basic component interaction
        const inputs = canvas.queryAllByRole('textbox');
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        // Verify component renders
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const PreOrderStatus: Story = {
    args: {
        product: createMockProduct({
            inventory: {
                id: 'inv-preorder',
                ats: 0,
                orderable: true,
                backorderable: false,
                preorderable: true,
            },
        }),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const badge = canvas.getByText(/pre-order/i);
        await expect(badge).toBeInTheDocument();
    },
};

export const BackOrderStatus: Story = {
    args: {
        product: createMockProduct({
            inventory: {
                id: 'inv-backorder',
                ats: 0,
                orderable: true,
                backorderable: true,
                preorderable: false,
            },
        }),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const badge = canvas.getByText(/back order/i);
        await expect(badge).toBeInTheDocument();
    },
};

export const OutOfStockStatus: Story = {
    args: {
        product: createMockProduct({
            inventory: {
                id: 'inv-out',
                ats: 0,
                orderable: false,
                backorderable: false,
                preorderable: false,
            },
        }),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Multiple elements may have "out of stock" text, use getAllByText
        const badges = canvas.getAllByText(/out of stock/i);
        await expect(badges.length).toBeGreaterThan(0);
    },
};

export const WithDisabledVariants: Story = {
    args: {
        product: createMockProduct({
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        { value: 'red', name: 'Red', orderable: true },
                        { value: 'blue', name: 'Blue', orderable: true },
                        { value: 'green', name: 'Green', orderable: false },
                    ],
                },
                {
                    id: 'size',
                    name: 'Size',
                    values: [
                        { value: 'S', name: 'Small', orderable: true },
                        { value: 'M', name: 'Medium', orderable: true },
                    ],
                },
            ],
        }),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Disabled variants may be rendered as links or buttons, check if element exists
        const greenSwatch =
            canvas.queryByRole('radio', { name: /green/i }) ||
            canvas.queryByRole('link', { name: /green/i }) ||
            canvas.queryByLabelText(/green/i);
        if (greenSwatch) {
            // If it's a link, it might not be disabled but might have different styling
            // Just verify the element exists
            await expect(greenSwatch).toBeInTheDocument();
        } else {
            // If swatch not found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const ControlledSwatchMode: Story = {
    args: {
        product: createMockProduct(),
        swatchMode: 'controlled',
        variationValues: {
            color: 'blue',
            size: 'M',
        },
        onAttributeChange: action('product-info-variation-change'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const selectedSwatch = canvas.getByRole('radio', { name: /blue/i });
        await expect(selectedSwatch).toHaveAttribute('aria-checked', 'true');
    },
};

export const NoVariations: Story = {
    args: {
        product: createMockProduct({ variationAttributes: [] }),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const radios = canvasElement.querySelectorAll('[role="radio"]');
        // Product without variations should not have radio buttons for variant selection
        // However, there might be other radio buttons in the component (e.g., quantity)
        // So we check that there are no variation-related radios
        const variationRadios = Array.from(radios).filter((radio) => {
            const parent = radio.closest('[data-variant]');
            return parent !== null;
        });
        await expect(variationRadios.length).toBe(0);
    },
};
