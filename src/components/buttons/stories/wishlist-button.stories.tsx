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
import { WishlistButton } from '../wishlist-button';
import { mockProductSearchItem } from '@/components/__mocks__/product-search-hit-data';
import { HeartIcon } from '../../icons';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, useState, type ReactNode, type ReactElement } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

const WISHLIST_HARNESS_ATTR = 'data-wishlist-harness';

function WishlistStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logToggle = useMemo(() => action('wishlist-toggle'), []);
    const logHover = useMemo(() => action('wishlist-hovered'), []);

    const configValue = useMemo(() => mockConfig, []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${WISHLIST_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const label = button.getAttribute('aria-label') ?? button.textContent ?? '';
            const trimmed = label.trim();
            if (!trimmed) {
                return;
            }
            logToggle({ label: trimmed });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && button.contains(related)) {
                return;
            }
            const label = button.getAttribute('aria-label') ?? button.textContent ?? '';
            const trimmed = label.trim();
            if (!trimmed) {
                return;
            }
            logHover({ label: trimmed });
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logToggle, logHover]);

    return (
        <ConfigProvider config={configValue}>
            <div ref={containerRef} {...{ [WISHLIST_HARNESS_ATTR]: 'true' }}>
                {children}
            </div>
        </ConfigProvider>
    );
}

const meta: Meta<typeof WishlistButton> = {
    title: 'ACTIONS/Wishlist Button',
    component: WishlistButton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A wishlist button component that allows users to add or remove products from their wishlist. This component provides visual feedback for wishlist status and handles the toggle functionality with loading states.

## Features

- **Toggle functionality**: Add or remove items from wishlist
- **Visual feedback**: Heart icon that fills when item is in wishlist
- **Loading states**: Shows loading state during wishlist operations
- **Multiple sizes**: Small, medium, and large size options
- **Product support**: Works with products and variants
- **Accessibility**: Proper ARIA attributes and keyboard support

## Usage

The WishlistButton is commonly used in:
- Product cards
- Product detail pages
- Product listings
- Search results

\`\`\`tsx
import { WishlistButton } from '../wishlist-button';

function ProductCard({ product }) {
  return (
    <div>
      {/* product content */}
      <WishlistButton 
        product={product}
        size="md"
        className="absolute top-2 right-2"
      />
    </div>
  );
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`product\` | \`ShopperSearch.schemas['ProductSearchHit']\` | - | The product to add/remove from wishlist |
| \`variant\` | \`ShopperSearch.schemas['ProductSearchHit']\` | \`undefined\` | Optional variant of the product |
| \`size\` | \`'sm' | 'md' | 'lg'\` | \`'md'\` | Size of the wishlist button |
| \`className\` | \`string\` | \`undefined\` | Additional CSS classes for styling |

## Visual States

- **Empty heart**: Item not in wishlist (outline heart icon)
- **Filled heart**: Item in wishlist (filled heart icon)
- **Loading**: Disabled state with loading indicator
- **Hover**: Visual feedback on hover

## Sizes

- **Small (\`sm\`)**: Compact size for tight spaces
- **Medium (\`md\`)**: Standard size for most use cases
- **Large (\`lg\`)**: Larger size for prominent placement

## Accessibility

- Proper ARIA attributes for wishlist status
- Keyboard navigation support
- Screen reader announcements
- Loading state announcements
- Focus management
                `,
            },
        },
    },
    argTypes: {
        product: {
            control: 'object',
            description: 'The product to add/remove from wishlist',
            table: {
                type: { summary: 'ShopperSearch.schemas["ProductSearchHit"]' },
            },
        },
        variant: {
            control: 'object',
            description: 'Optional variant of the product',
            table: {
                type: { summary: 'ShopperSearch.schemas["ProductSearchHit"]' },
                defaultValue: { summary: 'undefined' },
            },
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
            description: 'Size of the wishlist button',
            table: {
                type: { summary: "'sm' | 'md' | 'lg'" },
                defaultValue: { summary: "'md'" },
            },
        },
        className: {
            control: 'text',
            description: 'Additional CSS classes for styling',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'undefined' },
            },
        },
    },
    args: {
        product: mockProductSearchItem,
        size: 'md',
        className: 'static top-auto right-auto',
    },
    decorators: [
        (Story: React.ComponentType) => (
            <WishlistStoryHarness>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="relative">
                        <Story />
                    </div>
                </div>
            </WishlistStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'md',
    },
    parameters: {
        docs: {
            description: {
                story: `
The default WishlistButton shows a medium-sized heart icon:

### Features:
- **Medium size**: Standard size for most use cases
- **Heart icon**: Outline heart when not in wishlist
- **Product context**: Shown with product information
- **Toggle functionality**: Click to add/remove from wishlist

### Use Cases:
- Product cards
- Product detail pages
- Standard product listings
- Most common wishlist scenarios
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test wishlist button renders correctly
        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist|remove from wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();

        // Test button is enabled (not disabled since isLoading is false by default)
        await expect(wishlistButton).not.toBeDisabled();

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const SmallSize: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'sm',
    },
    parameters: {
        docs: {
            description: {
                story: `
The small size WishlistButton is compact for tight spaces:

### Features:
- **Small size**: Compact heart icon
- **Space efficient**: Takes minimal space
- **Same functionality**: All wishlist features work the same
- **Clean appearance**: Subtle but accessible

### Use Cases:
- Compact product cards
- Dense product listings
- Mobile interfaces
- Space-constrained layouts
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test wishlist button renders correctly
        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist|remove from wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();

        // Test button is enabled (not disabled since isLoading is false by default)
        await expect(wishlistButton).not.toBeDisabled();

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const LargeSize: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'lg',
    },
    parameters: {
        docs: {
            description: {
                story: `
The large size WishlistButton is prominent for important placement:

### Features:
- **Large size**: Bigger heart icon for visibility
- **Prominent placement**: Draws attention to wishlist feature
- **Enhanced accessibility**: Easier to click and see
- **Professional appearance**: Clear visual hierarchy

### Use Cases:
- Featured product sections
- Product detail pages
- Prominent wishlist placement
- Enhanced user experience
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test wishlist button renders correctly
        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist|remove from wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();

        // Test button is enabled (not disabled since isLoading is false by default)
        await expect(wishlistButton).not.toBeDisabled();

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const WithVariant: Story = {
    args: {
        product: mockProductSearchItem,
        variant: {
            ...mockProductSearchItem,
            productId: 'variant-123',
            name: 'Product Name - Blue, Large',
        },
        size: 'md',
    },
    parameters: {
        docs: {
            description: {
                story: `
This story shows the WishlistButton with a product variant:

### Features:
- **Variant support**: Works with product variants
- **Specific variant**: Wishlist tracks the specific variant
- **Variant context**: Shows variant-specific information
- **Same functionality**: All wishlist features work with variants

### Use Cases:
- Product variants (size, color, etc.)
- Specific product configurations
- Variant-specific wishlist tracking
- Detailed product management
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test wishlist button renders correctly
        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist|remove from wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();

        // Test button is enabled (not disabled since isLoading is false by default)
        await expect(wishlistButton).not.toBeDisabled();

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const InWishlist: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'md',
    },
    parameters: {
        docs: {
            description: {
                story: `
This story shows the WishlistButton when the item is already in the wishlist:

### Features:
- **Filled heart**: Heart icon is filled/solid
- **In wishlist state**: Visual indication that item is saved
- **Remove functionality**: Click to remove from wishlist
- **Clear feedback**: Obvious wishlist status

### Visual State:
- Heart icon is filled/solid
- Clear indication of wishlist status
- Hover effects still work
- Click removes from wishlist
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test wishlist button renders correctly
        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist|remove from wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();

        // Test button is enabled (not disabled since isLoading is false by default)
        await expect(wishlistButton).not.toBeDisabled();

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

function LoadingStateWishlistButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isFilled, setIsFilled] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleClick = () => {
        if (isLoading) return;
        setIsLoading(true);
        timerRef.current = setTimeout(() => {
            setIsLoading(false);
            setIsFilled(true);
        }, 2000);
    };

    return <HeartIcon isFilled={isFilled} isLoading={isLoading} onClick={handleClick} size={size} />;
}

export const LoadingState: Story = {
    args: {
        size: 'md',
    },
    render: (args) => <LoadingStateWishlistButton {...args} />,
    parameters: {
        docs: {
            description: {
                story: `
This story simulates the full add-to-wishlist lifecycle:

### Interaction:
1. **Click** the heart icon to start the operation
2. **Spinner** appears for ~2 seconds (loading state)
3. **Filled red heart** appears (product added to wishlist)

### Features:
- **Loading spinner**: Replaces heart icon during the operation
- **Non-interactive during loading**: Prevents multiple clicks via pointer-events-none
- **Success feedback**: Heart fills red when complete
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();
        await expect(wishlistButton).not.toBeDisabled();

        await userEvent.click(wishlistButton);

        const loadingButton = canvas.getByRole('button', { name: /updating wishlist/i });
        await expect(loadingButton).not.toBeDisabled();
        await expect(loadingButton).toHaveAttribute('aria-busy', 'true');
        await expect(loadingButton).toHaveClass('pointer-events-none');

        await new Promise((resolve) => setTimeout(resolve, 2500));

        const filledButton = canvas.getByRole('button', { name: /remove from wishlist/i });
        await expect(filledButton).not.toBeDisabled();
        await expect(filledButton).not.toHaveAttribute('aria-busy');
    },
};

export const DifferentProducts: Story = {
    render: () => (
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-none relative">
                <h4 className="font-medium mb-2">Standard Product</h4>
                <p className="text-sm text-muted-foreground mb-2">Basic product item</p>
                <p className="text-lg font-bold">$29.99</p>
                <div className="absolute top-2 right-2">
                    <WishlistButton product={mockProductSearchItem} size="sm" />
                </div>
            </div>

            <div className="p-4 border rounded-none relative">
                <h4 className="font-medium mb-2">Featured Product</h4>
                <p className="text-sm text-muted-foreground mb-2">Premium product item</p>
                <p className="text-lg font-bold">$99.99</p>
                <div className="absolute top-2 right-2">
                    <WishlistButton
                        product={{
                            ...mockProductSearchItem,
                            productId: 'featured-product',
                            name: 'Featured Product',
                        }}
                        size="sm"
                    />
                </div>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
This story shows multiple WishlistButtons with different products:

### Multiple Products:
- **Standard Product**: Basic product with wishlist button
- **Featured Product**: Premium product with wishlist button
- **Independent state**: Each button tracks its own product
- **Consistent styling**: Same button design across products

### Benefits:
- Multiple products can be wishlisted independently
- Consistent user experience
- Clear product identification
- Scalable wishlist functionality
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test wishlist button interaction - get all buttons since there are multiple
        const wishlistButtons = canvas.getAllByRole('button', { name: /add to wishlist|remove from wishlist/i });
        await expect(wishlistButtons.length).toBeGreaterThan(0);

        // Verify buttons are rendered (don't click if authentication is required)
        // The buttons should be present even if authentication is needed
        for (const button of wishlistButtons) {
            await expect(button).toBeInTheDocument();
        }

        // Only test keyboard navigation if buttons are enabled
        // Skip clicking to avoid authentication errors in test environment
        if (wishlistButtons.length > 0) {
            const firstButton = wishlistButtons[0];
            if (firstButton instanceof HTMLButtonElement && !firstButton.disabled) {
                await userEvent.tab();
                // Don't press enter as it might trigger authentication requirement
            }
        }
    },
};

export const CustomStyling: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'md',
        className: 'text-red-500 hover:text-red-600',
    },
    parameters: {
        docs: {
            description: {
                story: `
This story shows the WishlistButton with custom styling:

### Custom Features:
- **Red color**: Custom red color for the heart icon
- **Hover effects**: Darker red on hover
- **Custom classes**: Demonstrates className prop usage
- **Maintains functionality**: All wishlist features work the same

### Styling Options:
- Custom colors for brand consistency
- Hover state customization
- Size and spacing adjustments
- Integration with design systems

### Use Cases:
- Brand-specific styling
- Custom color schemes
- Design system integration
- Enhanced visual appeal
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test wishlist button renders correctly
        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist|remove from wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();

        // Test button is enabled (not disabled since isLoading is false by default)
        await expect(wishlistButton).not.toBeDisabled();

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};
