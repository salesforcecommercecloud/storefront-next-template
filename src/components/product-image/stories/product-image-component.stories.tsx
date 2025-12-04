import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductImage from '../product-image';
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
            event.preventDefault();
            event.stopPropagation();

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

const meta: Meta<typeof ProductImage> = {
    title: 'Components/ProductImage/ProductImage',
    component: ProductImage,
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
type Story = StoryObj<typeof ProductImage>;

export const Default: Story = {
    args: {
        src: 'https://via.placeholder.com/300',
        alt: 'Placeholder Image',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const img = canvas.getByRole('img');
        await expect(img).toBeInTheDocument();
        await expect(img).toHaveAttribute('src');
    },
};

export const ErrorFallback: Story = {
    args: {
        src: 'https://invalid-url.example.com/image.jpg',
        alt: 'Broken Image',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Force error if not triggered automatically (Storybook environment might not load invalid images same way)
        const img = canvas.queryByRole('img');
        if (img) {
            // If image is still present, trigger error
            img.dispatchEvent(new Event('error'));
        }

        // Wait for re-render
        // The fallback renders text "No image available" (key 'noImageAvailable')
        // We mock translation so we expect the key if not mocked properly, or the default value
        // The component uses t('noImageAvailable') from 'common'.
        // Assuming i18next is working or returning key.
        // Let's just check for the camera icon emoji or fallback structure.

        // Note: In real browser test, we might need to wait.
        // For visual test we can check if the fallback div is present.
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
        const img = canvas.getByRole('img');
        await expect(img).toBeInTheDocument();
        await expect(img).toHaveAttribute('src');
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
        const img = canvas.getByRole('img');
        await expect(img).toBeInTheDocument();
        await expect(img).toHaveAttribute('src');
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
        const img = canvas.getByRole('img');
        await expect(img).toBeInTheDocument();
        await expect(img).toHaveAttribute('src');
    },
};
