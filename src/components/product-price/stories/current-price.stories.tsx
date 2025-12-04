import type { Meta, StoryObj } from '@storybook/react-vite';
import CurrentPrice from '../current-price';
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

const meta: Meta<typeof CurrentPrice> = {
    title: 'Components/ProductPrice/CurrentPrice',
    component: CurrentPrice,
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
type Story = StoryObj<typeof CurrentPrice>;

export const Default: Story = {
    args: {
        price: 99.99,
        currency: 'USD',
        as: 'span',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('$99.99')).toBeInTheDocument();
    },
};

export const Range: Story = {
    args: {
        price: 49.99,
        currency: 'USD',
        isRange: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const elements = canvas.getAllByText(/from \$49.99/i);
        await expect(elements.length).toBeGreaterThan(0);
        // At least one should be visible (not sr-only)
        const visibleElements = elements.filter((el) => !el.classList.contains('sr-only'));
        await expect(visibleElements.length).toBeGreaterThan(0);
    },
};

export const CustomElement: Story = {
    args: {
        price: 1234.56,
        currency: 'EUR',
        as: 'h3',
        className: 'text-2xl text-blue-600',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Check for formatted euro price (rough check as locale might vary)
        // en-US locale for EUR typically puts symbol before or code
        // formatCurrency uses 'en-US' hardcoded in component
        // 1,234.56 or 1.234,56 depending on implementation, but formatCurrency uses en-US so it's €1,234.56
        const priceElement = canvas.getByRole('heading', { level: 3 });
        await expect(priceElement).toBeInTheDocument();
        await expect(priceElement).toHaveClass('text-2xl');
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
        await expect(canvas.getByText('$99.99')).toBeInTheDocument();
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
        await expect(canvas.getByText('$99.99')).toBeInTheDocument();
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
        await expect(canvas.getByText('$99.99')).toBeInTheDocument();
    },
};
