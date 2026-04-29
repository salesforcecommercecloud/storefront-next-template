/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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

export const WithMaxWidth: Story = {
    render: () => (
        <Grid columns="3" maxWidth="lg" columnGap="4" className="mx-auto">
            <div className="bg-muted p-4 rounded">Item 1</div>
            <div className="bg-muted p-4 rounded">Item 2</div>
            <div className="bg-muted p-4 rounded">Item 3</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Grid with max-width constraint.

### Features:
- Max width of lg
- Centered with mx-auto
- Responsive layout
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const WithContainerAlignment: Story = {
    render: () => (
        <div className="space-y-8">
            <div className="border-2 border-dashed border-gray-300 p-4">
                <h3 className="text-sm font-semibold mb-2">Align: Start (Default)</h3>
                <Grid columns="3" maxWidth="lg" containerAlign="start" columnGap="4">
                    <div className="bg-muted p-4 rounded">Item 1</div>
                    <div className="bg-muted p-4 rounded">Item 2</div>
                    <div className="bg-muted p-4 rounded">Item 3</div>
                </Grid>
            </div>
            <div className="border-2 border-dashed border-gray-300 p-4">
                <h3 className="text-sm font-semibold mb-2">Align: Center</h3>
                <Grid columns="3" maxWidth="lg" containerAlign="center" columnGap="4">
                    <div className="bg-muted p-4 rounded">Item 1</div>
                    <div className="bg-muted p-4 rounded">Item 2</div>
                    <div className="bg-muted p-4 rounded">Item 3</div>
                </Grid>
            </div>
            <div className="border-2 border-dashed border-gray-300 p-4">
                <h3 className="text-sm font-semibold mb-2">Align: End</h3>
                <Grid columns="3" maxWidth="lg" containerAlign="end" columnGap="4">
                    <div className="bg-muted p-4 rounded">Item 1</div>
                    <div className="bg-muted p-4 rounded">Item 2</div>
                    <div className="bg-muted p-4 rounded">Item 3</div>
                </Grid>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            story: `
Grid container alignment when maxWidth is set.

### Features:
- containerAlign="start" - Grid aligns to the left
- containerAlign="center" - Grid centers horizontally (mx-auto)
- containerAlign="end" - Grid aligns to the right
- Most useful when maxWidth < full width
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Verify all three alignment sections are rendered
        const startHeading = await canvas.findByText(/align: start \(default\)/i, {}, { timeout: 5000 });
        await expect(startHeading).toBeInTheDocument();
        const centerHeading = await canvas.findByText(/align: center/i, {}, { timeout: 5000 });
        await expect(centerHeading).toBeInTheDocument();
        const endHeading = await canvas.findByText(/align: end/i, {}, { timeout: 5000 });
        await expect(endHeading).toBeInTheDocument();
    },
};

export const WithVerticalAlignment: Story = {
    render: () => (
        <Grid columns="3" verticalAlignment="center" columnGap="4" className="h-64">
            <div className="bg-muted p-4 rounded h-16">Short Item</div>
            <div className="bg-muted p-4 rounded h-32">Tall Item</div>
            <div className="bg-muted p-4 rounded h-24">Medium Item</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Grid with vertical center alignment.

### Features:
- Items vertically centered
- Different height items
- Demonstrates alignment behavior
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const shortItem = await canvas.findByText(/short item/i, {}, { timeout: 5000 });
        await expect(shortItem).toBeInTheDocument();
    },
};

export const WithBackgroundGradient: Story = {
    render: () => (
        <Grid columns="2" backgroundGradient="blue" columnGap="6" className="p-8 rounded-none">
            <div className="bg-white p-4 rounded shadow">Item 1</div>
            <div className="bg-white p-4 rounded shadow">Item 2</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Grid with blue gradient background.

### Features:
- Blue gradient background
- White cards on top
- Visual depth with shadows
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const item1 = await canvas.findByText(/item 1/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const WithBackgroundBlur: Story = {
    render: () => (
        <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-none" />
            <Grid columns="2" backgroundBlur="md" columnGap="4" className="relative p-6 rounded-none bg-white/30">
                <div className="bg-white/80 p-4 rounded">Blurred Background</div>
                <div className="bg-white/80 p-4 rounded">Glassmorphism Effect</div>
            </Grid>
        </div>
    ),
    parameters: {
        docs: {
            story: `
Grid with backdrop blur (glassmorphism).

### Features:
- Backdrop blur effect
- Semi-transparent background
- Modern glassmorphism design
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const item1 = await canvas.findByText(/blurred background/i, {}, { timeout: 5000 });
        await expect(item1).toBeInTheDocument();
    },
};

export const FullFeatured: Story = {
    render: () => (
        <Grid
            columns="4"
            maxWidth="2xl"
            columnGap="6"
            verticalAlignment="stretch"
            backgroundGradient="purple"
            className="mx-auto p-8 rounded-none">
            <div className="bg-white p-4 rounded shadow">Feature 1</div>
            <div className="bg-white p-4 rounded shadow">Feature 2</div>
            <div className="bg-white p-4 rounded shadow">Feature 3</div>
            <div className="bg-white p-4 rounded shadow">Feature 4</div>
        </Grid>
    ),
    parameters: {
        docs: {
            story: `
Grid showcasing all Page Designer features.

### Features:
- 4 columns
- Max width 2xl
- Column gap 6
- Vertical stretch alignment
- Purple gradient background
- Fully customizable
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const feature1 = await canvas.findByText(/feature 1/i, {}, { timeout: 5000 });
        await expect(feature1).toBeInTheDocument();
    },
};
