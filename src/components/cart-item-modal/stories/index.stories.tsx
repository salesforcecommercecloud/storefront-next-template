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
import { CartItemModal } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within } from 'storybook/test';
import { masterProduct, variantProduct } from '@/components/__mocks__/master-variant-product';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Create a product that won't trigger fetches by ensuring all variants have same productId as master
const createMockProductForModal = (): ShopperProducts.schemas['Product'] => {
    const product = {
        ...masterProduct,
        variationValues: variantProduct.variationValues,
        brand: 'Salesforce Foundations',
    };
    // Set all variants' productId to match the master id so no variant change triggers a fetch
    if (product.variants) {
        product.variants = product.variants.map((v) => ({ ...v, productId: product.id }));
    }
    return product;
};

// Create a product with only Size variation (no color/width) for the size-only story
const createSizeOnlyProduct = (): ShopperProducts.schemas['Product'] => {
    const product = createMockProductForModal();
    // Keep only the 'size' variation attribute
    product.variationAttributes = product.variationAttributes?.filter((attr) => attr.id === 'size');
    // Remove color/width from variant variation values and deduplicate by size
    const seenSizes = new Set<string>();
    product.variants = product.variants
        ?.map((v) => ({
            ...v,
            variationValues: { size: v.variationValues?.size || '' },
        }))
        .filter((v) => {
            if (seenSizes.has(v.variationValues.size)) return false;
            seenSizes.add(v.variationValues.size);
            return true;
        });
    // Set variation values to size only
    product.variationValues = { size: product.variationValues?.size || '040' };
    // Remove color-keyed image groups (keep only generic ones)
    product.imageGroups = product.imageGroups?.filter(
        (group) => !group.variationAttributes?.some((attr) => attr.id === 'color')
    );
    // Ensure matching variant has same productId
    const matchingVariant = product.variants?.find((v) => v.variationValues?.size === product.variationValues?.size);
    if (matchingVariant) {
        matchingVariant.productId = product.id;
    }
    return product;
};

// Create a product with extra images (>4) to demonstrate thumbnail scrolling arrows
const createProductWithManyImages = (): ShopperProducts.schemas['Product'] => {
    const product = createMockProductForModal();
    // Add extra images to the generic (non-color-specific) large image group
    const largeGroup = product.imageGroups?.find((g) => g.viewType === 'large' && !g.variationAttributes);
    if (largeGroup?.images) {
        const baseImages = largeGroup.images;
        // Duplicate images with unique alt text to create 6+ thumbnails
        largeGroup.images = [
            ...baseImages,
            { ...baseImages[0], alt: `${baseImages[0].alt} - angle 3` },
            { ...baseImages[1], alt: `${baseImages[1].alt} - angle 4` },
            { ...baseImages[0], alt: `${baseImages[0].alt} - angle 5` },
            { ...baseImages[1], alt: `${baseImages[1].alt} - angle 6` },
        ];
    }
    return product;
};

const MODAL_HARNESS_ATTR = 'data-edit-modal-harness';

function EditModalStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logModalOpen = useMemo(() => action('edit-modal-opened'), []);
    const logQuantityChange = useMemo(() => action('quantity-changed'), []);
    const logUpdate = useMemo(() => action('cart-item-updated'), []);
    const logHover = useMemo(() => action('edit-modal-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${MODAL_HARNESS_ATTR}]`));

        const handleDialogOpen = () => {
            const dialog = document.querySelector('[role="dialog"]');
            if (dialog && isInsideHarness(dialog)) {
                logModalOpen({});
            }
        };

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }

            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (label.toLowerCase().includes('update') || label.toLowerCase().includes('add to cart')) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                logUpdate({ label });
            }
        };

        const handleChange = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input || !isInsideHarness(input)) {
                return;
            }
            if (input.type === 'number') {
                logQuantityChange({ value: input.value });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const element = (event.target as HTMLElement | null)?.closest('button, input, [role="button"]');
            if (!element || !isInsideHarness(element)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && element.contains(related)) {
                return;
            }
            const label = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
            if (!label) {
                return;
            }
            logHover({ label });
        };

        // Use MutationObserver to detect dialog open/close
        const observer = new MutationObserver(() => {
            handleDialogOpen();
        });

        const root = containerRef.current;
        if (root) {
            observer.observe(root, { childList: true, subtree: true });
        }

        document.addEventListener('click', handleClick, true);
        document.addEventListener('change', handleChange, true);
        document.addEventListener('mouseover', handleMouseOver, true);

        return () => {
            observer.disconnect();
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('change', handleChange, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logModalOpen, logQuantityChange, logUpdate, logHover]);

    return (
        <div ref={containerRef} {...{ [MODAL_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof CartItemModal> = {
    title: 'CART/Cart Item Modal',
    component: CartItemModal,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            story: { inline: false, height: '600px' },
            description: {
                component: `
A modal dialog component for editing cart items. Allows shoppers to change product variants, adjust quantity, and update their cart without navigating away from the cart page.

## Features

- **Brand Display**: Shows the product brand above the product name
- **Product Browsing**: Image gallery with scrollable thumbnails for viewing product images
- **Variant Selection**: Interactive swatches for selecting size, color, and other product options
- **Quantity Adjustment**: Quantity picker to increase or decrease item quantity
- **Price Display**: Shows the current unit price for the selected variant
- **Update Action**: Confirms and applies the shopper's changes to the cart item
- **Accessible Dialog**: Modal with proper focus management and close functionality

## Usage

\`\`\`tsx
import { CartItemModal } from '../cart-item-modal';

function CartItem({ product, itemId, quantity }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Edit</button>
      <CartItemModal
        open={isOpen}
        onOpenChange={setIsOpen}
        product={product}
        initialQuantity={quantity}
        itemId={itemId}
      />
    </>
  );
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`product\` | \`ShopperProducts.schemas['Product']\` | The product being edited |
| \`initialQuantity\` | \`number\` | Initial quantity from cart item |
| \`itemId\` | \`string\` | Cart item ID for update operations |
| \`open\` | \`boolean\` | Whether the modal is open |
| \`onOpenChange\` | \`(open: boolean) => void\` | Callback when modal open state changes |
| \`initialVariantSelections\` | \`Record<string, string>\` | Optional initial variant selections |

## Behavior

- **Variant Changes**: Automatically fetches new product data when variants change
- **Image Updates**: Gallery updates based on selected variants
- **Quantity Updates**: Updates cart item quantity
- **Modal Management**: Handles open/close state
- **Optimistic UI**: Closes modal immediately before update
- **Compact styling**: Hides inventory status, promotional callouts, list prices, and "Buy now pay later" text
                `,
            },
        },
    },
    argTypes: {
        product: {
            control: 'object',
            description: 'The product being edited',
            table: {
                type: { summary: "ShopperProducts.schemas['Product']" },
            },
        },
        initialQuantity: {
            control: 'number',
            description: 'Initial quantity from cart item',
            table: {
                type: { summary: 'number' },
            },
        },
        itemId: {
            control: 'text',
            description: 'Cart item ID for update operations',
            table: {
                type: { summary: 'string' },
            },
        },
        open: {
            control: 'boolean',
            description: 'Whether the modal is open',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
    },
    args: {
        product: createMockProductForModal(),
        initialQuantity: 1,
        itemId: 'item-123',
        open: false,
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <EditModalStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </EditModalStoryHarness>
                );

                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/',
                            element: content,
                        },
                    ],
                    { initialEntries: ['/'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHighQuantity: Story = {
    args: {
        product: createSizeOnlyProduct(),
        initialQuantity: 5,
        itemId: 'item-123',
        open: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemModal with a size-only product and high initial quantity. Demonstrates the simplified edit experience for products with a single variation attribute.

### Features:
- **Brand header**: Organisation name in uppercase grey text
- **Size only**: Single variation attribute (no color or width swatches)
- **High quantity**: Initial quantity of 5 shown in the quantity picker
- **Current price only**: Clean price display without promotions or list price
- **Compact thumbnails**: No scroll arrows (fewer than 4 images)
- **Full-width Update button**: Separated by a divider at the bottom

### Use Cases:
- Products with a single variation attribute
- Size-only products (e.g. accessories, shoes)
- Bulk quantity editing
                `,
            },
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Dialog renders in a portal, so query from document.body
        const documentBody = within(document.body);

        // Wait for modal dialog to be visible (not aria-hidden)
        const dialog = await documentBody.findByRole('dialog', { hidden: false });
        await expect(dialog).toBeInTheDocument();
    },
};

export const WithVariants: Story = {
    args: {
        product: createProductWithManyImages(),
        initialQuantity: 1,
        itemId: 'item-123',
        open: true,
        initialVariantSelections: variantProduct.variationValues,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemModal with multiple product variants and a large image gallery. Demonstrates the full edit experience with all variation attributes and scrollable thumbnails.

### Features:
- **Brand header**: Organisation name in uppercase grey text
- **Multiple variants**: Size, Color, and Width swatches (size displayed first)
- **Blue selected state**: Selected swatches use primary (blue) fill
- **Scrollable thumbnails**: Horizontal thumbnail strip with left/right arrows (6+ images)
- **Navigation arrows**: Previous/next arrows on the main image
- **Current price only**: Clean price display without promotions or list price
- **Full-width Update button**: Separated by a divider at the bottom
- **Live label updates**: Variant labels (e.g. "Size: 40") update on selection

### Use Cases:
- Products with multiple variation attributes (color, size, width)
- Products with many images
- Full variant editing experience
                `,
            },
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Dialog renders in a portal, so query from document.body
        const documentBody = within(document.body);

        // Wait for modal dialog to be visible (not aria-hidden)
        const dialog = await documentBody.findByRole('dialog', { hidden: false });
        await expect(dialog).toBeInTheDocument();
    },
};

export const Closed: Story = {
    args: {
        product: createMockProductForModal(),
        initialQuantity: 1,
        itemId: 'item-123',
        open: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemModal in its closed (default) state. The modal is not rendered in the DOM until opened.

### Features:
- **Modal hidden**: Dialog is not visible or rendered
- **Ready to open**: Can be opened programmatically via the \`open\` prop
- **State management**: Open state controlled by parent component

### Use Cases:
- Default initial state before user clicks "Edit"
- After modal is closed following an update
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        // Test modal is not visible when closed (check both canvas and document.body since dialog renders in portal)
        const dialogInCanvas = canvasElement.querySelector('[role="dialog"]');
        const dialogInBody = document.body.querySelector('[role="dialog"]');
        await expect(dialogInCanvas).not.toBeInTheDocument();
        await expect(dialogInBody).not.toBeInTheDocument();
    },
};
