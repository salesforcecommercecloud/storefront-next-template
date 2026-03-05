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
import { ProductTileSkeleton, ProductTileSwatchesSkeleton } from '../index';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof ProductTileSkeleton> = {
    title: 'LOADING/Category Skeleton',
    component: ProductTileSkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Skeleton loading state for product tiles in category pages. Includes placeholders for image, swatches, product name, and price.',
            },
        },
    },
    decorators: [
        (Story) => (
            <div className="w-[300px]">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductTileSkeleton>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify card structure is present (Card uses data-slot attributes)
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card).toBeInTheDocument();

        // Verify header (image area) is present
        const header = canvasElement.querySelector('[data-slot="card-header"]');
        await expect(header).toBeInTheDocument();
    },
};

export const MobileView: Story = {
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card).toBeInTheDocument();
    },
};

export const TabletView: Story = {
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card).toBeInTheDocument();
    },
};

export const DesktopView: Story = {
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card).toBeInTheDocument();
    },
};

export const SwatchesOnly: StoryObj<typeof ProductTileSwatchesSkeleton> = {
    render: (args) => <ProductTileSwatchesSkeleton {...args} />,
    args: {
        count: 4,
    },
    parameters: {
        docs: {
            description: {
                story: 'Standalone swatches skeleton with configurable count.',
            },
        },
    },
    argTypes: {
        count: {
            description: 'Number of swatch skeletons to display',
            control: { type: 'number', min: 1, max: 8 },
        },
    },
};

export const ManySwatches: StoryObj<typeof ProductTileSwatchesSkeleton> = {
    render: (args) => <ProductTileSwatchesSkeleton {...args} />,
    args: {
        count: 5,
    },
};

export const Grid: Story = {
    render: () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
                <ProductTileSkeleton key={i} />
            ))}
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Multiple skeleton tiles in a grid layout, simulating a category page loading state.',
            },
        },
    },
    decorators: [
        (Story) => (
            <div className="w-full max-w-4xl">
                <Story />
            </div>
        ),
    ],
};
