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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';

import ActionCard from '../index';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

function ActionCardHoverLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logHover = useMemo(() => action('hovered'), []);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const button = target.closest('button');
            if (!button || !root.contains(button)) {
                return;
            }

            const cardFooter = button.closest('[data-slot="card-footer"]');
            if (!cardFooter) {
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

        root.addEventListener('mouseover', handleMouseOver);

        return () => {
            root.removeEventListener('mouseover', handleMouseOver);
        };
    }, [logHover]);

    return <div ref={containerRef}>{children}</div>;
}

const logEditClick = () => action('edit clicked');
const logRemoveClick = () => action('remove clicked');

const createEditHandler = (label: string, userHandler?: () => void) => {
    const log = logEditClick();
    return () => {
        log({ label });
        userHandler?.();
    };
};

const createRemoveHandler = (label: string, userHandler?: () => void | Promise<unknown>) => {
    const log = logRemoveClick();
    return async () => {
        log({ label });
        return await userHandler?.();
    };
};

const meta: Meta<typeof ActionCard> = {
    title: 'ACTIONS/Action Card',
    component: ActionCard,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A card-style container with optional Edit/Remove actions. This component provides a consistent interface for displaying content with action buttons, including loading states and accessibility features.

## Features

- **Card container**: Uses shadcn/ui Card component for consistent styling
- **Optional actions**: Edit and/or Remove buttons can be enabled
- **Loading overlay**: Shows loading spinner when onRemove returns a promise
- **Accessibility**: Proper ARIA labels and button refs for focus management
- **Customizable labels**: Edit and remove button labels can be customized
- **Responsive design**: Works seamlessly across all device sizes

## Usage

The ActionCard is commonly used for:
- Address cards in checkout/settings
- Payment method cards
- Saved items or favorites
- User profile sections
- Any content that needs edit/remove functionality

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`children\` | \`ReactNode\` | \`undefined\` | Content to display inside the card |
| \`onEdit\` | \`() => void\` | \`undefined\` | Function called when edit button is clicked |
| \`onRemove\` | \`() => void | Promise<unknown>\` | \`undefined\` | Function called when remove button is clicked |
| \`editBtnRef\` | \`Ref<HTMLButtonElement>\` | \`undefined\` | Ref for the edit button for accessibility |
| \`editBtnLabel\` | \`string\` | \`undefined\` | Custom label for edit button |
| \`removeBtnRef\` | \`Ref<HTMLButtonElement>\` | \`undefined\` | Ref for the remove button for accessibility |
| \`removeBtnLabel\` | \`string\` | \`undefined\` | Custom label for remove button |

## Loading States

When \`onRemove\` returns a promise, the component automatically:
- Shows a loading overlay with spinner
- Disables interaction with the card content
- Maintains accessibility during loading

## Accessibility

- Proper ARIA labels for action buttons
- Button refs for programmatic focus management
- Loading states are announced to screen readers
- Keyboard navigation support
- High contrast loading overlay
                `,
            },
        },
    },
    argTypes: {
        onEdit: {
            control: false,
            description: 'Function called when edit button is clicked',
        },
        onRemove: {
            control: false,
            description: 'Function called when remove button is clicked',
        },
        editBtnLabel: {
            control: 'text',
            description: 'Custom label for edit button',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'undefined' },
            },
        },
        removeBtnLabel: {
            control: 'text',
            description: 'Custom label for remove button',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'undefined' },
            },
        },
    },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {},
    render: (args) => {
        const { t } = getTranslation();
        const { onEdit: userOnEdit, onRemove: userOnRemove, editBtnLabel, removeBtnLabel, ...rest } = args;
        const editLabel = editBtnLabel ?? t('actionCard:edit');
        const removeLabel = removeBtnLabel ?? t('actionCard:remove');

        return (
            <ActionCardHoverLogger>
                <ActionCard
                    {...rest}
                    onEdit={createEditHandler(editLabel, userOnEdit)}
                    onRemove={createRemoveHandler(removeLabel, userOnRemove)}
                    editBtnLabel={editBtnLabel}
                    removeBtnLabel={removeBtnLabel}>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">John Doe</h3>
                        <p className="text-sm text-muted-foreground">john.doe@example.com</p>
                        <p className="text-sm">123 Main Street, Apt 4B</p>
                        <p className="text-sm">New York, NY 10001</p>
                    </div>
                </ActionCard>
            </ActionCardHoverLogger>
        );
    },
    parameters: {
        docs: {
            description: {
                story: `
The default ActionCard includes both edit and remove functionality:

### Features:
- **Content area**: Displays user information (name, email, address)
- **Edit button**: Link-style button for editing the content
- **Remove button**: Link-style button with destructive styling for removal
- **Action handlers**: Both buttons have click handlers (shown in Actions panel)

### Use Cases:
- Address cards in checkout flow
- Payment method management
- User profile sections
- Saved items or favorites
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test card content is displayed
        const nameElement = canvas.getByText('John Doe');
        await expect(nameElement).toBeInTheDocument();

        // Test edit button is present and enabled
        const editButton = canvas.getByRole('button', { name: /edit|change/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test remove button is present and enabled
        const removeButton = canvas.getByRole('button', { name: /remove|delete/i });
        await expect(removeButton).toBeInTheDocument();
        await expect(removeButton).not.toBeDisabled();
    },
};

export const EditOnly: Story = {
    args: {},
    render: (args) => {
        const { t } = getTranslation();
        const { onEdit: userOnEdit, editBtnLabel, ...rest } = args;
        const editLabel = editBtnLabel ?? t('actionCard:edit');

        return (
            <ActionCardHoverLogger>
                <ActionCard {...rest} onEdit={createEditHandler(editLabel, userOnEdit)} editBtnLabel={editBtnLabel}>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Payment Method</h3>
                        <p className="text-sm text-muted-foreground">•••• •••• •••• 4242</p>
                        <p className="text-sm">Expires 12/25</p>
                    </div>
                </ActionCard>
            </ActionCardHoverLogger>
        );
    },
    parameters: {
        docs: {
            description: {
                story: `
This story shows an ActionCard with only edit functionality:

### Features:
- **Edit button only**: Remove button is not rendered
- **Payment card styling**: Shows credit card information
- **Single action**: Only edit functionality is available

### Use Cases:
- Payment method cards where removal is handled elsewhere
- Read-only content that can be edited
- Settings that can be modified but not deleted
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Test payment card content is displayed
        const titleElement = canvas.getByText('Payment Method');
        await expect(titleElement).toBeInTheDocument();

        const cardNumber = canvas.getByText('•••• •••• •••• 4242');
        await expect(cardNumber).toBeInTheDocument();

        // Test edit button is present and functional
        const editButton = canvas.getByRole('button', { name: t('actionCard:edit') });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test that remove button is not present (check before clicking edit)
        // Scope query to card footer to avoid matching buttons from Storybook UI
        // Verify the edit button is within the card footer
        const cardFooter = editButton.closest('[data-slot="card-footer"]');
        await expect(cardFooter).toBeInTheDocument();
        if (cardFooter) {
            // Get all buttons in the footer
            const footerButtons = Array.from(cardFooter.querySelectorAll('button'));

            // Verify the edit button we found is in the footer
            await expect(footerButtons).toContain(editButton);

            // Verify no Remove buttons exist in the footer
            // Check that no button in the footer has the remove text or aria-label
            const hasRemoveButton = footerButtons.some((btn) => {
                const text = btn.textContent?.trim() || '';
                const ariaLabel = btn.getAttribute('aria-label') || '';
                return text === t('actionCard:remove') || ariaLabel === t('actionCard:remove');
            });
            await expect(hasRemoveButton).toBe(false);
        }
    },
};

export const RemoveOnly: Story = {
    args: {},
    render: (args) => {
        const { t } = getTranslation();
        const { onRemove: userOnRemove, removeBtnLabel, ...rest } = args;
        const removeLabel = removeBtnLabel ?? t('actionCard:remove');

        return (
            <ActionCardHoverLogger>
                <ActionCard
                    {...rest}
                    onRemove={createRemoveHandler(removeLabel, userOnRemove)}
                    removeBtnLabel={removeBtnLabel}>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Saved Item</h3>
                        <p className="text-sm text-muted-foreground">Product Name</p>
                        <p className="text-sm">$29.99</p>
                    </div>
                </ActionCard>
            </ActionCardHoverLogger>
        );
    },
    parameters: {
        docs: {
            description: {
                story: `
This story shows an ActionCard with only remove functionality:

### Features:
- **Remove button only**: Edit button is not rendered
- **Product information**: Shows saved item details
- **Destructive action**: Only removal functionality is available

### Use Cases:
- Saved items or wishlist entries
- Temporary content that can be removed
- Items that don't need editing functionality
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Test product information is displayed
        const titleElement = canvas.getByText('Saved Item');
        await expect(titleElement).toBeInTheDocument();

        const productName = canvas.getByText('Product Name');
        await expect(productName).toBeInTheDocument();

        const priceElement = canvas.getByText('$29.99');
        await expect(priceElement).toBeInTheDocument();

        // Test remove button is present and functional
        const removeButton = canvas.getByRole('button', { name: t('actionCard:remove') });
        await expect(removeButton).toBeInTheDocument();
        await expect(removeButton).not.toBeDisabled();

        // Test that edit button is not present (check before clicking remove)
        // Scope query to card footer to avoid matching buttons from Storybook UI
        // Verify the remove button is within the card footer
        const cardFooter = removeButton.closest('[data-slot="card-footer"]');
        await expect(cardFooter).toBeInTheDocument();
        if (cardFooter) {
            // Get all buttons in the footer
            const footerButtons = Array.from(cardFooter.querySelectorAll('button'));

            // Verify the remove button we found is in the footer
            await expect(footerButtons).toContain(removeButton);

            // Verify no Edit buttons exist in the footer
            // Check that no button in the footer has the edit text or aria-label
            const hasEditButton = footerButtons.some((btn) => {
                const text = btn.textContent?.trim() || '';
                const ariaLabel = btn.getAttribute('aria-label') || '';
                return text === t('actionCard:edit') || ariaLabel === t('actionCard:edit');
            });
            await expect(hasEditButton).toBe(false);
        }
    },
};

export const NoActions: Story = {
    args: {},
    render: (args) => (
        <ActionCardHoverLogger>
            <ActionCard {...args}>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Information Card</h3>
                    <p className="text-sm text-muted-foreground">This is a read-only information card</p>
                    <p className="text-sm">No actions are available for this content</p>
                </div>
            </ActionCard>
        </ActionCardHoverLogger>
    ),
    parameters: {
        docs: {
            description: {
                story: `
This story shows an ActionCard without any actions:

### Features:
- **No action buttons**: Neither edit nor remove buttons are rendered
- **Content only**: Just displays the card content
- **Read-only**: No interactive elements

### Use Cases:
- Information display cards
- Read-only content sections
- Static information that doesn't need actions
- Placeholder cards during loading states
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test card content is displayed
        const titleElement = canvas.getByText('Information Card');
        await expect(titleElement).toBeInTheDocument();

        // Test that the card renders without errors
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card).toBeInTheDocument();
    },
};

export const WithCustomLabels: Story = {
    args: {
        editBtnLabel: 'Modify Address',
        removeBtnLabel: 'Delete Address',
    },
    render: (args) => {
        const { t } = getTranslation();
        const { onEdit: userOnEdit, onRemove: userOnRemove, editBtnLabel, removeBtnLabel, ...rest } = args;
        const editLabel = editBtnLabel ?? t('actionCard:edit');
        const removeLabel = removeBtnLabel ?? t('actionCard:remove');

        return (
            <ActionCardHoverLogger>
                <ActionCard
                    {...rest}
                    onEdit={createEditHandler(editLabel, userOnEdit)}
                    onRemove={createRemoveHandler(removeLabel, userOnRemove)}
                    editBtnLabel={editBtnLabel}
                    removeBtnLabel={removeBtnLabel}>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Shipping Address</h3>
                        <p className="text-sm text-muted-foreground">Default Address</p>
                        <p className="text-sm">456 Oak Avenue</p>
                        <p className="text-sm">Los Angeles, CA 90210</p>
                    </div>
                </ActionCard>
            </ActionCardHoverLogger>
        );
    },
    parameters: {
        docs: {
            description: {
                story: `
This story demonstrates custom button labels:

### Features:
- **Custom edit label**: "Modify Address" instead of default "Edit"
- **Custom remove label**: "Delete Address" instead of default "Remove"
- **Accessibility**: Custom labels are used for ARIA attributes
- **Context-specific**: Labels provide better context for the action

### Use Cases:
- Context-specific actions that need clearer labels
- Multi-language applications
- Custom action terminology
- Better user experience with descriptive labels
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test address information is displayed
        const titleElement = canvas.getByText('Shipping Address');
        await expect(titleElement).toBeInTheDocument();

        const addressLine = canvas.getByText('456 Oak Avenue');
        await expect(addressLine).toBeInTheDocument();

        const cityState = canvas.getByText('Los Angeles, CA 90210');
        await expect(cityState).toBeInTheDocument();

        // Test custom edit button label
        const editButton = canvas.getByRole('button', { name: 'Modify Address' });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test custom remove button label
        const removeButton = canvas.getByRole('button', { name: 'Delete Address' });
        await expect(removeButton).toBeInTheDocument();
        await expect(removeButton).not.toBeDisabled();
    },
};

export const WithAsyncRemove: Story = {
    args: {
        onRemove: async () => {
            // Simulate async operation
            await new Promise((resolve) => setTimeout(resolve, 2000));
        },
    },
    render: (args) => {
        const { t } = getTranslation();
        const { onEdit: userOnEdit, onRemove: userOnRemove, editBtnLabel, removeBtnLabel, ...rest } = args;
        const editLabel = editBtnLabel ?? t('actionCard:edit');
        const removeLabel = removeBtnLabel ?? t('actionCard:remove');

        return (
            <ActionCardHoverLogger>
                <ActionCard
                    {...rest}
                    onEdit={createEditHandler(editLabel, userOnEdit)}
                    onRemove={createRemoveHandler(removeLabel, userOnRemove)}
                    editBtnLabel={editBtnLabel}
                    removeBtnLabel={removeBtnLabel}>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Complex Item</h3>
                        <p className="text-sm text-muted-foreground">This item requires server processing</p>
                        <p className="text-sm">Removal may take a few seconds</p>
                    </div>
                </ActionCard>
            </ActionCardHoverLogger>
        );
    },
    parameters: {
        docs: {
            description: {
                story: `
This story demonstrates the loading state when onRemove returns a promise:

### Features:
- **Loading overlay**: Shows spinner when remove is clicked
- **Disabled interaction**: Card content is not accessible during loading
- **Async operation**: Simulates a 2-second server operation
- **Accessibility**: Loading state is announced to screen readers

### Loading Behavior:
- Click the remove button to see the loading state
- Loading overlay covers the entire card
- Spinner animation indicates processing
- Card becomes interactive again after completion

### Use Cases:
- Server-side deletion operations
- Complex removal processes
- API calls that take time to complete
- Operations that require confirmation
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test complex item content is displayed
        const titleElement = canvas.getByText('Complex Item');
        await expect(titleElement).toBeInTheDocument();

        const description = canvas.getByText('This item requires server processing');
        await expect(description).toBeInTheDocument();

        // Test edit button is present and functional
        const editButton = canvas.getByRole('button', { name: /edit|change/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test remove button is present and functional
        const removeButton = canvas.getByRole('button', { name: /remove|delete/i });
        await expect(removeButton).toBeInTheDocument();
        await expect(removeButton).not.toBeDisabled();
    },
};
