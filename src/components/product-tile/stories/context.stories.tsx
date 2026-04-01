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
import { ProductTileProvider } from '../context';
import ProductTile from '../index';
// @ts-expect-error mock file is JS
import { mockProductSearchItem } from '../../__mocks__/product-search-hit-data';
import DynamicImageProvider from '@/providers/dynamic-image';

const meta: Meta<typeof ProductTileProvider> = {
    title: 'Components/ProductTile/Context',
    component: ProductTileProvider,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
**ProductTileProvider** hoists shared hooks (navigation, config, currency, swatch mode, badge logic) out of
individual tiles into a single context. This reduces hydration cost when many tiles are rendered together
(e.g. a product grid) and ensures a single \`matchMedia\` subscription drives swatch-mode across all tiles.

When \`ProductTileProvider\` is not present, \`ProductTile\` falls back to calling each hook directly — so the
provider is optional but recommended for grids of 3+ tiles.
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof ProductTileProvider>;

export const Default: Story = {
    decorators: [
        (Story) => (
            <DynamicImageProvider value={{ widths: ['50vw', '50vw', '15vw'] }}>
                <div className="w-64">
                    <Story />
                </div>
            </DynamicImageProvider>
        ),
    ],
    render: () => (
        <ProductTileProvider>
            <ProductTile product={mockProductSearchItem} />
        </ProductTileProvider>
    ),
};

export const MultiTileGrid: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Multiple tiles sharing a single provider — one matchMedia subscription serves all swatch-mode consumers.',
            },
        },
    },
    decorators: [
        (Story) => (
            <DynamicImageProvider value={{ widths: ['50vw', '50vw', '15vw'] }}>
                <Story />
            </DynamicImageProvider>
        ),
    ],
    render: () => (
        <ProductTileProvider>
            <div className="grid grid-cols-2 gap-4 w-[32rem]">
                <ProductTile product={mockProductSearchItem} />
                <ProductTile product={mockProductSearchItem} />
                <ProductTile product={mockProductSearchItem} />
                <ProductTile product={mockProductSearchItem} />
            </div>
        </ProductTileProvider>
    ),
};
