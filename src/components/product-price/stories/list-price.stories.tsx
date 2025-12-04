import type { Meta, StoryObj } from '@storybook/react-vite';
import ListPrice from '../list-price';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logAction = action('interaction');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactiveElement = target.closest('button, a, [role="button"]');
            if (interactiveElement) {
                const label = interactiveElement.textContent?.trim().substring(0, 50) || 'unlabeled';
                const tag = interactiveElement.tagName.toLowerCase();

                logAction({ type: 'click', tag, label });
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ListPrice> = {
    title: 'Components/ProductPrice/ListPrice',
    component: ListPrice,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ListPrice>;

export const Default: Story = {
    args: {
        price: 129.99,
        currency: 'USD',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const price = canvas.getByText('$129.99');
        await expect(price).toBeInTheDocument();
        await expect(price).toHaveClass('line-through');
    },
};

export const Range: Story = {
    args: {
        price: 89.99,
        currency: 'USD',
        isRange: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // List price currently doesn't add 'From' text in the visible part based on code read,
        // only in aria-label. Let's double check implementation.
        // Implementation: const ariaLabel = isRange ? `List price from ${listPriceText || ''}` : ...
        // The visible text is just {listPriceText}
        await expect(canvas.getByText('$89.99')).toBeInTheDocument();
        await expect(canvas.getByText('$89.99')).toHaveAttribute(
            'aria-label',
            expect.stringContaining('List price from')
        );
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
        const price = canvas.getByText('$129.99');
        await expect(price).toBeInTheDocument();
        await expect(price).toHaveClass('line-through');
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
        const price = canvas.getByText('$129.99');
        await expect(price).toBeInTheDocument();
        await expect(price).toHaveClass('line-through');
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
        const price = canvas.getByText('$129.99');
        await expect(price).toBeInTheDocument();
        await expect(price).toHaveClass('line-through');
    },
};
