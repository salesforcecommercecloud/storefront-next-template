import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductAccordion from '../product-accordion';
// @ts-expect-error mock file is JS
import { mockStandardProductOrderable } from '../../__mocks__/standard-product';
import { expect, within, userEvent } from 'storybook/test';
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

const meta: Meta<typeof ProductAccordion> = {
    title: 'Components/ProductView/ProductAccordion',
    component: ProductAccordion,
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
type Story = StoryObj<typeof ProductAccordion>;

export const Default: Story = {
    args: {
        product: mockStandardProductOrderable.product as any,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for accordion triggers
        const detailsTrigger = canvas.getByRole('button', { name: /product details/i });
        await expect(detailsTrigger).toBeInTheDocument();

        const shippingTrigger = canvas.getByRole('button', { name: /shipping & returns/i });
        await expect(shippingTrigger).toBeInTheDocument();

        // Open Details
        await userEvent.click(detailsTrigger);
        await expect(canvas.getByText(/grain deerskin leather/i)).toBeVisible();
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

        // Check for accordion triggers
        const detailsTrigger = canvas.getByRole('button', { name: /product details/i });
        await expect(detailsTrigger).toBeInTheDocument();

        const shippingTrigger = canvas.getByRole('button', { name: /shipping & returns/i });
        await expect(shippingTrigger).toBeInTheDocument();

        // Open Details
        await userEvent.click(detailsTrigger);
        await expect(canvas.getByText(/grain deerskin leather/i)).toBeVisible();
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

        // Check for accordion triggers
        const detailsTrigger = canvas.getByRole('button', { name: /product details/i });
        await expect(detailsTrigger).toBeInTheDocument();

        const shippingTrigger = canvas.getByRole('button', { name: /shipping & returns/i });
        await expect(shippingTrigger).toBeInTheDocument();

        // Open Details
        await userEvent.click(detailsTrigger);
        await expect(canvas.getByText(/grain deerskin leather/i)).toBeVisible();
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

        // Check for accordion triggers
        const detailsTrigger = canvas.getByRole('button', { name: /product details/i });
        await expect(detailsTrigger).toBeInTheDocument();

        const shippingTrigger = canvas.getByRole('button', { name: /shipping & returns/i });
        await expect(shippingTrigger).toBeInTheDocument();

        // Open Details
        await userEvent.click(detailsTrigger);
        await expect(canvas.getByText(/grain deerskin leather/i)).toBeVisible();
    },
};
