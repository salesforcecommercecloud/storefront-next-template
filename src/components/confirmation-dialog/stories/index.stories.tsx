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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

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
            description: {
                component: `
A reusable confirmation dialog component built on top of AlertDialog. Provides a consistent confirmation pattern across the application.

### Features:
- Customizable title and description
- Configurable button text
- Callback handlers for confirm and cancel
- Optional disabled state for confirm button
- ARIA labels for accessibility
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

function DefaultDialog() {
    const [open, setOpen] = useState(true);
    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={setOpen}
            title="Delete Item"
            description="Are you sure you want to delete this item? This action cannot be undone."
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            onCancel={() => {
                action('cancel-clicked')();
                setOpen(false);
            }}
            onConfirm={() => {
                action('confirm-clicked')();
                setOpen(false);
            }}
        />
    );
}

export const Default: Story = {
    render: () => <DefaultDialog />,
    parameters: {
        docs: {
            story: `
Standard confirmation dialog for delete actions.

### Features:
- Clear title and description
- Cancel and confirm buttons
- Closes on button click
            `,
        },
    },
    play: async () => {
        const documentBody = within(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('alertdialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check for title
        const title = await documentBody.findByText(/delete item/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for description
        const description = await documentBody.findByText(/are you sure/i, {}, { timeout: 5000 });
        await expect(description).toBeInTheDocument();

        // Check for buttons
        const cancelButton = await documentBody.findByRole('button', { name: /cancel/i }, { timeout: 5000 });
        await expect(cancelButton).toBeInTheDocument();

        const confirmButton = await documentBody.findByRole('button', { name: /delete/i }, { timeout: 5000 });
        await expect(confirmButton).toBeInTheDocument();
    },
};

function DisabledConfirmDialog() {
    const [open, setOpen] = useState(true);
    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={setOpen}
            title="Confirm Action"
            description="Please review the information before confirming."
            cancelButtonText="Cancel"
            confirmButtonText="Confirm"
            confirmButtonDisabled={true}
            onCancel={() => {
                action('cancel-clicked')();
                setOpen(false);
            }}
            onConfirm={() => {
                action('confirm-clicked')();
                setOpen(false);
            }}
        />
    );
}

export const DisabledConfirm: Story = {
    render: () => <DisabledConfirmDialog />,
    parameters: {
        docs: {
            story: `
Confirmation dialog with disabled confirm button.

### Features:
- Confirm button is disabled
- Useful for validation scenarios
            `,
        },
    },
    play: async () => {
        const documentBody = within(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('alertdialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check for disabled confirm button
        const confirmButton = await documentBody.findByRole('button', { name: /confirm/i }, { timeout: 5000 });
        await expect(confirmButton).toBeDisabled();
    },
};

function ClosedDialog() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>Open Dialog</button>
            <ConfirmationDialog
                open={open}
                onOpenChange={setOpen}
                title="Test Dialog"
                description="This dialog is closed by default."
                cancelButtonText="Cancel"
                confirmButtonText="OK"
                onCancel={() => setOpen(false)}
                onConfirm={() => setOpen(false)}
            />
        </>
    );
}

export const Closed: Story = {
    render: () => <ClosedDialog />,
    parameters: {
        docs: {
            story: `
Confirmation dialog in closed state.

### Features:
- Dialog is not visible
- Can be opened via button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check that dialog is not visible
        const openButton = await canvas.findByRole('button', { name: /open dialog/i }, { timeout: 5000 });
        await expect(openButton).toBeInTheDocument();

        // Dialog should not be in document body
        const documentBody = within(document.body);
        const dialog = documentBody.queryByRole('alertdialog');
        await expect(dialog).toBeNull();
    },
};
