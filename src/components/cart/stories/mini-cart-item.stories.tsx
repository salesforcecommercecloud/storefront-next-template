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
import MiniCartItem from '../mini-cart-item';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent, waitFor } from 'storybook/test';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { Check, ShoppingCart, Store, Truck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { mockConfig } from '@/test-utils/config';
import CartTitle from '../cart-title';

function MiniCartItemStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRemove = action('remove-item');
        const logQuantityChange = action('quantity-change');
        const logCustomInput = action('custom-quantity-input');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const removeButton = target.closest('button[aria-label*="Remove"]');
            if (removeButton) {
                event.preventDefault();
                logRemove({});
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            if (target instanceof HTMLSelectElement) {
                const value = target.value;
                logQuantityChange({ value });
            }

            if (target instanceof HTMLInputElement && target.type === 'number') {
                const value = target.value;
                logCustomInput({ value });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

/**
 * Free shipping progress bar for story shell
 */
function FreeShippingBar({ currentTotal, threshold = 60 }: { currentTotal: number; threshold?: number }): ReactElement {
    const remaining = Math.max(threshold - currentTotal, 0);
    const percentage = Math.min((currentTotal / threshold) * 100, 100);
    const isUnlocked = currentTotal >= threshold;

    if (isUnlocked) {
        return (
            <>
                <Separator />
                <div className="bg-muted/50 px-6 py-6">
                    <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-green-700 shrink-0" />
                        <span className="text-sm font-medium text-green-700">You&apos;ve unlocked Free Shipping!</span>
                    </div>
                </div>
                <Separator />
            </>
        );
    }

    return (
        <>
            <Separator />
            <div className="bg-muted/50 px-6 py-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">
                        You are <span className="font-bold">${remaining.toFixed(2)}</span> away from{' '}
                        <span className="text-primary font-bold">Free Shipping</span>
                    </span>
                </div>
                <div className="w-full bg-background rounded-full h-2 mb-1">
                    <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                        role="progressbar"
                        aria-label="Free shipping progress"
                        aria-valuenow={currentTotal}
                        aria-valuemin={0}
                        aria-valuemax={threshold}
                    />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${currentTotal.toFixed(2)}</span>
                    <span>${threshold.toFixed(2)}</span>
                </div>
            </div>
            <Separator />
        </>
    );
}

const completeTheLookProducts = [
    {
        id: 'rec-1',
        name: 'Soft Sphere',
        brand: 'Salesforce Foundations',
        price: '$29.00',
        image: 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw68c99706/images/small/PG.52001RUBN4Q.BLACKFB.PZ.jpg',
        isNew: true,
    },
    {
        id: 'rec-2',
        name: 'Solid Cylinder',
        brand: 'Salesforce Foundations',
        price: '$35.00',
        image: 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa7d1fa0b/images/small/PG.33330DAN84Q.CHARCWL.BZ.jpg',
        isNew: false,
    },
    {
        id: 'rec-3',
        name: 'Modern Cube',
        brand: 'Salesforce Foundations',
        price: '$42.00',
        image: 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1a6e0e2a/images/small/PG.33698RUBN4Q.CHARCWL.PZ.jpg',
        isNew: true,
    },
];

/**
 * Complete the Look section for story shell
 */
function CompleteTheLook(): ReactElement {
    return (
        <div className="py-4">
            <h3 className="text-lg font-semibold text-foreground mb-1">Complete the look</h3>
            <p className="text-sm text-muted-foreground mb-4">Description</p>
            <Carousel opts={{ align: 'start' }} className="w-full">
                <CarouselContent className="-ml-4">
                    {completeTheLookProducts.map((product) => (
                        <CarouselItem key={product.id} className="pl-4 basis-[180px] min-w-0 shrink-0 grow-0">
                            <div className="border border-border rounded-none overflow-hidden">
                                <div className="relative aspect-square bg-muted">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {product.isNew && (
                                        <span className="absolute top-2 left-2 bg-green-500 text-white px-2 py-0.5 text-xs font-semibold uppercase rounded-md">
                                            NEW
                                        </span>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                                    <h4 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                                        {product.name}
                                    </h4>
                                    <p className="text-sm font-semibold text-foreground mb-3">{product.price}</p>
                                    <Button size="sm" className="w-full text-sm py-2">
                                        Add to Cart
                                    </Button>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselNext className="right-0 top-1/2 -translate-y-1/2 size-9 rounded-lg shadow-md border-border" />
            </Carousel>
        </div>
    );
}

/**
 * Reusable mini cart shell wrapper that adds "My Cart" header with close button
 */
function MiniCartShell({
    children,
    itemCount = 1,
    showFreeShipping = true,
    showCompleteTheLook = true,
    showFooter = true,
    currentTotal = 59,
}: {
    children: ReactNode;
    itemCount?: number;
    showFreeShipping?: boolean;
    showCompleteTheLook?: boolean;
    showFooter?: boolean;
    currentTotal?: number;
}): ReactElement {
    return (
        <div className="w-full max-w-md h-full bg-background shadow-xl flex flex-col rounded-lg overflow-hidden">
            {/* Header - sticky */}
            <div className="flex-shrink-0 border-b border-border">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                    <div className="[&_h1]:my-0 truncate pr-2">
                        <CartTitle
                            basket={{
                                productItems: Array.from({ length: itemCount }, (_, i) => ({
                                    itemId: `item-${i}`,
                                    quantity: 1,
                                })),
                            }}
                            deliveryCount={itemCount}
                        />
                    </div>
                    <button
                        className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Close cart">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {/* Free shipping - sticky */}
            {showFreeShipping && (
                <div className="flex-shrink-0 border-b border-border">
                    <FreeShippingBar currentTotal={currentTotal} />
                </div>
            )}
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="pt-4 md:pt-6 pb-4 md:pb-6">
                    <div className="pt-4 border-t border-border">
                        <div className="px-4 md:px-6 py-4">{children}</div>
                    </div>
                </div>
                {showCompleteTheLook && (
                    <div className="px-4 md:px-6 pt-4 border-t border-border">
                        <CompleteTheLook />
                    </div>
                )}
            </div>
            {/* Footer - sticky */}
            {showFooter && (
                <div className="flex-shrink-0 border-t border-border p-4 md:p-6 space-y-3">
                    <Button className="w-full">Checkout $59.00</Button>
                    <Button variant="outline" className="w-full">
                        Continue Shopping
                    </Button>
                    <button
                        type="button"
                        className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded py-2">
                        View Cart
                    </button>
                </div>
            )}
        </div>
    );
}

const meta: Meta<typeof MiniCartItem> = {
    title: 'CART/Mini Cart Item',
    component: MiniCartItem,
    tags: ['autodocs', 'interaction', 'skip-a11y'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
MiniCartItem component displays a product in the mini cart flyout with full interaction support.

## Features

- **Product Display**: Product image, name (bold), and variation attributes (color/size)
- **Pricing**: Original and sale pricing with savings indicators and promotion badges
- **Quantity Selection**: Stepper with increment/decrement buttons and numeric input
- **Item Actions**: Remove button for cart item deletion
- **Responsive Layout**: Compact layout optimized for flyout matching Figma design
- **Debounced Updates**: Quantity changes are debounced to prevent API spam
- **Keyboard Support**: Full keyboard navigation for quantity stepper controls

## Usage

This component is used within the mini cart slideout (CartSheet) to display individual cart items.
It integrates with the cart management system and handles quantity updates and item removal.

## Props

- **product**: Combined basket item and product data (MiniCartItemProduct)
- **onRemove**: Optional callback when item is removed from cart

## Integration

Integrates with:
- useItemFetcher for cart operations
- useCartQuantityUpdate for debounced quantity updates
- useConfig for cart configuration (debounce delay, max quantity)
- getDisplayVariationValues for proper attribute display
                `,
            },
        },
    },
    argTypes: {
        product: {
            description: 'Combined basket item and product data with images, pricing, and variations',
            control: 'object',
            table: {
                type: { summary: 'MiniCartItemProduct' },
            },
        },
        onRemove: {
            description: 'Optional callback function called when the remove button is clicked',
            action: 'remove',
            table: {
                type: { summary: '() => void' },
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <MiniCartItemStoryHarness>
                    <div className="w-full max-w-md">
                        <Story />
                    </div>
                </MiniCartItemStoryHarness>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof MiniCartItem>;

const mockProduct = {
    itemId: '1',
    productId: 'prod-1',
    productName: 'Product Name',
    quantity: 1,
    basePrice: 20.0, // List price (original price before discount)
    price: 20.0, // Unit price
    priceAfterItemDiscount: 15.0, // Final price after discount (for quantity 1, this is the discounted unit price)
    variationValues: {
        color: 'Grey',
        size: 'XL',
    },
    variationAttributes: [
        {
            id: 'color',
            name: 'Color',
            values: [{ value: 'Grey', name: 'Grey' }],
        },
        {
            id: 'size',
            name: 'Size',
            values: [{ value: 'XL', name: 'XL' }],
        },
    ],
    imageGroups: [
        {
            viewType: 'small',
            images: [
                {
                    link: 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1a6e0e2a/images/small/PG.33698RUBN4Q.CHARCWL.PZ.jpg',
                    alt: 'Product image',
                },
            ],
        },
    ],
};

export const WithSavings: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem product={mockProduct} onRemove={action('remove-clicked')} />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Mini cart item within the cart sheet context showing:
- "My Cart (1)" header with close button
- Separator between header and content
- Product with sale pricing, strikethrough original price, and savings indicator
- Quantity stepper and remove action
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart title (CartTitle renders "Delivery - 1 out of 1 items")
        const cartTitle = await canvas.findByText(/Delivery - 1 out of 1 items/);
        await expect(cartTitle).toBeInTheDocument();

        // Verify close button
        const closeButton = await canvas.findByRole('button', { name: /close/i });
        await expect(closeButton).toBeInTheDocument();

        // Wait for product name to be displayed
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify variation attributes are shown
        const colorAttr = await canvas.findByText((_content, element) => {
            return element?.textContent === 'Color: Grey';
        });
        await expect(colorAttr).toBeInTheDocument();
        const sizeAttr = await canvas.findByText((_content, element) => {
            return element?.textContent === 'Size: XL';
        });
        await expect(sizeAttr).toBeInTheDocument();

        // Verify pricing is displayed
        await waitFor(() => {
            const priceContainer = canvasElement.querySelector('[data-testid="mini-cart-item"]');
            expect(priceContainer).toBeInTheDocument();
            const priceText = priceContainer?.textContent || '';
            expect(priceText).toContain('£20.00'); // List price (strikethrough)
            expect(priceText).toContain('£15.00'); // Current price
        });

        // Verify quantity label and stepper controls
        const quantityLabel = await canvas.findByText('Quantity:');
        await expect(quantityLabel).toBeInTheDocument();
        const quantityInput = await canvas.findByLabelText('Quantity:');
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(1);

        // Verify remove button
        const removeButton = await canvas.findByRole('button', { name: /remove item/i });
        await expect(removeButton).toBeInTheDocument();
    },
};

export const WithoutSavings: Story = {
    render: () => (
        <MiniCartShell showFreeShipping={true} currentTotal={60}>
            <MiniCartItem
                product={{ ...mockProduct, basePrice: 15.0, price: 15.0, priceAfterItemDiscount: 15.0 }}
                onRemove={action('remove-clicked')}
            />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product at regular price with no savings. Shows:
- Single price display (no strikethrough)
- No promotion badge
- Clean pricing layout
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for product name to be displayed (use findBy to wait for async loading)
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify only sale price is shown (no strikethrough)
        // ProductPrice renders prices in Typography components, so we check the container text content
        await waitFor(() => {
            const priceContainer = canvasElement.querySelector('[data-testid="mini-cart-item"]');
            expect(priceContainer).toBeInTheDocument();
            const priceText = priceContainer?.textContent || '';
            expect(priceText).toContain('£15.00'); // Current price
        });

        // Verify no savings badge
        const savingsBadge = canvas.queryByText(/Saved/);
        await expect(savingsBadge).not.toBeInTheDocument();
    },
};

export const WithoutImage: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem product={{ ...mockProduct, imageGroups: [] }} onRemove={action('remove-clicked')} />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product without image showing placeholder. Demonstrates:
- Fallback placeholder when image data is missing
- Graceful handling of missing image groups
- "No image" text indicator
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for product name to be displayed (use findBy to wait for async loading)
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify placeholder is shown
        const placeholder = await canvas.findByText('No image');
        await expect(placeholder).toBeInTheDocument();
    },
};

export const LongProductName: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem
                product={{
                    ...mockProduct,
                    productName: 'This is a very long product name that should be truncated to prevent layout issues',
                }}
                onRemove={action('remove-clicked')}
            />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product with long name showing text truncation. Shows:
- Line clamping with line-clamp-2
- Layout stability with long product names
- Proper text wrapping behavior
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for long product name to be displayed
        // Use getByRole to find the heading element specifically, avoiding screen reader text
        const longName = await canvas.findByRole('heading', {
            name: /this is a very long product name/i,
        });
        await expect(longName).toBeInTheDocument();
    },
};

export const HigherQuantity: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem product={{ ...mockProduct, quantity: 5 }} onRemove={action('remove-clicked')} />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product with quantity greater than 1. Demonstrates:
- Quantity stepper showing selected quantity (5)
- Increment and decrement buttons for adjustment
- Numeric input for direct quantity entry
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for quantity stepper (use findBy to wait for async loading)
        const quantityInput = await canvas.findByLabelText('Quantity:');
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(5);
    },
};

export const OnlyColor: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem
                product={{
                    ...mockProduct,
                    variationValues: { color: 'Blue' },
                    variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'Blue', name: 'Blue' }] }],
                }}
                onRemove={action('remove-clicked')}
            />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product with only color variation. Shows:
- Single variation attribute (color only)
- No size attribute displayed
- Proper handling of partial variation data
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for color attribute (use findBy to wait for async loading)
        const colorAttr = await canvas.findByText((_content, element) => {
            return (
                element?.textContent === 'Color: Blue' &&
                element?.className?.includes('inline-block') &&
                element?.className?.includes('w-full')
            );
        });
        await expect(colorAttr).toBeInTheDocument();

        // Verify size attribute is not shown
        const sizeAttr = canvas.queryByText(/Size:/);
        await expect(sizeAttr).not.toBeInTheDocument();
    },
};

export const OnlySize: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem
                product={{
                    ...mockProduct,
                    variationValues: { size: 'M' },
                    variationAttributes: [{ id: 'size', name: 'Size', values: [{ value: 'M', name: 'M' }] }],
                }}
                onRemove={action('remove-clicked')}
            />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product with only size variation. Shows:
- Single variation attribute (size only)
- No color attribute displayed
- Proper handling of partial variation data
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for size attribute (use findBy to wait for async loading)
        const sizeAttr = await canvas.findByText((_content, element) => {
            return (
                element?.textContent === 'Size: M' &&
                element?.className?.includes('inline-block') &&
                element?.className?.includes('w-full')
            );
        });
        await expect(sizeAttr).toBeInTheDocument();

        // Verify color attribute is not shown
        const colorAttr = canvas.queryByText(/Color:/);
        await expect(colorAttr).not.toBeInTheDocument();
    },
};

export const CustomQuantity: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem product={{ ...mockProduct, quantity: 15 }} onRemove={action('remove-clicked')} />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product with custom quantity greater than 10. Demonstrates:
- Quantity stepper displaying the actual quantity value (15)
- Increment and decrement buttons for adjustment
- QuantityPicker handles any quantity value
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for product name to be displayed (use findBy to wait for async loading)
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify the quantity input shows 15
        const quantityInput = await canvas.findByLabelText('Quantity:');
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(15);
    },
};

export const EmptyCart: Story = {
    render: () => (
        <MiniCartShell itemCount={0} currentTotal={0} showCompleteTheLook={false} showFooter={false}>
            <div className="flex flex-col items-center text-center py-8">
                {/* Shopping bag icon */}
                <svg
                    className="w-24 h-24 text-muted-foreground/30 mx-auto mb-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                </svg>

                {/* Empty cart message */}
                <h2 className="text-xl font-semibold text-foreground mb-2">Your cart is empty</h2>
                <p className="text-sm text-muted-foreground mb-8 max-w-xs">
                    Looks like you haven&apos;t added anything to your cart yet. Start shopping to fill it up with
                    amazing products!
                </p>

                {/* Start Shopping button */}
                <Button className="px-8">Start Shopping</Button>
            </div>
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Empty cart state within the mini cart sheet. Shows:
- "My Cart (0)" header with close button
- Free shipping progress bar at $0.00 / $60.00
- Shopping bag icon
- "Your cart is empty" heading
- Descriptive subtitle encouraging shopping
- "Start Shopping" call-to-action button
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart title shows 0 items
        const cartTitle = await canvas.findByText(/Delivery - 0 out of 0 items/);
        await expect(cartTitle).toBeInTheDocument();

        // Verify close button
        const closeButton = await canvas.findByRole('button', { name: /close/i });
        await expect(closeButton).toBeInTheDocument();

        // Verify empty cart heading
        const emptyHeading = await canvas.findByText('Your cart is empty');
        await expect(emptyHeading).toBeInTheDocument();

        // Verify subtitle
        const subtitle = await canvas.findByText(/Looks like you haven't added anything/);
        await expect(subtitle).toBeInTheDocument();

        // Verify Start Shopping button
        const startShoppingButton = await canvas.findByRole('button', { name: /start shopping/i });
        await expect(startShoppingButton).toBeInTheDocument();

        // Verify free shipping progress bar is present
        const progressBar = await canvas.findByRole('progressbar', { name: /free shipping/i });
        await expect(progressBar).toBeInTheDocument();
        await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    },
};

export const AtStockLimit: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem
                product={{ ...mockProduct, quantity: 4, inventory: { id: 'mock-inv', ats: 4 } }}
                onRemove={action('remove-clicked')}
            />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Product at the stock/allocation limit. Demonstrates:
- Quantity set to the maximum available (4)
- "Maximum stock reached" message shown on initial render
- Increment button is disabled — cannot exceed allocation limit
- Decrement button remains active
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify quantity is at stock limit
        const quantityInput = await canvas.findByLabelText('Quantity:');
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(4);

        // Verify increment button is disabled
        const incrementButton = await canvas.findByTestId('quantity-increment');
        await expect(incrementButton).toBeDisabled();

        // Verify "Maximum stock reached" message is shown
        const stockMessage = await canvas.findByRole('alert');
        await expect(stockMessage).toBeInTheDocument();
        await expect(stockMessage).toHaveTextContent('Maximum stock reached');
    },
};

export const WithDeliveryBadge: Story = {
    render: () => (
        <MiniCartShell>
            <div className="relative">
                <div className="absolute top-0 right-0 z-10">
                    <Badge className="shrink-0 gap-1 text-xs rounded-pill bg-muted text-foreground border-0">
                        <ShoppingCart className="w-3 h-3" />
                        Delivery
                    </Badge>
                </div>
                <MiniCartItem product={mockProduct} onRemove={action('remove-clicked')} />
            </div>
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Mini cart item with a **Delivery** fulfillment badge. Shows:
- ShoppingCart icon with "Delivery" label
- Badge positioned in the top-right of the item
- Indicates the item will be shipped to the customer's address
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        const deliveryBadge = await canvas.findByText('Delivery');
        await expect(deliveryBadge).toBeInTheDocument();
    },
};

export const WithPickupBadge: Story = {
    render: () => (
        <MiniCartShell>
            <div className="relative">
                <div className="absolute top-0 right-0 z-10">
                    <Badge className="shrink-0 gap-1 text-xs rounded-pill bg-muted text-foreground border-0">
                        <Store className="w-3 h-3" />
                        Pick Up
                    </Badge>
                </div>
                <MiniCartItem product={mockProduct} onRemove={action('remove-clicked')} />
            </div>
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Mini cart item with a **Pick Up** fulfillment badge. Shows:
- Store icon with "Pick Up" label
- Badge positioned in the top-right of the item
- Indicates the item is set for in-store pickup (BOPIS)
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        const pickupBadge = await canvas.findByText('Pick Up');
        await expect(pickupBadge).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    render: () => (
        <MiniCartShell>
            <MiniCartItem product={mockProduct} onRemove={action('remove-clicked')} />
        </MiniCartShell>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Interactive mini cart item for testing user interactions. Demonstrates:
- Quantity stepper increment/decrement
- Remove button click
- Action logging for all interactions
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify quantity stepper is present with initial value
        const quantityInput = await canvas.findByLabelText('Quantity:');
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(1);

        // Click increment button to increase quantity
        const incrementButton = await canvas.findByTestId('quantity-increment');
        await userEvent.click(incrementButton);
        await expect(quantityInput).toHaveValue(2);

        // Verify remove button is present
        const removeButton = await canvas.findByRole('button', { name: /remove item/i });
        await expect(removeButton).toBeInTheDocument();
    },
};
