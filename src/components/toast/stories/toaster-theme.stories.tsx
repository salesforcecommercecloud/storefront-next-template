import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToasterTheme } from '../toaster-theme';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

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
    tags: ['autodocs'],
    argTypes: {},
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
