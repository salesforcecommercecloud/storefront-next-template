import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductImageContainer } from '../index';
// @ts-expect-error mock file is JS
import {
    mockStandardProductHit,
    mockMasterProductHitWithMultipleVariants,
} from '../../__mocks__/product-search-hit-data';
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

const meta: Meta<typeof ProductImageContainer> = {
    title: 'Components/ProductImage',
    component: ProductImageContainer,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="w-64 h-64">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductImageContainer>;

export const Default: Story = {
    args: {
        product: mockStandardProductHit,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
        await expect(image).toHaveAttribute('src');
    },
};

export const WithColorVariant: Story = {
    args: {
        product: mockMasterProductHitWithMultipleVariants,
        selectedColorValue: 'JJ5QZXX', // Begonia Pink
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
        // The src should correspond to the selected color variant
        // In the mock, Begonia Pink (JJ5QZXX) has specific images.
        // We can check if src contains parts of the expected URL if we want to be precise,
        // or just check it renders.
    },
};

export const CustomAspectRatio: Story = {
    args: {
        product: mockStandardProductHit,
        imgAspectRatio: 0.75, // Portrait
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
        // Aspect ratio is handled by CSS classes, we can check if image is present.
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
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
        await expect(image).toHaveAttribute('src');
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
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
        await expect(image).toHaveAttribute('src');
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
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
        await expect(image).toHaveAttribute('src');
    },
};
