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
import { DeferredWishlistButton } from '../deferred-wishlist-button';
// @ts-expect-error mock file is JS
import { mockProductSearchItem } from '../../__mocks__/product-search-hit-data';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

const meta: Meta<typeof DeferredWishlistButton> = {
    title: 'Components/ProductTile/DeferredWishlistButton',
    component: DeferredWishlistButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <div className="relative w-64 h-64">
                    <Story />
                </div>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof DeferredWishlistButton>;

export const Default: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'md',
    },
};

export const SmallSize: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'sm',
    },
};

export const LargeSize: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'lg',
    },
};

export const WithClassName: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'md',
        className: 'custom-class',
    },
};

export const WithTabIndex: Story = {
    args: {
        product: mockProductSearchItem,
        size: 'md',
        tabIndex: -1,
    },
};

export const MinimalProps: Story = {
    args: {
        product: { productId: 'minimal-product' },
    },
};
