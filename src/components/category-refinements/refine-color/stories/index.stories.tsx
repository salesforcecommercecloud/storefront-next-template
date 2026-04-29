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
import RefineColor from '..';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { FilterValue } from '../../types';

const REFINE_COLOR_HARNESS_ATTR = 'data-refine-color-harness';

function RefineColorStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('color-filter-clicked'), []);
    const logHover = useMemo(() => action('color-filter-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) =>
            Boolean(element?.closest(`[${REFINE_COLOR_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }
            const text = button.textContent?.trim() || '';
            if (text) {
                logClick({ color: text });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && button.contains(related)) {
                return;
            }
            const text = button.textContent?.trim() || '';
            if (text) {
                logHover({ color: text });
            }
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logClick, logHover]);

    return (
        <div ref={containerRef} {...{ [REFINE_COLOR_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof RefineColor> = {
    title: 'CATEGORY/Category Refinements/Refine Color',
    component: RefineColor,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A color refinement component that displays color options as square swatches above each label, without an outline box around each option. Users can select colors to filter products.

## Features

- **Layout**: Swatch on top, color name and count below—no bordered “chip” around the whole control
- **Color Swatches**: Square swatches for each color option
- **Color Names**: Full text labels (wrapping when needed)
- **Hit Counts**: Product count in parentheses below the name
- **Selected State**: Visual indication of selected colors
- **Grid Layout**: 2 columns on small screens, 3 columns from the large breakpoint up (fits the default narrow filter column with square swatches)
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The RefineColor component is used within:
- Category refinements accordion
- Product filter sidebars
- Color-based filtering

\`\`\`tsx
import RefineColor from '@/components/category-refinements/refine-color';

function ColorFilter({ values, attributeId, isFilterSelected, toggleFilter }) {
  return (
    <RefineColor
      values={values}
      attributeId={attributeId}
      isFilterSelected={isFilterSelected}
      toggleFilter={toggleFilter}
    />
  );
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`values\` | \`FilterValue[]\` | Array of color filter values |
| \`attributeId\` | \`string\` | The attribute ID (typically 'c_refinementColor') |
| \`isFilterSelected\` | \`(attributeId: string, value: string) => boolean\` | Function to check if a filter is selected |
| \`toggleFilter\` | \`(attributeId: string, value: string) => void\` | Function to toggle a filter |

## Behavior

- **Clicking a color**: Toggles that color filter
- **Selected colors**: Ring and border on the swatch; semibold label (no center dot)
- **Color mapping**: Maps color names to hex values for display
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <RefineColorStoryHarness>
                <Story />
            </RefineColorStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockColorValues: FilterValue[] = [
    { value: 'Black', label: 'Black', hitCount: 43 },
    { value: 'Blue', label: 'Blue', hitCount: 27 },
    { value: 'Red', label: 'Red', hitCount: 1 },
    { value: 'Green', label: 'Green', hitCount: 4 },
    { value: 'White', label: 'White', hitCount: 30 },
    { value: 'Brown', label: 'Brown', hitCount: 15 },
];

const isFilterSelected = (attributeId: string, value: string) => {
    return attributeId === 'c_refinementColor' && value === 'Black';
};

const toggleFilter = (attributeId: string, value: string) => {
    // Mock toggle function
    void attributeId;
    void value;
};

export const Default: Story = {
    args: {
        values: mockColorValues,
        attributeId: 'c_refinementColor',
        isFilterSelected,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default RefineColor shows color swatches:

### Features:
- **Color swatches**: Square swatches above each label
- **Color names**: Full labels with wrapping when needed
- **Hit counts**: Count in parentheses under the name
- **Selected state**: Black is selected
- **Action logging**: All clicks are logged

### Use Cases:
- Standard color filtering
- Multiple color options
- Visual color selection
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test color buttons are present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(0);

        // Test clicking a color button
        const blackButton = buttons.find((btn) => btn.textContent?.includes('Black'));
        if (blackButton) {
            await userEvent.click(blackButton);
        }
    },
};

export const NoSelectedColors: Story = {
    args: {
        values: mockColorValues,
        attributeId: 'c_refinementColor',
        isFilterSelected: () => false,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
RefineColor with no selected colors:

### No Selection Features:
- **All unselected**: No colors are selected
- **Same functionality**: All features work the same
- **Visual state**: No selection ring; default swatch border only

### Use Cases:
- Initial state
- After clearing filters
- No color filter applied
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test color buttons are present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(0);
    },
};

export const ManyColors: Story = {
    args: {
        values: [
            ...mockColorValues,
            { value: 'Pink', label: 'Pink', hitCount: 3 },
            { value: 'Purple', label: 'Purple', hitCount: 0 },
            { value: 'Yellow', label: 'Yellow', hitCount: 0 },
            { value: 'Orange', label: 'Orange', hitCount: 0 },
            { value: 'Grey', label: 'Grey', hitCount: 13 },
            { value: 'Navy', label: 'Navy', hitCount: 0 },
        ],
        attributeId: 'c_refinementColor',
        isFilterSelected,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
RefineColor with many color options:

### Many Colors Features:
- **Grid layout**: 2 columns by default, 3 from the large breakpoint
- **All colors**: Shows all available colors
- **Hit counts**: Some colors have 0 products
- **Wrapping**: Colors wrap to multiple rows

### Use Cases:
- Extensive color options
- Large color palettes
- Comprehensive filtering
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test many color buttons are present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(6);
    },
};
