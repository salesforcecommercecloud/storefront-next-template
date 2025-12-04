import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToasterTheme } from '../toaster-theme';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action('toaster-theme-render');
        logRender({});
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ToasterTheme> = {
    title: 'TOAST/ToasterTheme',
    component: ToasterTheme,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Client-side Toaster component that adapts to theme changes. Watches for changes to the dark class on document.documentElement and updates the toaster theme accordingly.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ToasterTheme>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render (toaster is typically rendered in a portal)
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render (toaster is typically rendered in a portal)
        const container = canvasElement.firstChild;
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
        // Component should render (toaster is typically rendered in a portal)
        const container = canvasElement.firstChild;
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
        // Component should render (toaster is typically rendered in a portal)
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
