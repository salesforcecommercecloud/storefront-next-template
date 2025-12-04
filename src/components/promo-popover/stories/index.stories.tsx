import type { Meta, StoryObj } from '@storybook/react-vite';
import PromoPopover from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function PromoPopoverStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('promo-popover-click');
        const logHover = action('promo-popover-hover');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const button = target.closest('button');
            if (button) {
                logClick({ button: button.getAttribute('aria-label') || '' });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            logHover({ element: target.tagName });
        };

        root.addEventListener('click', handleClick);
        root.addEventListener('mouseover', handleMouseOver);
        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PromoPopover> = {
    title: 'COMMON/Promo Popover',
    component: PromoPopover,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A popover component that displays promotional information when hovering over an info icon.

### Features:
- Info icon trigger
- Hover-activated popover
- Customizable header and content
- Used for promotions on products and orders
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <PromoPopoverStoryHarness>
                <Story />
            </PromoPopoverStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PromoPopover>;

export const Default: Story = {
    render: () => (
        <PromoPopover>
            <p>This is a promotional offer. Get 20% off on your next purchase!</p>
        </PromoPopover>
    ),
    parameters: {
        docs: {
            story: `
Standard promo popover with content only.

### Features:
- Info icon
- Content text
- Hover to view
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for info button
        const infoButton = await canvas.findByRole('button', { name: /info/i }, { timeout: 5000 });
        await expect(infoButton).toBeInTheDocument();
    },
};

export const WithHeader: Story = {
    render: () => (
        <PromoPopover header="Special Promotion">
            <p>This is a special promotional offer. Get 20% off on your next purchase when you spend over $100!</p>
        </PromoPopover>
    ),
    parameters: {
        docs: {
            story: `
Promo popover with header and content.

### Features:
- Header title
- Content text
- Separated by border
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for info button
        const infoButton = await canvas.findByRole('button', { name: /info/i }, { timeout: 5000 });
        await expect(infoButton).toBeInTheDocument();
    },
};

export const WithCustomContent: Story = {
    render: () => (
        <PromoPopover header="Free Shipping">
            <div>
                <p className="mb-2">Free shipping on orders over $50.</p>
                <p className="text-xs text-muted-foreground">Valid until end of month.</p>
            </div>
        </PromoPopover>
    ),
    parameters: {
        docs: {
            story: `
Promo popover with custom formatted content.

### Features:
- Custom HTML content
- Multiple paragraphs
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for info button
        const infoButton = await canvas.findByRole('button', { name: /info/i }, { timeout: 5000 });
        await expect(infoButton).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for info button
        const infoButton = await canvas.findByRole('button', { name: /info/i }, { timeout: 5000 });
        await expect(infoButton).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for info button
        const infoButton = await canvas.findByRole('button', { name: /info/i }, { timeout: 5000 });
        await expect(infoButton).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for info button
        const infoButton = await canvas.findByRole('button', { name: /info/i }, { timeout: 5000 });
        await expect(infoButton).toBeInTheDocument();
    },
};
