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
import type { DecoratedVariationAttribute } from '@/lib/product-utils';
import { action } from 'storybook/actions';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import Swatches from '../swatches';

const mockColorAttributes: DecoratedVariationAttribute[] = [
    {
        id: 'color',
        name: 'Colour',
        values: [
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
        ],
    },
];

const mockSizeAttributes: DecoratedVariationAttribute[] = [
    {
        id: 'size',
        name: 'Size',
        values: [
            { value: 'S', name: 'S', href: '/product/test?size=S' },
            { value: 'M', name: 'M', href: '/product/test?size=M' },
            { value: 'L', name: 'L', href: '/product/test?size=L' },
            { value: 'XL', name: 'XL', href: '/product/test?size=XL' },
        ],
    },
];

const meta: Meta<typeof Swatches> = {
    title: 'Components/ProductTile/Swatches',
    component: Swatches,
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
type Story = StoryObj<typeof Swatches>;

export const ColorSwatches: Story = {
    args: {
        variationAttributes: mockColorAttributes,
        maxSwatches: 5,
        selectedAttributeValue: 'navy',
        handleAttributeChange: action('handleAttributeChange'),
        disableSwatchInteraction: false,
        swatchMode: 'hover',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const swatchGroup = canvas.getByRole('radiogroup', { name: 'Colour' });
        await expect(swatchGroup).toBeInTheDocument();
        const swatches = canvas.getAllByRole('radio');
        await expect(swatches.length).toBe(5);
    },
};

export const ColorSwatchesWithOverflow: Story = {
    args: {
        variationAttributes: mockColorAttributes,
        maxSwatches: 3,
        selectedAttributeValue: 'red',
        handleAttributeChange: action('handleAttributeChange'),
        disableSwatchInteraction: false,
        swatchMode: 'click',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const swatches = canvas.getAllByRole('radio');
        await expect(swatches.length).toBe(3);
        const moreIndicator = canvas.getByTitle('+2');
        await expect(moreIndicator).toBeInTheDocument();
    },
};

export const SizeSwatches: Story = {
    args: {
        variationAttributes: mockSizeAttributes,
        maxSwatches: 4,
        selectedAttributeValue: 'M',
        handleAttributeChange: action('handleAttributeChange'),
        disableSwatchInteraction: false,
        swatchMode: 'click',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const swatchGroup = canvas.getByRole('radiogroup', { name: 'Size' });
        await expect(swatchGroup).toBeInTheDocument();
        const swatches = canvas.getAllByRole('radio');
        await expect(swatches.length).toBe(4);
    },
};

export const NoSelection: Story = {
    args: {
        variationAttributes: mockColorAttributes,
        maxSwatches: 5,
        selectedAttributeValue: null,
        handleAttributeChange: action('handleAttributeChange'),
        disableSwatchInteraction: false,
        swatchMode: 'hover',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const swatches = canvas.getAllByRole('radio');
        for (const swatch of swatches) {
            await expect(swatch).not.toBeChecked();
        }
    },
};

export const VariantReadOnly: Story = {
    args: {
        variationAttributes: mockColorAttributes,
        maxSwatches: 5,
        selectedAttributeValue: null,
        handleAttributeChange: action('handleAttributeChange'),
        disableSwatchInteraction: true,
        selectedVariantColorValue: 'navy',
        swatchMode: 'click',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const swatches = canvas.getAllByRole('radio');
        await expect(swatches.length).toBe(1);
        const moreIndicator = canvas.queryByTitle(/^\+\d+$/);
        await expect(moreIndicator).toBeNull();
    },
};

export const EmptyAttributes: Story = {
    args: {
        variationAttributes: [],
        maxSwatches: 5,
        selectedAttributeValue: null,
        handleAttributeChange: action('handleAttributeChange'),
        disableSwatchInteraction: false,
        swatchMode: 'hover',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const swatchGroup = canvas.queryByRole('radiogroup');
        await expect(swatchGroup).toBeNull();
    },
};
