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
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

import { StarIcon } from '../star-icon';

const meta: Meta<typeof StarIcon> = {
    title: 'UI/Star Icon',
    component: StarIcon,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A reusable star icon component used in rating displays.

## Features

- **Two states**: Filled (yellow) and unfilled (gray)
- **Variable opacity**: Supports opacity from 0 to 1 for partial fills
- **Customizable size**: Can be styled with Tailwind classes
- **Accessible**: Uses semantic colors that adapt to light/dark modes
- **Lightweight**: Pure SVG with no external dependencies

## Design

The component uses yellow (#FBBF24) for filled stars and a muted foreground color at 30% opacity for unfilled stars. Opacity can be controlled to represent partial star fills in rating displays.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| opacity | number | required | Opacity value (0-1) |
| filled | boolean | required | Whether star is filled (yellow) or unfilled (gray) |
| className | string | - | Additional CSS classes |
                `,
            },
        },
    },
    argTypes: {
        opacity: {
            control: { type: 'range', min: 0, max: 1, step: 0.1 },
            description: 'Opacity value for the star (0-1)',
        },
        filled: {
            control: 'boolean',
            description: 'Whether the star is filled (yellow) or unfilled (gray)',
        },
        className: {
            control: 'text',
            description: 'Additional CSS classes for styling',
        },
    },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const FilledStar: Story = {
    args: {
        opacity: 1,
        filled: true,
        className: 'w-8 h-8',
    },
    parameters: {
        docs: {
            description: {
                story: `
A fully filled star with 100% opacity. This represents a full star in a rating display.

### Features:
- **Yellow color**: Uses text-rating semantic token (#FACC15 / yellow-400)
- **Full opacity**: 100% visible
- **Standard size**: 32px (w-8 h-8) for visibility

### Use Cases:
- Full star ratings
- Highlighting favorite items
- Rating displays showing whole numbers
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test that star is rendered
        const star = canvasElement.querySelector('svg');
        await expect(star).toBeInTheDocument();

        // Test that star has rating color class
        await expect(star).toHaveClass('text-rating');

        // Test opacity is 1
        await expect(star).toHaveStyle({ opacity: '1' });
    },
};

export const UnfilledStar: Story = {
    args: {
        opacity: 1,
        filled: false,
        className: 'w-8 h-8',
    },
    parameters: {
        docs: {
            description: {
                story: `
An unfilled star with full opacity. This represents an empty star in a rating display.

### Features:
- **Gray color**: Uses muted-foreground/30 for subtle appearance
- **Full opacity**: 100% visible
- **Theme-aware**: Adapts to light/dark modes

### Use Cases:
- Empty star ratings
- Showing maximum possible rating
- Rating displays with low scores
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test that star is rendered
        const star = canvasElement.querySelector('svg');
        await expect(star).toBeInTheDocument();

        // Test that star has gray color class
        await expect(star).toHaveClass('text-muted-foreground/30');

        // Test opacity is 1
        await expect(star).toHaveStyle({ opacity: '1' });
    },
};

export const PartialStar: Story = {
    args: {
        opacity: 0.5,
        filled: true,
        className: 'w-8 h-8',
    },
    parameters: {
        docs: {
            description: {
                story: `
A partially filled star at 50% opacity. This represents a half-star in a rating display.

### Features:
- **Yellow color**: Uses text-rating semantic token
- **Reduced opacity**: 50% visible for partial fill
- **Smooth gradient**: Opacity creates visual gradient effect

### Use Cases:
- Decimal ratings (e.g., 3.5 out of 5)
- Partial star fills
- Progressive rating displays
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const star = canvasElement.querySelector('svg');
        await expect(star).toBeInTheDocument();
        await expect(star).toHaveClass('text-rating');
        await expect(star).toHaveStyle({ opacity: '0.5' });
    },
};

export const OpacityVariations: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                <div key={opacity} className="flex flex-col items-center gap-2">
                    <StarIcon opacity={opacity} filled={true} className="w-8 h-8" />
                    <span className="text-xs text-gray-600">{Math.round(opacity * 100)}%</span>
                </div>
            ))}
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Demonstrates various opacity levels from 0% to 100% for filled stars.

### Opacity Levels:
- **0%**: Completely transparent
- **20%**: Very faint
- **40%**: Moderately visible
- **60%**: More visible
- **80%**: Nearly full
- **100%**: Fully opaque

### Use Cases:
- Decimal ratings (4.8, 3.2, etc.)
- Smooth rating transitions
- Visual feedback for partial ratings
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test that 6 stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(6);

        // Test first star (0% opacity)
        await expect(stars[0]).toHaveStyle({ opacity: '0' });

        // Test last star (100% opacity)
        await expect(stars[5]).toHaveStyle({ opacity: '1' });
    },
};

export const SizeVariations: Story = {
    render: () => (
        <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
                <StarIcon opacity={1} filled={true} className="w-3 h-3" />
                <span className="text-xs text-gray-600">Small (12px)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <StarIcon opacity={1} filled={true} className="w-4 h-4" />
                <span className="text-xs text-gray-600">Default (16px)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <StarIcon opacity={1} filled={true} className="w-6 h-6" />
                <span className="text-xs text-gray-600">Large (24px)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <StarIcon opacity={1} filled={true} className="w-8 h-8" />
                <span className="text-xs text-gray-600">XL (32px)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <StarIcon opacity={1} filled={true} className="w-12 h-12" />
                <span className="text-xs text-gray-600">2XL (48px)</span>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Shows different size options for the star icon using Tailwind width/height classes.

### Available Sizes:
- **Small (w-3 h-3)**: 12px - Compact layouts
- **Default (w-4 h-4)**: 16px - Standard rating displays
- **Large (w-6 h-6)**: 24px - Prominent displays
- **XL (w-8 h-8)**: 32px - Hero sections
- **2XL (w-12 h-12)**: 48px - Large feature displays

### Use Cases:
- Product tiles: Small
- Product cards: Default
- Product detail pages: Large
- Hero ratings: XL/2XL
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test that 5 different sized stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);

        // Test smallest star
        await expect(stars[0]).toHaveClass('w-3', 'h-3');

        // Test largest star
        await expect(stars[4]).toHaveClass('w-12', 'h-12');
    },
};

export const FilledVsUnfilled: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium">Filled:</span>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <StarIcon key={i} opacity={1} filled={true} className="w-6 h-6" />
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium">Unfilled:</span>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <StarIcon key={i} opacity={1} filled={false} className="w-6 h-6" />
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium">Mixed:</span>
                <div className="flex gap-1">
                    <StarIcon opacity={1} filled={true} className="w-6 h-6" />
                    <StarIcon opacity={1} filled={true} className="w-6 h-6" />
                    <StarIcon opacity={1} filled={true} className="w-6 h-6" />
                    <StarIcon opacity={0.5} filled={true} className="w-6 h-6" />
                    <StarIcon opacity={1} filled={false} className="w-6 h-6" />
                </div>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Comparison of filled, unfilled, and mixed star displays.

### Visual Differences:
- **Filled**: Yellow stars at full opacity
- **Unfilled**: Gray stars showing maximum rating
- **Mixed**: Combination showing 3.5 out of 5 rating

### Use Cases:
- Visual comparison in documentation
- Testing color contrast
- Demonstrating rating displays
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test that 15 stars are rendered (5 + 5 + 5)
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(15);

        // Test first row has all yellow stars
        for (let i = 0; i < 5; i++) {
            await expect(stars[i]).toHaveClass('text-rating');
        }

        // Test second row has all gray stars
        for (let i = 5; i < 10; i++) {
            await expect(stars[i]).toHaveClass('text-muted-foreground/30');
        }

        // Test third row has mixed colors
        await expect(stars[10]).toHaveClass('text-rating'); // 1st filled
        await expect(stars[11]).toHaveClass('text-rating'); // 2nd filled
        await expect(stars[12]).toHaveClass('text-rating'); // 3rd filled
        await expect(stars[13]).toHaveClass('text-rating'); // 4th partial
        await expect(stars[14]).toHaveClass('text-muted-foreground/30'); // 5th unfilled
    },
};

export const CustomStyling: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Custom Color (Red):</span>
                <StarIcon opacity={1} filled={true} className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Custom Color (Blue):</span>
                <StarIcon opacity={1} filled={true} className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Custom Color (Green):</span>
                <StarIcon opacity={1} filled={true} className="w-8 h-8 text-green-500" />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Demonstrates custom color styling by overriding the default colors with Tailwind classes.

### Custom Colors:
- **Red**: text-red-500 - For negative ratings or alerts
- **Blue**: text-blue-500 - For premium or special ratings
- **Green**: text-green-500 - For positive feedback

### Use Cases:
- Custom brand colors
- Special rating categories
- Themed rating displays
- A/B testing different colors

**Note**: The className prop can override the default yellow/gray colors.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(3);

        // Test custom colors
        await expect(stars[0]).toHaveClass('text-red-500');
        await expect(stars[1]).toHaveClass('text-blue-500');
        await expect(stars[2]).toHaveClass('text-green-500');
    },
};
