import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductSkeleton from '../index';
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

                if (label.match(/add to cart/i)) {
                    action('add-to-cart')({ label });
                } else if (label.match(/wishlist/i)) {
                    action('wishlist')({ label });
                } else {
                    logAction({ type: 'click', tag, label });
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

const meta: Meta<typeof ProductSkeleton> = {
    title: 'Components/ProductSkeleton',
    component: ProductSkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
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
type Story = StoryObj<typeof ProductSkeleton>;

export const Default: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Check for skeleton sections
        await expect(canvas.getByTestId('product-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('image-gallery-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('product-info-skeleton')).toBeInTheDocument();
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
        // Check for skeleton sections
        await expect(canvas.getByTestId('product-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('image-gallery-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('product-info-skeleton')).toBeInTheDocument();
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
        // Check for skeleton sections
        await expect(canvas.getByTestId('product-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('image-gallery-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('product-info-skeleton')).toBeInTheDocument();
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
        // Check for skeleton sections
        await expect(canvas.getByTestId('product-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('image-gallery-skeleton')).toBeInTheDocument();
        await expect(canvas.getByTestId('product-info-skeleton')).toBeInTheDocument();
    },
};
