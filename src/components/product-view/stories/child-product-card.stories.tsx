import type { Meta, StoryObj } from '@storybook/react-vite';
import ChildProductCard from '../child-product-card';
import { bundleProd } from '../../__mocks__/bundle-product';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import ProductViewProvider from '@/providers/product-view';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

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

const meta: Meta<typeof ChildProductCard> = {
    title: 'Components/ProductView/ChildProductCard',
    component: ChildProductCard,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story, context) => (
            <ConfigProvider config={mockConfig}>
                <ProductViewProvider product={context.args.parentProduct as any} mode="add">
                    <ActionLogger>
                        <div className="w-80">
                            <Story />
                        </div>
                    </ActionLogger>
                </ProductViewProvider>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ChildProductCard>;

const firstChild = bundleProd.bundledProducts![0].product;

export const Default: Story = {
    args: {
        childProduct: firstChild as any,
        parentProduct: bundleProd as any,
        onSelectionChange: action('onSelectionChange'),
        onOrderabilityChange: action('onOrderabilityChange'),
        swatchMode: 'uncontrolled',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(firstChild.name || '')).toBeInTheDocument();
        // Should have link swatches in uncontrolled mode
    },
};

export const Controlled: Story = {
    args: {
        childProduct: firstChild as any,
        parentProduct: bundleProd as any,
        onSelectionChange: action('onSelectionChange'),
        onOrderabilityChange: action('onOrderabilityChange'),
        swatchMode: 'controlled',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(firstChild.name || '')).toBeInTheDocument();
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
        await expect(canvas.getByText(firstChild.name || '')).toBeInTheDocument();
        // Should have link swatches in uncontrolled mode
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
        await expect(canvas.getByText(firstChild.name || '')).toBeInTheDocument();
        // Should have link swatches in uncontrolled mode
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
        await expect(canvas.getByText(firstChild.name || '')).toBeInTheDocument();
        // Should have link swatches in uncontrolled mode
    },
};
