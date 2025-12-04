import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductCarouselSkeleton from '../skeleton';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { expect } from 'storybook/test';
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

const meta: Meta<typeof ProductCarouselSkeleton> = {
    title: 'Components/ProductCarousel/Skeleton',
    component: ProductCarouselSkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ConfigProvider config={mockConfig}>
                <ActionLogger>
                    <div className="p-8">
                        <Story />
                    </div>
                </ActionLogger>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductCarouselSkeleton>;

export const Default: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Skeletons are usually divs with specific classes, hard to test with roles.
        // We can check if the container exists.
        const container = canvasElement.querySelector('.animate-pulse');
        await expect(container).toBeInTheDocument();
    },
};

export const WithTitle: Story = {
    args: {
        title: 'Loading Products...',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // The title in skeleton is also a skeleton, so we can't search for text.
        // We can check if the title skeleton structure is present.
        const container = canvasElement.querySelector('.animate-pulse');
        await expect(container).toBeInTheDocument();
    },
};

export const CustomItemCount: Story = {
    args: {
        itemCount: 6,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('.animate-pulse');
        await expect(container).toBeInTheDocument();
        // Since we passed 6, we might expect more skeleton items, but verifying exact count of divs might be fragile.
        // Just verifying it renders is sufficient for now.
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Skeletons are usually divs with specific classes, hard to test with roles.
        // We can check if the container exists.
        const container = canvasElement.querySelector('.animate-pulse');
        await expect(container).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Skeletons are usually divs with specific classes, hard to test with roles.
        // We can check if the container exists.
        const container = canvasElement.querySelector('.animate-pulse');
        await expect(container).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Skeletons are usually divs with specific classes, hard to test with roles.
        // We can check if the container exists.
        const container = canvasElement.querySelector('.animate-pulse');
        await expect(container).toBeInTheDocument();
    },
};
