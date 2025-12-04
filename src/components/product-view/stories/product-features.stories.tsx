import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductFeatures from '../product-features';
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

const meta: Meta<typeof ProductFeatures> = {
    title: 'Components/ProductView/ProductFeatures',
    component: ProductFeatures,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
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
type Story = StoryObj<typeof ProductFeatures>;

export const PlainText: Story = {
    args: {
        product: {
            longDescription: 'Feature 1 | Feature 2 | Feature 3',
        } as any,
        delimiter: '|',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Feature 1')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 2')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 3')).toBeInTheDocument();
    },
};

export const HtmlContent: Story = {
    args: {
        product: {
            longDescription: '<ul><li>HTML Feature 1</li><li>HTML Feature 2</li></ul>',
        } as any,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('HTML Feature 1')).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...PlainText,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Feature 1')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 2')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 3')).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...PlainText,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Feature 1')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 2')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 3')).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...PlainText,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Feature 1')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 2')).toBeInTheDocument();
        await expect(canvas.getByText('Feature 3')).toBeInTheDocument();
    },
};
