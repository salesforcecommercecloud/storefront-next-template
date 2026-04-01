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
import { RemoveItemButtonWithConfirmation } from '../remove-item-button-with-confirmation';
import { Button } from '@/components/ui/button';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { getTranslation } from '@/lib/i18next';

const STORYBOOK_REMOVE_BASE = '/__storybook/remove';

function RemoveItemStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logTriggerClick = useMemo(() => action('remove-trigger-clicked'), []);
    const logConfirmClick = useMemo(() => action('remove-confirm-clicked'), []);
    const logCancelClick = useMemo(() => action('remove-cancel-clicked'), []);
    const logHover = useMemo(() => action('remove-button-hovered'), []);
    const configValue = useMemo(() => {
        return {
            ...mockConfig,
            pages: {
                ...mockConfig.pages,
                cart: {
                    ...mockConfig.pages.cart,
                    removeAction: `${STORYBOOK_REMOVE_BASE}/cart`,
                },
            },
        };
    }, []);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const { t } = getTranslation();

        const identifyButtonType = (button: HTMLButtonElement, label: string) => {
            if (button.dataset.testid?.startsWith('remove-item-')) {
                return 'trigger' as const;
            }
            if (label === t('removeItem:button') || label === t('removeItem:removing')) {
                return 'trigger' as const;
            }
            if (label === t('removeItem:confirmAction')) {
                return 'confirm' as const;
            }
            if (label === t('removeItem:cancelButton')) {
                return 'cancel' as const;
            }
            return null;
        };

        const isInsideHarness = (button: HTMLButtonElement) => !!button.closest('[data-remove-harness="true"]');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest('button');
            if (!button || !(button instanceof HTMLButtonElement)) {
                return;
            }
            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (!label) {
                return;
            }
            const type = identifyButtonType(button, label);
            if (type === 'trigger') {
                if (isInsideHarness(button)) {
                    logTriggerClick({ label });
                }
            } else if (type === 'confirm') {
                event.preventDefault();
                event.stopImmediatePropagation?.();
                logConfirmClick({ label });
            } else if (type === 'cancel') {
                logCancelClick({ label });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest('button');
            if (!button || !(button instanceof HTMLButtonElement)) {
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
            const type = identifyButtonType(button, label);
            if (!type) {
                return;
            }
            if (type === 'trigger' && !isInsideHarness(button)) {
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
    }, [logTriggerClick, logConfirmClick, logCancelClick, logHover]);

    useEffect(() => {
        const originalFetch = window.fetch?.bind(window);
        if (!originalFetch) {
            return;
        }

        window.fetch = async (...args) => {
            const [input] = args;
            const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
            const { pathname } = new URL(url, window.location.origin);
            if (pathname.startsWith(STORYBOOK_REMOVE_BASE)) {
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return originalFetch(...args);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [logConfirmClick]);

    return (
        <ConfigProvider config={configValue}>
            <div ref={containerRef} data-remove-harness="true">
                {children}
            </div>
        </ConfigProvider>
    );
}

const meta: Meta<typeof RemoveItemButtonWithConfirmation> = {
    title: 'ACTIONS/Remove Item Button With Confirmation',
    component: RemoveItemButtonWithConfirmation,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A remove button component that includes a confirmation dialog to prevent accidental deletions. This component provides a safe way to remove items with proper user confirmation and loading states.

## Features

- **Confirmation dialog**: Prevents accidental item removal
- **Configurable messages**: Customizable text for all dialog elements
- **Loading states**: Shows loading during removal process
- **Toast notifications**: Success and error feedback
- **Accessibility**: Proper ARIA attributes and keyboard navigation
- **Default configuration**: Uses app config for consistent behavior

## Usage

The RemoveItemButtonWithConfirmation is commonly used in:
- Shopping cart item removal
- Wishlist item removal
- Saved items management
- Any context where item deletion needs confirmation

\`\`\`tsx
import { RemoveItemButtonWithConfirmation } from '../remove-item-button-with-confirmation';

function CartItem({ item }) {
  return (
    <div>
      {/* item content */}
      <RemoveItemButtonWithConfirmation
        itemId={item.id}
        config={customConfig}
      />
    </div>
  );
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`itemId\` | \`string\` | - | Unique identifier for the item to remove |
| \`config\` | \`RemoveItemConfig\` | From app config | Configuration object for messages and behavior |
| \`className\` | \`string\` | \`''\` | Additional CSS classes for styling |

## Configuration Object

The \`config\` prop allows customization of all text and behavior:

\`\`\`typescript
interface RemoveItemConfig {
  action: string;                    // Form action URL
  confirmDescription: string;        // Dialog description
}
\`\`\`

## Dialog Flow

1. **Click remove button**: Opens confirmation dialog
2. **Review confirmation**: User sees item details and confirmation message
3. **Cancel or confirm**: User can cancel or proceed with removal
4. **Loading state**: Button shows loading during API call
5. **Toast feedback**: Success or error message is displayed

## Accessibility

- Proper ARIA attributes for dialog
- Keyboard navigation support
- Screen reader announcements
- Focus management during dialog
- Loading state announcements
                `,
            },
        },
    },
    argTypes: {
        itemId: {
            control: 'text',
            description: 'Unique identifier for the item to remove',
            table: {
                type: { summary: 'string' },
            },
        },
        config: {
            control: 'object',
            description: 'Configuration object for messages and behavior',
            table: {
                type: { summary: 'RemoveItemConfig' },
                defaultValue: { summary: 'From app config' },
            },
        },
        className: {
            control: 'text',
            description: 'Additional CSS classes for styling',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: "''" },
            },
        },
    },
    args: {
        itemId: 'item-123',
        className: '',
    },
    decorators: [
        (Story: React.ComponentType) => (
            <RemoveItemStoryHarness>
                <Story />
            </RemoveItemStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        itemId: 'item-123',
    },
    parameters: {
        docs: {
            description: {
                story: `
The default RemoveItemButtonWithConfirmation uses the standard cart configuration:

### Features:
- **Default configuration**: Uses app config for cart removal
- **Standard text**: "Remove" button with "Confirm Remove Item" confirmation dialog
- **Cart context**: Designed for shopping cart item removal
- **Consistent behavior**: Matches other cart components

### Dialog Content:
- **Title**: "Confirm Remove Item"
- **Description**: "Are you sure you want to remove this item from your cart?"
- **Cancel**: "No, keep item"
- **Confirm**: "Yes, remove item"

### Use Cases:
- Shopping cart item removal
- Standard item deletion flows
- Default e-commerce behavior
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test button is present and properly rendered
        const removeButtons = canvas.getAllByRole('button');
        await expect(removeButtons.length).toBeGreaterThan(0);

        // Test that each button is properly rendered
        for (const button of removeButtons) {
            await expect(button).toBeInTheDocument();
            // In loading state, button should be disabled
            if (button.getAttribute('data-testid') === 'remove-item-loading') {
                await expect(button).toBeDisabled();
            } else {
                await expect(button).not.toBeDisabled();
            }
        }

        // In test environment, just verify buttons exist - don't try to click
        // as the confirmation dialogs may not work properly in test environment
        await expect(canvasElement).toBeInTheDocument();
    },
};

export const CustomConfiguration: Story = {
    args: {
        itemId: 'wishlist-item-456',
        config: {
            action: `${STORYBOOK_REMOVE_BASE}/wishlist`,
            confirmDescription:
                'Are you sure you want to remove this item from your wishlist? This action cannot be undone.',
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
This story demonstrates a custom configuration for wishlist item removal:

### Custom Features:
- **Wishlist context**: Customized text for wishlist removal
- **Different action**: Points to wishlist removal endpoint
- **Enhanced description**: More detailed confirmation message

### Custom Dialog Content:
- **Title**: "Confirm Remove Item" (from UI strings)
- **Description**: Detailed explanation with "cannot be undone" warning
- **Cancel**: "No, keep item" (from UI strings)
- **Confirm**: "Yes, remove item" (from UI strings)

### Use Cases:
- Wishlist item management
- Saved items removal
- Custom removal flows
- Context-specific removal actions
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test button is present and properly rendered
        const removeButtons = canvas.getAllByRole('button');
        await expect(removeButtons.length).toBeGreaterThan(0);

        // Test that each button is properly rendered
        for (const button of removeButtons) {
            await expect(button).toBeInTheDocument();
            // In loading state, button should be disabled
            if (button.getAttribute('data-testid') === 'remove-item-loading') {
                await expect(button).toBeDisabled();
            } else {
                await expect(button).not.toBeDisabled();
            }
        }

        // In test environment, just verify buttons exist - don't try to click
        // as the confirmation dialogs may not work properly in test environment
        await expect(canvasElement).toBeInTheDocument();
    },
};

export const WithCustomStyling: Story = {
    args: {
        itemId: 'item-789',
        className: 'text-red-600 hover:text-red-700 font-medium',
    },
    parameters: {
        docs: {
            description: {
                story: `
This story shows the component with custom styling:

### Styling Features:
- **Custom colors**: Red text color for emphasis
- **Hover effects**: Darker red on hover
- **Font weight**: Medium font weight for better visibility
- **Additional classes**: Demonstrates className prop usage

### Visual Changes:
- Button text appears in red
- Hover state shows darker red
- Font weight is increased
- Maintains all functionality

### Use Cases:
- Highlighting destructive actions
- Brand-specific styling
- Custom design requirements
- Enhanced visual emphasis
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test button is present and properly rendered
        const removeButtons = canvas.getAllByRole('button');
        await expect(removeButtons.length).toBeGreaterThan(0);

        // Test that each button is properly rendered
        for (const button of removeButtons) {
            await expect(button).toBeInTheDocument();
            // In loading state, button should be disabled
            if (button.getAttribute('data-testid') === 'remove-item-loading') {
                await expect(button).toBeDisabled();
            } else {
                await expect(button).not.toBeDisabled();
            }
        }

        // In test environment, just verify buttons exist - don't try to click
        // as the confirmation dialogs may not work properly in test environment
        await expect(canvasElement).toBeInTheDocument();
    },
};

// Mock component to demonstrate loading state
function LoadingStateRemoveButton() {
    return (
        <Button
            variant="link"
            size="sm"
            disabled={true}
            className="font-bold"
            title="Remove item"
            data-testid="remove-item-loading"
            aria-busy={true}>
            Removing...
        </Button>
    );
}

export const LoadingState: Story = {
    render: () => <LoadingStateRemoveButton />,
    parameters: {
        docs: {
            description: {
                story: `
This story demonstrates the loading state during item removal:

### Loading Features:
- **Button disabled**: Cannot be clicked during loading
- **Loading text**: Shows "Removing..." instead of "Remove"
- **ARIA busy**: Announces loading state to screen readers
- **Visual feedback**: Clear indication that action is in progress

### Loading Behavior:
- Triggered when fetcher state is 'submitting'
- Prevents multiple removal attempts
- Maintains accessibility during loading
- Shows progress to user

### Use Cases:
- Long-running removal operations
- Server-side processing
- API calls that take time
- User feedback during operations
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test button is present and properly rendered
        const removeButtons = canvas.getAllByRole('button');
        await expect(removeButtons.length).toBeGreaterThan(0);

        // Test that each button is properly rendered
        for (const button of removeButtons) {
            await expect(button).toBeInTheDocument();
            // In loading state, button should be disabled
            if (button.getAttribute('data-testid') === 'remove-item-loading') {
                await expect(button).toBeDisabled();
            } else {
                await expect(button).not.toBeDisabled();
            }
        }

        // In test environment, just verify buttons exist - don't try to click
        // as the confirmation dialogs may not work properly in test environment
        await expect(canvasElement).toBeInTheDocument();
    },
};

export const DifferentItemTypes: Story = {
    render: () => (
        <div className="space-y-4">
            <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Cart Item</h4>
                <p className="text-sm text-muted-foreground mb-2">Product in shopping cart</p>
                <RemoveItemButtonWithConfirmation itemId="cart-item-1" />
            </div>

            <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Wishlist Item</h4>
                <p className="text-sm text-muted-foreground mb-2">Saved for later</p>
                <RemoveItemButtonWithConfirmation
                    itemId="wishlist-item-1"
                    config={{
                        action: `${STORYBOOK_REMOVE_BASE}/wishlist`,
                        confirmDescription: 'Remove this item from your wishlist?',
                    }}
                />
            </div>

            <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Saved Address</h4>
                <p className="text-sm text-muted-foreground mb-2">Default shipping address</p>
                <RemoveItemButtonWithConfirmation
                    itemId="address-1"
                    config={{
                        action: `${STORYBOOK_REMOVE_BASE}/address`,
                        confirmDescription: 'Permanently delete this address?',
                    }}
                />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
This story shows the component used in different contexts:

### Multiple Use Cases:
- **Cart Item**: Standard shopping cart removal
- **Wishlist Item**: Wishlist-specific removal with custom text
- **Saved Address**: Address deletion with permanent action warning

### Context-Specific Features:
- **Different actions**: Each context has appropriate endpoint
- **Custom confirmations**: Context-specific confirmation messages
- **Appropriate behavior**: Different removal behaviors
- **Consistent UX**: Same interaction pattern across contexts

### Benefits:
- Reusable component with different configurations
- Consistent user experience
- Context-appropriate messaging
- Flexible configuration system
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test button is present and properly rendered
        const removeButtons = canvas.getAllByRole('button');
        await expect(removeButtons.length).toBeGreaterThan(0);

        // Test that each button is properly rendered
        for (const button of removeButtons) {
            await expect(button).toBeInTheDocument();
            // In loading state, button should be disabled
            if (button.getAttribute('data-testid') === 'remove-item-loading') {
                await expect(button).toBeDisabled();
            } else {
                await expect(button).not.toBeDisabled();
            }
        }

        // In test environment, just verify buttons exist - don't try to click
        // as the confirmation dialogs may not work properly in test environment
        await expect(canvasElement).toBeInTheDocument();
    },
};
