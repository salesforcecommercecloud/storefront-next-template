import type { Meta, StoryObj } from '@storybook/react-vite';
import { RegionWrapper } from '../region-wrapper';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { vi } from 'vitest';

// Mock design mode
vi.mock('@salesforce/storefront-next-runtime/design', () => ({
    isDesignModeActive: vi.fn(() => false),
}));

const meta: Meta<typeof RegionWrapper> = {
    title: 'REGION/RegionWrapper',
    component: RegionWrapper,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Smart wrapper that conditionally applies design mode decoration. Automatically detects design mode and applies the appropriate decorator for Page Designer.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {
        region: {
            description: 'Region object from Page Designer API',
            control: 'object',
        },
        children: {
            description: 'Child components to render within the region',
            control: false,
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
        designMetadata: {
            description: 'Design metadata for Page Designer',
            control: 'object',
        },
    },
};

export default meta;
type Story = StoryObj<typeof RegionWrapper>;

const mockRegion = {
    id: 'region-1',
    components: [],
};

export const Default: Story = {
    args: {
        region: mockRegion,
        children: <div>Child Content</div>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const WithMultipleChildren: Story = {
    args: {
        region: mockRegion,
        children: (
            <>
                <div>Child 1</div>
                <div>Child 2</div>
                <div>Child 3</div>
            </>
        ),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
