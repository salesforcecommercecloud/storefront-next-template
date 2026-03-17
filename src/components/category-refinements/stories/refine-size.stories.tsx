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
import RefineSize from '../refine-size';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { FilterValue } from '../types';

const REFINE_SIZE_HARNESS_ATTR = 'data-refine-size-harness';

function RefineSizeStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('size-filter-clicked'), []);
    const logHover = useMemo(() => action('size-filter-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${REFINE_SIZE_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }
            const text = button.textContent?.trim() || '';
            if (text) {
                logClick({ size: text });
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
                logHover({ size: text });
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
        <div ref={containerRef} {...{ [REFINE_SIZE_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof RefineSize> = {
    title: 'CATEGORY/Category Refinements/Refine Size',
    component: RefineSize,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A size refinement component that displays size options as buttons. Users can select sizes to filter products.

## Features

- **Size Buttons**: Button-style size options
- **Size Labels**: Text labels for each size
- **Hit Counts**: Shows number of products for each size
- **Selected State**: Visual indication of selected sizes
- **Flex Wrap Layout**: Buttons wrap to multiple rows
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The RefineSize component is used within:
- Category refinements accordion
- Product filter sidebars
- Size-based filtering

\`\`\`tsx
import RefineSize from '../refine-size';

function SizeFilter({ values, attributeId, isFilterSelected, toggleFilter }) {
  return (
    <RefineSize
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
| \`values\` | \`FilterValue[]\` | Array of size filter values |
| \`attributeId\` | \`string\` | The attribute ID (typically 'c_size') |
| \`isFilterSelected\` | \`(attributeId: string, value: string) => boolean\` | Function to check if a filter is selected |
| \`toggleFilter\` | \`(attributeId: string, value: string) => void\` | Function to toggle a filter |

## Behavior

- **Clicking a size**: Toggles that size filter
- **Selected sizes**: Show highlighted border
- **Multiple selection**: Can select multiple sizes
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <RefineSizeStoryHarness>
                <Story />
            </RefineSizeStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockSizeValues: FilterValue[] = [
    { value: '4', label: '4', hitCount: 31 },
    { value: '6', label: '6', hitCount: 32 },
    { value: '8', label: '8', hitCount: 32 },
    { value: '10', label: '10', hitCount: 34 },
    { value: '12', label: '12', hitCount: 31 },
    { value: '14', label: '14', hitCount: 33 },
    { value: '16', label: '16', hitCount: 32 },
    { value: 'XS', label: 'XS', hitCount: 5 },
    { value: 'S', label: 'S', hitCount: 8 },
    { value: 'M', label: 'M', hitCount: 8 },
    { value: 'L', label: 'L', hitCount: 6 },
    { value: 'XL', label: 'XL', hitCount: 7 },
];

const isFilterSelected = (attributeId: string, value: string) => {
    return attributeId === 'c_size' && value === 'M';
};

const toggleFilter = (attributeId: string, value: string) => {
    // Mock toggle function
    void attributeId;
    void value;
};

export const Default: Story = {
    args: {
        values: mockSizeValues,
        attributeId: 'c_size',
        isFilterSelected,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default RefineSize shows size buttons:

### Features:
- **Size buttons**: Button-style size options
- **Size labels**: Text labels
- **Hit counts**: Product counts for each size
- **Selected state**: M is selected
- **Action logging**: All clicks are logged

### Use Cases:
- Standard size filtering
- Multiple size options
- Button-based selection
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test size buttons are present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(0);

        // Test clicking a size button
        const mButton = buttons.find((btn) => btn.textContent?.includes('M'));
        if (mButton) {
            await userEvent.click(mButton);
        }
    },
};

export const NoSelectedSizes: Story = {
    args: {
        values: mockSizeValues,
        attributeId: 'c_size',
        isFilterSelected: () => false,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
RefineSize with no selected sizes:

### No Selection Features:
- **All unselected**: No sizes are selected
- **Same functionality**: All features work the same
- **Visual state**: No highlighted borders

### Use Cases:
- Initial state
- After clearing filters
- No size filter applied
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test size buttons are present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(0);
    },
};
