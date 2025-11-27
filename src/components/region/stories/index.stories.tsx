import type { Meta, StoryObj } from '@storybook/react-vite';
import { Region } from '../index';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { vi } from 'vitest';

// Mock Component
vi.mock('../component', () => ({
    Component: ({
        component,
    }: {
        component: { id: string; typeId: string; name: string; data?: Record<string, unknown> };
    }) => <div data-testid={`component-${component.id}`}>Component: {component.name}</div>,
}));

const meta: Meta<typeof Region> = {
    title: 'REGION/Region',
    component: Region,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Renders a Page Designer region from Salesforce ShopperExperience API data. Creates a container structure and renders all components within the region.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {
        region: {
            description: 'Region object from Page Designer API',
            control: 'object',
        },
        componentData: {
            description: 'Promise of component data',
            control: 'object',
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Region>;

const mockRegion = {
    id: 'region-1',
    components: [
        {
            id: 'component-1',
            typeId: 'test-component',
            name: 'Test Component 1',
        },
        {
            id: 'component-2',
            typeId: 'test-component',
            name: 'Test Component 2',
        },
    ],
};

export const Default: Story = {
    args: {
        region: mockRegion,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const SingleComponent: Story = {
    args: {
        region: {
            id: 'region-2',
            components: [
                {
                    id: 'component-1',
                    typeId: 'test-component',
                    name: 'Single Component',
                },
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const Empty: Story = {
    args: {
        region: {
            id: 'region-3',
            components: [],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
