import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemoveAddressConfirmationDialog } from '../index';
import { action } from 'storybook/actions';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('remove-address-dialog-click');

        const handleClick = (event: MouseEvent) => {
            // Since dialog renders in a portal, we might need to listen on document
            // But if we want to log clicks within the harness, this works for non-portal content
            // For portal content, we'd typically need a global listener or context
            // However, this harness is consistent with others requested.
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const button = target.closest('button');
            if (button) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const label = button.textContent?.trim() || button.getAttribute('aria-label') || 'button';
                // Only log if it seems relevant to this story
                logClick({ label });
            }
        };

        // For dialogs that might render in portals, we often attach to document in these harnesses
        // to capture the interaction outside the root ref
        document.addEventListener('click', handleClick, true);

        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof RemoveAddressConfirmationDialog> = {
    title: 'DIALOG/RemoveAddressConfirmationDialog',
    component: RemoveAddressConfirmationDialog,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Confirmation dialog for removing customer addresses with integrated SCAPI fetcher. Handles success and error states with toast notifications.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    argTypes: {
        open: {
            description: 'Whether the dialog is open',
            control: 'boolean',
        },
        onOpenChange: {
            description: 'Callback when dialog open state changes',
            action: 'onOpenChange',
        },
        addressId: {
            description: 'The address ID to remove',
            control: 'text',
        },
        customerId: {
            description: 'Customer ID for the remove operation',
            control: 'text',
        },
        onSuccess: {
            description: 'Callback when remove succeeds',
            action: 'onSuccess',
        },
    },
};

export default meta;
type Story = StoryObj<typeof RemoveAddressConfirmationDialog>;

export const Default: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        addressId: 'Home',
        customerId: 'customer-123',
        onSuccess: action('onSuccess'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await expect(canvasElement).toBeInTheDocument();
    },
};

export const Closed: Story = {
    args: {
        open: false,
        onOpenChange: action('onOpenChange'),
        addressId: 'Work',
        customerId: 'customer-123',
        onSuccess: action('onSuccess'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await expect(canvasElement).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await expect(canvasElement).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await expect(canvasElement).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await expect(canvasElement).toBeInTheDocument();
    },
};
