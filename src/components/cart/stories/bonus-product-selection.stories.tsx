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
import BonusProductSelection from '../bonus-product-selection';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent, waitFor } from 'storybook/test';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

const BONUS_HARNESS_ATTR = 'data-bonus-product-harness';

// Default product images from Commerce Cloud demo catalog
const PRODUCT_IMAGES = [
    'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw68c99706/images/small/PG.52001RUBN4Q.BLACKFB.PZ.jpg',
    'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa7d1fa0b/images/small/PG.33330DAN84Q.CHARCWL.BZ.jpg',
    'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1a6e0e2a/images/small/PG.33698RUBN4Q.CHARCWL.PZ.jpg',
];

// Mock data factories
function createMockProduct(
    overrides: Partial<ShopperProducts.schemas['Product']> = {},
    imageIndex = 0
): ShopperProducts.schemas['Product'] {
    const image = PRODUCT_IMAGES[imageIndex % PRODUCT_IMAGES.length];
    return {
        id: 'product-1',
        name: 'Test Product',
        price: 29.0,
        imageGroups: [
            {
                viewType: 'large',
                images: [{ link: image, alt: 'Product Image' }],
            },
        ],
        ...overrides,
    };
}

function createMockBonusDiscountLineItem(
    overrides: Partial<ShopperBasketsV2.schemas['BonusDiscountLineItem']> = {}
): ShopperBasketsV2.schemas['BonusDiscountLineItem'] {
    return {
        id: 'bdli-1',
        promotionId: 'promo-1',
        maxBonusItems: 3,
        bonusProducts: [
            { productId: 'product-1', productName: 'Test Product 1' },
            { productId: 'product-2', productName: 'Test Product 2' },
            { productId: 'product-3', productName: 'Test Product 3' },
        ],
        ...overrides,
    };
}

function createMockBasket(
    overrides: Partial<ShopperBasketsV2.schemas['Basket']> = {}
): ShopperBasketsV2.schemas['Basket'] {
    return {
        basketId: 'basket-1',
        productItems: [],
        bonusDiscountLineItems: [],
        ...overrides,
    };
}

function createMockBonusProductsById(): Record<string, ShopperProducts.schemas['Product']> {
    return {
        'product-1': createMockProduct({ id: 'product-1', name: 'Classic Silk Tie - Navy', price: 29.0 }, 0),
        'product-2': createMockProduct({ id: 'product-2', name: 'Classic Silk Tie - Red', price: 35.0 }, 1),
        'product-3': createMockProduct({ id: 'product-3', name: 'Classic Silk Tie - Black', price: 42.0 }, 2),
    };
}

function BonusProductStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('bonus-product-clicked'), []);
    const logSelect = useMemo(() => action('bonus-product-selected'), []);
    const logHover = useMemo(() => action('bonus-product-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${BONUS_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (!label) {
                return;
            }

            // Check if it's the select button
            if (label.toLowerCase().includes('select')) {
                const article = button.closest('article');
                const productId = article?.getAttribute('aria-label') || 'unknown';
                logSelect({ productId, label });
            } else {
                logClick({ label });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button, article');
            if (!button || !isInsideHarness(button)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && button.contains(related)) {
                return;
            }
            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (!label) {
                return;
            }
            logHover({ label });
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logClick, logSelect, logHover]);

    return (
        <div ref={containerRef} {...{ [BONUS_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof BonusProductSelection> = {
    title: 'CART/Bonus Product Selection',
    component: BonusProductSelection,
    tags: ['autodocs', 'interaction'],
    args: (() => {
        const bonusDiscountLineItem = createMockBonusDiscountLineItem();
        return {
            bonusDiscountLineItem,
            bonusProductsById: createMockBonusProductsById(),
            basket: createMockBasket({
                bonusDiscountLineItems: [bonusDiscountLineItem],
            }),
            promotionName: 'Buy one Classic Fit Shirt and get one free tie',
            onProductSelect: action('product-selected'),
        };
    })(),
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A bonus product selection component that displays eligible bonus products in a carousel. Users can select bonus products to add to their cart.

## Features

- **Product Carousel**: Horizontal scrolling carousel of bonus products
- **Product Cards**: Individual cards showing product image, title, and "Free" badge
- **Select Button**: Action button to select a bonus product
- **Visual Feedback**: Clear indication of selected products

## Usage

The BonusProductSelection component is used in:
- Shopping cart pages
- Checkout flows
- Promotional sections
- Bundle product displays

\`\`\`tsx
import BonusProductSelection from '../bonus-product-selection';

function CartPage() {
  return (
    <div>
      <CartContent />
      <BonusProductSelection />
    </div>
  );
}
\`\`\`

## Structure

- **Title**: Promotion name with selection count
- **Carousel**: Horizontal scrolling product list
- **Product Cards**: Individual product displays with images
- **Select Buttons**: Action buttons for each product
- **Badge**: "Free" badge indicator

## Note

This component currently uses dev-only mocks for visual testing. In production, it should integrate with bonus product actions API/state.
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <div className="max-w-[465px]">
                        <BonusProductStoryHarness>
                            <Story {...(context.args as Record<string, unknown>)} />
                        </BonusProductStoryHarness>
                    </div>
                );

                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/cart',
                            element: content,
                        },
                    ],
                    { initialEntries: ['/cart'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `
The default BonusProductSelection shows all available bonus products:

### Features:
- **Title with selection count**: Shows promotion name and how many items selected
- **Product carousel**: Horizontal scrolling list of products
- **Product cards**: Each product in its own card
- **Select buttons**: Action buttons for each product
- **Free badges**: "Free" badge on each product

### Use Cases:
- Cart page bonus product selection
- Promotional product offers
- Bundle product displays
- Free item promotions
                `,
            },
        },
    },
};

export const WithCarouselNavigation: Story = {
    args: (() => {
        const prices = [29.0, 35.0, 42.0, 25.0, 39.0, 31.0, 45.0, 28.0];
        const bonusDiscountLineItem = createMockBonusDiscountLineItem({
            maxBonusItems: 8,
            bonusProducts: Array.from({ length: 8 }, (_, i) => ({
                productId: `product-${i + 1}`,
                productName: `Classic Silk Tie ${i + 1}`,
            })),
        });
        return {
            bonusDiscountLineItem,
            bonusProductsById: Object.fromEntries(
                Array.from({ length: 8 }, (_, i) => [
                    `product-${i + 1}`,
                    createMockProduct(
                        {
                            id: `product-${i + 1}`,
                            name: `Classic Silk Tie ${i + 1}`,
                            price: prices[i],
                        },
                        i
                    ),
                ])
            ),
            basket: createMockBasket({
                bonusDiscountLineItems: [bonusDiscountLineItem],
            }),
        };
    })(),
    parameters: {
        docs: {
            description: {
                story: `
BonusProductSelection demonstrating carousel navigation:

### Carousel Features:
- **Previous/Next buttons**: Navigation controls for carousel
- **Multiple products**: More products than visible at once
- **Smooth scrolling**: Horizontal scrolling through products
- **Product visibility**: Only some products visible at a time

### Use Cases:
- Many bonus products
- Horizontal scrolling
- Carousel navigation
- Product browsing
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const nextButton = await canvas.findByRole('button', { name: /next slide/i });
        const prevButton = await canvas.findByRole('button', { name: /previous slide/i });

        // Wait for the Embla carousel to initialize and enable navigation
        await waitFor(() => {
            expect(nextButton).toBeEnabled();
        });

        await userEvent.click(nextButton);
        await userEvent.click(prevButton);

        const selectButtons = await canvas.findAllByRole('button', { name: /select/i });
        await expect(selectButtons.length).toBeGreaterThan(0);
        await userEvent.click(selectButtons[0]);
    },
};

export const CombinedProducts: Story = {
    args: (() => {
        const bonusDiscountLineItem = createMockBonusDiscountLineItem({
            bonusProducts: [
                { productId: 'product-1', productName: 'List-Based Product 1' },
                { productId: 'product-4', productName: 'List-Based Product 4' },
            ],
        });
        return {
            bonusDiscountLineItem,
            bonusProductsById: {
                'product-1': createMockProduct({ id: 'product-1', name: 'List-Based Product 1', price: 29.0 }, 0),
                'product-2': createMockProduct({ id: 'product-2', name: 'Duplicate Product', price: 35.0 }, 1),
                'product-4': createMockProduct({ id: 'product-4', name: 'List-Based Product 4', price: 42.0 }, 2),
            },
            basket: createMockBasket({
                bonusDiscountLineItems: [bonusDiscountLineItem],
            }),
            promotionName: 'Combined List and Rule-Based Products',
            onProductSelect: action('product-selected'),
        };
    })(),
    parameters: {
        docs: {
            description: {
                story: `
BonusProductSelection demonstrating combined list-based and rule-based products:

### Combined Features:
- **List-based products**: Products from the bonusProducts array
- **Rule-based products**: Would be fetched based on promotion rules (simulated here)
- **Deduplication**: Duplicate products are automatically filtered out
- **Single carousel**: Both types shown in one unified list

### Use Cases:
- Promotions with both static and dynamic product selection
- Mixed offer types
- Complex product rules with fallbacks
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test title is present
        const title = await canvas.findByText(/Combined List and Rule-Based/i);
        await expect(title).toBeInTheDocument();

        // Verify products are shown (list-based in this case, rule-based would be added in real usage)
        const selectButtons = await canvas.findAllByRole('button', { name: /select/i });
        await expect(selectButtons.length).toBeGreaterThan(0);
    },
};
