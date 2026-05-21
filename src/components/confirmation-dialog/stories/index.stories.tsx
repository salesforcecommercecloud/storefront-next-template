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
import { ConfirmationDialog } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { Button } from '@/components/ui/button';

function ConfirmationDialogStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('confirmation-dialog-click');
        const logConfirm = action('confirmation-dialog-confirm');
        const logCancel = action('confirmation-dialog-cancel');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const button = target.closest('button');
            if (button) {
                const text = button.textContent?.trim() || '';
                if (
                    text.toLowerCase().includes('confirm') ||
                    text.toLowerCase().includes('delete') ||
                    text.toLowerCase().includes('remove')
                ) {
                    logConfirm({ button: text });
                } else if (text.toLowerCase().includes('cancel')) {
                    logCancel({ button: text });
                } else {
                    logClick({ button: text });
                }
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ConfirmationDialog> = {
    title: 'COMMON/Confirmation Dialog',
    component: ConfirmationDialog,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            story: { inline: false, height: '600px' },
            description: {
                component: `
A reusable confirmation dialog component built on top of AlertDialog. Provides a consistent confirmation pattern across the application.

### Features:
- Customizable title and description
- Configurable button text
- Callback handlers for confirm and cancel
- ARIA labels for accessibility

### Story render pattern
The stories below open with the dialog closed and render an "Open dialog" trigger button. This matches the production usage pattern (a parent component owns the open state and toggles it on user interaction) and avoids the docs-page rendering problem where a \`position: fixed\` modal opened inline gets clipped by the preview block.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfirmationDialogStoryHarness>
                <Story />
            </ConfirmationDialogStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ConfirmationDialog>;

/**
 * Stories render a closed dialog plus an "Open dialog" trigger button. This
 * matches production usage (a parent component owns the open state and
 * toggles it on user interaction) and avoids the docs-page rendering problem
 * where a `position: fixed` modal opened inline gets clipped by the preview
 * block. The play function clicks the trigger so interaction tests still
 * exercise the open state.
 */
function DialogStory({
    title,
    description,
    cancelButtonText,
    confirmButtonText,
    triggerText = 'Open dialog',
}: {
    title: string;
    description: string;
    cancelButtonText: string;
    confirmButtonText: string;
    triggerText?: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button onClick={() => setOpen(true)}>{triggerText}</Button>
            <ConfirmationDialog
                open={open}
                onOpenChange={setOpen}
                title={title}
                description={description}
                cancelButtonText={cancelButtonText}
                confirmButtonText={confirmButtonText}
                onCancel={() => {
                    action('cancel-clicked')();
                    setOpen(false);
                }}
                onConfirm={() => {
                    action('confirm-clicked')();
                    setOpen(false);
                }}
            />
        </>
    );
}

export const Default: Story = {
    render: () => (
        <DialogStory
            title="Delete Item"
            description="Are you sure you want to delete this item? This action cannot be undone."
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            triggerText="Delete item"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Standard delete-confirmation dialog. Click the trigger to open.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = await canvas.findByRole('button', { name: /delete item/i }, { timeout: 5000 });
        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const dialog = await documentBody.findByRole('alertdialog', {}, { timeout: 5000 });
        const inDialog = within(dialog);
        await expect(inDialog.getByRole('heading', { name: /delete item/i })).toBeInTheDocument();
        await expect(inDialog.getByText(/are you sure/i)).toBeInTheDocument();
        await expect(inDialog.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
        await expect(inDialog.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    },
};

export const LongContent: Story = {
    render: () => (
        <DialogStory
            title="Delete Account"
            description={
                'You are about to delete this account. This is irreversible. ' +
                'All your saved addresses, payment methods, order history, wishlists, and personal preferences will be permanently removed. ' +
                'Any in-progress orders will be cancelled and refunds will be processed within 5–7 business days. ' +
                'Subscriptions tied to this account will be terminated at the end of the current billing cycle. ' +
                'Reward points, store credit, and gift card balances will be forfeited and cannot be restored. ' +
                'If you have questions, contact support before continuing — once confirmed, this action cannot be undone.'
            }
            cancelButtonText="Keep Account"
            confirmButtonText="Delete Account"
            triggerText="Delete account"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Long descriptive copy renders without breaking the dialog layout. Click the trigger to open.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = await canvas.findByRole('button', { name: /delete account/i }, { timeout: 5000 });
        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const dialog = await documentBody.findByRole('alertdialog', {}, { timeout: 5000 });
        const inDialog = within(dialog);
        // 'Delete Account' renders as both the dialog title and the confirm
        // button label; query each by its semantic role to disambiguate.
        await expect(inDialog.getByRole('heading', { name: /delete account/i })).toBeInTheDocument();
        await expect(inDialog.getByText(/cannot be undone/i)).toBeInTheDocument();
        await expect(inDialog.getByRole('button', { name: /keep account/i })).toBeInTheDocument();
        await expect(inDialog.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
    },
};
