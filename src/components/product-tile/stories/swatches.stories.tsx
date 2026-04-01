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
import type { DecoratedVariationAttributeValue } from '@/lib/product-utils';
import { action } from 'storybook/actions';
import { ProductTileSwatches } from '../swatches';

const mockColorValues: DecoratedVariationAttributeValue[] = [
    {
        value: 'navy',
        name: 'Navy',
        href: '/product/test?color=navy',
        swatch: { link: 'https://example.com/navy.jpg', disBaseLink: 'https://example.com/navy.jpg' },
    },
    {
        value: 'red',
        name: 'Red',
        href: '/product/test?color=red',
        swatch: { link: 'https://example.com/red.jpg', disBaseLink: 'https://example.com/red.jpg' },
    },
    {
        value: 'blue',
        name: 'Blue',
        href: '/product/test?color=blue',
        swatch: { link: 'https://example.com/blue.jpg', disBaseLink: 'https://example.com/blue.jpg' },
    },
    {
        value: 'black',
        name: 'Black',
        href: '/product/test?color=black',
        swatch: { link: 'https://example.com/black.jpg', disBaseLink: 'https://example.com/black.jpg' },
    },
    {
        value: 'green',
        name: 'Green',
        href: '/product/test?color=green',
        swatch: { link: 'https://example.com/green.jpg', disBaseLink: 'https://example.com/green.jpg' },
    },
];

const meta: Meta<typeof ProductTileSwatches> = {
    title: 'Components/ProductTile/Swatches',
    component: ProductTileSwatches,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div className="w-64">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductTileSwatches>;

export const ColorSwatches: Story = {
    args: {
        colorValues: mockColorValues,
        selectedAttributeValue: 'navy',
        onSwatchHover: action('onSwatchHover'),
        onSwatchClick: action('onSwatchClick'),
        productName: 'Test Product',
        totalColorCount: 5,
        maxSwatches: 5,
    },
};

export const ColorSwatchesWithOverflow: Story = {
    args: {
        colorValues: mockColorValues.slice(0, 3),
        selectedAttributeValue: 'red',
        onSwatchHover: action('onSwatchHover'),
        onSwatchClick: action('onSwatchClick'),
        productName: 'Test Product',
        totalColorCount: 5,
        maxSwatches: 3,
    },
};

export const NoSelection: Story = {
    args: {
        colorValues: mockColorValues,
        selectedAttributeValue: null,
        onSwatchHover: action('onSwatchHover'),
        onSwatchClick: action('onSwatchClick'),
        productName: 'Test Product',
        totalColorCount: 5,
        maxSwatches: 5,
    },
};

export const NoSwatches: Story = {
    args: {
        colorValues: [],
        selectedAttributeValue: null,
        onSwatchHover: action('onSwatchHover'),
        onSwatchClick: action('onSwatchClick'),
        productName: 'Test Product',
        totalColorCount: 0,
        maxSwatches: 5,
    },
};
