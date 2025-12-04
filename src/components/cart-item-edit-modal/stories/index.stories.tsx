import type { Meta, StoryObj } from '@storybook/react-vite';
import { CartItemEditModal } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within } from 'storybook/test';
import { masterProduct, variantProduct } from '@/components/__mocks__/master-variant-product';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';

// Create a product that won't trigger fetches by ensuring matching variant has same productId
const createMockProductForModal = (): ShopperProductsTypes.Product => {
    // Use master product but ensure the variant matching variantProduct.variationValues has productId matching master id
    const product = { ...masterProduct, variationValues: variantProduct.variationValues };
    // Find the variant that matches and update its productId to match the master id
    if (product.variants) {
        const matchingVariant = product.variants.find(
            (v) =>
                v.variationValues?.color === variantProduct.variationValues?.color &&
                v.variationValues?.size === variantProduct.variationValues?.size &&
                v.variationValues?.width === variantProduct.variationValues?.width
        );
        if (matchingVariant) {
            matchingVariant.productId = product.id;
        }
    }
    return product;
};

const MODAL_HARNESS_ATTR = 'data-edit-modal-harness';

function EditModalStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logModalOpen = useMemo(() => action('edit-modal-opened'), []);
    const logVariantChange = useMemo(() => action('variant-changed'), []);
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
    }, [logModalOpen, logVariantChange, logQuantityChange, logUpdate, logHover]);

    return (
        <div ref={containerRef} {...{ [MODAL_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof CartItemEditModal> = {
    title: 'CART/Cart Item Edit Modal',
    component: CartItemEditModal,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A modal dialog component for editing cart items. This component provides a full product editing experience with image gallery, variant selection, and quantity adjustment.

## Features

- **Product Display**: Shows product images in a gallery
- **Variant Selection**: Interactive swatches for color, size, etc.
- **Quantity Adjustment**: Quantity picker for updating quantity
- **Product Info**: Full product details and description
- **Update Action**: Button to save changes to cart
- **Responsive Layout**: Grid layout that adapts to screen size
- **Modal Dialog**: Accessible dialog with proper focus management

## Usage

The CartItemEditModal is used in:
- Cart item editing flows
- Product variant changes
- Quantity updates
- Cart item management

\`\`\`tsx
import { CartItemEditModal } from '../cart-item-edit-modal';

function CartItem({ product, itemId, quantity }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Edit</button>
      <CartItemEditModal
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
| \`product\` | \`ShopperProductsTypes.Product\` | The product being edited |
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
                `,
            },
        },
    },
    argTypes: {
        product: {
            control: 'object',
            description: 'The product being edited',
            table: {
                type: { summary: 'ShopperProductsTypes.Product' },
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

export const Default: Story = {
    args: {
        product: createMockProductForModal(),
        initialQuantity: 1,
        itemId: 'item-123',
        open: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default CartItemEditModal shows the edit interface:

### Features:
- **Modal dialog**: Opens with product editing interface
- **Image gallery**: Product images on the left
- **Product info**: Product details and variants on the right
- **Quantity picker**: Current quantity displayed
- **Update button**: Button to save changes

### Use Cases:
- Standard cart item editing
- Product variant changes
- Quantity updates
- Most common edit scenarios
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

        // Test modal title is present (wait for it to appear)
        const title = await documentBody.findByText(/edit cart item/i);
        await expect(title).toBeInTheDocument();
    },
};

export const WithHighQuantity: Story = {
    args: {
        product: createMockProductForModal(),
        initialQuantity: 5,
        itemId: 'item-123',
        open: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemEditModal with high initial quantity:

### High Quantity Features:
- **Quantity display**: Shows current high quantity
- **Quantity editing**: Can adjust quantity in modal
- **Same functionality**: All edit features work the same
- **Quantity context**: Modal shows current quantity

### Use Cases:
- Items with multiple quantities
- Bulk item editing
- Quantity adjustments
- High quantity scenarios
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
        product: createMockProductForModal(),
        initialQuantity: 1,
        itemId: 'item-123',
        open: true,
        initialVariantSelections: variantProduct.variationValues,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemEditModal with product variants:

### Variant Features:
- **Variant display**: Shows selected variants
- **Variant selection**: Can change variants in modal
- **Variant swatches**: Interactive swatches for selection
- **Image updates**: Gallery updates based on selected variant

### Use Cases:
- Products with color/size options
- Variant changes
- Product configuration
- Variant-specific editing
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
CartItemEditModal in closed state:

### Closed State Features:
- **Modal hidden**: Dialog is not visible
- **Not rendered**: Modal content not in DOM
- **Ready to open**: Can be opened programmatically
- **State management**: Open state controlled by parent

### Use Cases:
- Initial state
- After closing modal
- Conditional rendering
- State management
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

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Dialog renders in a portal, so query from document.body
        const documentBody = within(document.body);

        // Wait for modal dialog to be visible (not aria-hidden)
        const dialog = await documentBody.findByRole('dialog', { hidden: false });
        await expect(dialog).toBeInTheDocument();

        // Test modal title is present (wait for it to appear)
        const title = await documentBody.findByText(/edit cart item/i);
        await expect(title).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Dialog renders in a portal, so query from document.body
        const documentBody = within(document.body);

        // Wait for modal dialog to be visible (not aria-hidden)
        const dialog = await documentBody.findByRole('dialog', { hidden: false });
        await expect(dialog).toBeInTheDocument();

        // Test modal title is present (wait for it to appear)
        const title = await documentBody.findByText(/edit cart item/i);
        await expect(title).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Dialog renders in a portal, so query from document.body
        const documentBody = within(document.body);

        // Wait for modal dialog to be visible (not aria-hidden)
        const dialog = await documentBody.findByRole('dialog', { hidden: false });
        await expect(dialog).toBeInTheDocument();

        // Test modal title is present (wait for it to appear)
        const title = await documentBody.findByText(/edit cart item/i);
        await expect(title).toBeInTheDocument();
    },
};
