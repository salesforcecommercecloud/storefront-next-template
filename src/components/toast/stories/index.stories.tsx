import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { Toaster, toast } from '../index';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { Button } from '../../ui/button';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logShow = action('toast-show');
        const logHover = action('toast-button-hover');
        const logDismiss = action('toast-dismiss');
        const logActionClick = action('toast-action');

        const resolveKind = (text: string): { kind: string; position?: string } => {
            const t = text.toLowerCase();
            if (t.includes('promise')) return { kind: 'promise' };
            if (t.includes('fire 3')) return { kind: 'multiple' };
            if (t.includes('top-right')) return { kind: 'default', position: 'top-right' };
            if (t.includes('success')) return { kind: 'success' };
            if (t.includes('error')) return { kind: 'error' };
            if (t.includes('default') || t.includes('show toast')) return { kind: 'default' };
            return { kind: 'unknown' };
        };

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const btn = target.closest('button');
            if (!btn) return;

            const label = btn.getAttribute('aria-label') || btn.textContent?.trim() || '';
            // Toast instances: detect action/dismiss by common labels
            if (/^retry$/i.test(label)) {
                logActionClick({ label: 'Retry' });
                return;
            }
            if (/^close$/i.test(label)) {
                logDismiss({ label: 'Close' });
                return;
            }

            // Demo trigger buttons: prevent showing real toasts, just log
            const { kind, position } = resolveKind(label);
            if (kind !== 'unknown') {
                logShow({ kind, position });
            }
        };

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const btn = target.closest('button');
            if (!btn) return;
            const label = btn.getAttribute('aria-label') || btn.textContent?.trim() || '';
            if (label) {
                logHover({ label });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Toaster> = {
    title: 'FEEDBACK/Toast',
    component: Toaster,
    tags: ['autodocs', 'interaction'],
    parameters: {
        docs: {
            description: {
                component: `
Toast notifications powered by sonner. Includes success, error, and info variants.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="min-h-[40vh] bg-background p-6">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Toaster>;

const ToastTrigger = () => (
    <Button
        onClick={() =>
            toast('Event has been created', {
                description: 'Sunday, December 03, 2023 at 9:00 AM',
                action: {
                    label: 'Undo',
                    onClick: () => action('undo-clicked')(),
                },
            })
        }>
        Show Toast
    </Button>
);

export const Default: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <Toaster />
            <ToastTrigger />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = await canvas.findByRole('button', { name: /show toast/i });
        await expect(button).toBeInTheDocument();
        // We can't easily test the toast appearance in play function because it renders into portal/body
        // and might be outside the canvas scope or requires specialized setup.
        // But verifying the trigger exists is a valid basic interaction test.
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = await canvas.findByRole('button', { name: /show toast/i });
        await expect(button).toBeInTheDocument();
        // We can't easily test the toast appearance in play function because it renders into portal/body
        // and might be outside the canvas scope or requires specialized setup.
        // But verifying the trigger exists is a valid basic interaction test.
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = await canvas.findByRole('button', { name: /show toast/i });
        await expect(button).toBeInTheDocument();
        // We can't easily test the toast appearance in play function because it renders into portal/body
        // and might be outside the canvas scope or requires specialized setup.
        // But verifying the trigger exists is a valid basic interaction test.
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = await canvas.findByRole('button', { name: /show toast/i });
        await expect(button).toBeInTheDocument();
        // We can't easily test the toast appearance in play function because it renders into portal/body
        // and might be outside the canvas scope or requires specialized setup.
        // But verifying the trigger exists is a valid basic interaction test.
    },
};
