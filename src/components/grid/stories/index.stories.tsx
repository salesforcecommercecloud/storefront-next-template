import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function GridStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action('grid-render');
        logRender({ component: 'Grid' });
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Grid> = {
    title: 'COMMON/Grid',
    component: Grid,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A flexible grid component based on Radix UI Themes Grid API. Provides responsive grid layouts with customizable columns and flow.

### Features:
- Configurable columns (1-6)
- Grid flow options
- Padding utilities
- Customizable display mode
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <GridStoryHarness>
                <Story />
            </GridStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Grid>;

export const Default: Story = {
    render: () => (
        <Grid columns="3" className="gap-4">
            <div className="bg-muted p-4 rounded">Item 1</div>
            <div className="bg-muted p-4 rounded">Item 2</div>
            <div className="bg-muted p-4 rounded">Item 3</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Standard 3-column grid layout.

### Features:
- 3 columns
- Default grid flow
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for grid items
        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const TwoColumns: Story = {
    render: () => (
        <Grid columns="2" className="gap-4">
            <div className="bg-muted p-4 rounded">Item 1</div>
            <div className="bg-muted p-4 rounded">Item 2</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Two-column grid layout.

### Features:
- 2 columns
- Responsive design
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for grid items
        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const WithFlow: Story = {
    render: () => (
        <Grid columns="3" flow="dense" className="gap-4">
            <div className="bg-muted p-4 rounded">Item 1</div>
            <div className="bg-muted p-4 rounded">Item 2</div>
            <div className="bg-muted p-4 rounded">Item 3</div>
            <div className="bg-muted p-4 rounded">Item 4</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Grid with dense flow for better space utilization.

### Features:
- Dense flow
- Automatic item placement
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for grid items
        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const InlineGrid: Story = {
    render: () => (
        <Grid display="inline-grid" columns="2" className="gap-2">
            <div className="bg-muted p-2 rounded">A</div>
            <div className="bg-muted p-2 rounded">B</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Inline grid display mode.

### Features:
- Inline grid
- Compact layout
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for grid items
        const itemA = await canvas.findByText(/^a$/i, {}, { timeout: 5000 });
        await expect(itemA).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for grid items
        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for grid items
        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for grid items
        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};
