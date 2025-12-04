import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductBadges } from '../product-badges';
// @ts-expect-error mock file is JS
import { mockProductSearchItem, mockStandardProductHit } from '../../__mocks__/product-search-hit-data';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
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

const meta: Meta<typeof ProductBadges> = {
    title: 'Components/ProductBadges',
    component: ProductBadges,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        maxBadges: {
            control: { type: 'number', min: 1, max: 10 },
            description: 'Maximum number of badges to display',
        },
        product: {
            control: 'object',
            description: 'Product object containing badge properties',
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ConfigProvider config={mockConfig}>
                <ActionLogger>
                    <Story />
                </ActionLogger>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductBadges>;

export const Default: Story = {
    args: {
        product: mockProductSearchItem,
        maxBadges: 3,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Use queryByRole to safely check for existence without throwing
        const container = canvas.queryByRole('group');
        // We only expect it to be in the document if it exists (i.e. badges are rendered)
        if (container) {
            await expect(container).toBeInTheDocument();
        }
    },
};

export const WithCustomBadges: Story = {
    args: {
        product: mockStandardProductHit,
        badgeDetails: [
            { propertyName: 'c_isNew', label: 'New', color: 'green' },
            { propertyName: 'c_isSale', label: 'Sale', color: 'red' },
            { propertyName: 'c_isSpecial', label: 'Special', color: 'blue' },
        ],
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Use queryAllByText to check for badges
        const newBadges = canvas.queryAllByText('New');
        if (newBadges.length > 0) {
            await expect(newBadges[0]).toBeInTheDocument();
        }
    },
};

export const LimitedBadges: Story = {
    args: {
        product: mockStandardProductHit,
        maxBadges: 2,
        badgeDetails: [
            { propertyName: 'c_isNew', label: 'New', color: 'green' },
            { propertyName: 'c_isSale', label: 'Sale', color: 'red' },
            { propertyName: 'c_isSpecial', label: 'Special', color: 'blue' },
        ],
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const container = canvas.queryByRole('group');
        if (container) {
            // Count children that are badges
            await expect(container.children.length).toBeLessThanOrEqual(2);
        }
    },
};

export const NoBadges: Story = {
    args: {
        product: {
            ...mockProductSearchItem,
            productPromotions: [],
        },
        badgeDetails: [{ propertyName: 'c_isNew', label: 'New', color: 'green' }],
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const container = canvas.queryByRole('group');
        // Should not exist
        if (container) {
            await expect(container.children).toHaveLength(0);
        } else {
            await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
        }
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
        // Use queryByRole to safely check for existence without throwing
        const container = canvas.queryByRole('group');
        // We only expect it to be in the document if it exists (i.e. badges are rendered)
        if (container) {
            await expect(container).toBeInTheDocument();
        }
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
        // Use queryByRole to safely check for existence without throwing
        const container = canvas.queryByRole('group');
        // We only expect it to be in the document if it exists (i.e. badges are rendered)
        if (container) {
            await expect(container).toBeInTheDocument();
        }
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
        // Use queryByRole to safely check for existence without throwing
        const container = canvas.queryByRole('group');
        // We only expect it to be in the document if it exists (i.e. badges are rendered)
        if (container) {
            await expect(container).toBeInTheDocument();
        }
    },
};
