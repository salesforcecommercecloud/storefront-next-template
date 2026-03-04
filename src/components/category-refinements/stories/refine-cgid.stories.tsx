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
import RefineCategory from '../refine-cgid';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { FilterValue } from '../types';

const REFINE_CGID_HARNESS_ATTR = 'data-refine-cgid-harness';

function RefineCgidStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('filter-category-clicked'), []);
    const logHover = useMemo(() => action('filter-category-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${REFINE_CGID_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }
            const text = button.textContent?.trim() || '';
            if (text) {
                logClick({ value: text });
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
                logHover({ value: text });
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
        <div ref={containerRef} {...{ [REFINE_CGID_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof RefineCategory> = {
    title: 'CATEGORY/Category Refinements/Refine Category',
    component: RefineCategory,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A category refinement component that displays sub-category filter options as link-style buttons. Used for navigating between product categories.

## Features

- **Link Buttons**: Each category is displayed as a link-style button
- **Labels**: Text labels for each category option
- **Selected State**: Visual indication via border styling for the active category
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The RefineCategory component is used within:
- Category refinements accordion
- Product filter sidebars
- Category-based navigation

\`\`\`tsx
import RefineCategory from '../refine-cgid';

function CategoryFilter({ values, attributeId, isFilterSelected, toggleFilter }) {
  return (
    <RefineCategory
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
| \`values\` | \`FilterValue[]\` | Array of filter values |
| \`attributeId\` | \`string\` | The attribute ID (typically "cgid") |
| \`isFilterSelected\` | \`(attributeId: string, value: string) => boolean\` | Function to check if a filter is selected |
| \`toggleFilter\` | \`(attributeId: string, value: string) => void\` | Function to toggle a filter |

## Behavior

- **Clicking a button**: Navigates to the selected category
- **Selected category**: Shown with a border highlight
- **Single selection**: Only one category can be active at a time
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <RefineCgidStoryHarness>
                <Story />
            </RefineCgidStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockCategoryValues: FilterValue[] = [
    { value: 'mens', label: 'Mens', hitCount: 42 },
    { value: 'womens', label: 'Womens', hitCount: 36 },
    { value: 'electronics', label: 'Electronics', hitCount: 18 },
    { value: 'accessories', label: 'Accessories', hitCount: 24 },
];

const isFilterSelected = (attributeId: string, value: string) => {
    return attributeId === 'cgid' && value === 'mens';
};

const toggleFilter = (attributeId: string, value: string) => {
    // Mock toggle function
    void attributeId;
    void value;
};

export const Default: Story = {
    args: {
        values: mockCategoryValues,
        attributeId: 'cgid',
        isFilterSelected,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default RefineCategory shows category link buttons:

### Features:
- **Link buttons**: Button elements styled as links for each category
- **Labels**: Category names
- **Hit counts**: Product counts per category
- **Selected state**: "Mens" is selected with a border highlight
- **Action logging**: All clicks are logged

### Use Cases:
- Category navigation
- Sub-category filtering
- Product category browsing
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test buttons are present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(0);

        // Test clicking a category button
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const NoSelectedCategory: Story = {
    args: {
        values: mockCategoryValues,
        attributeId: 'cgid',
        isFilterSelected: () => false,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
RefineCategory with no selected category:

### No Selection Features:
- **All unselected**: No category is highlighted
- **Same functionality**: All features work the same
- **Visual state**: No border highlights shown

### Use Cases:
- Initial state
- Top-level category view
- No category filter applied
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test buttons are present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(0);

        // Test that category labels are rendered
        await expect(canvas.getByText('Mens')).toBeInTheDocument();
        await expect(canvas.getByText('Womens')).toBeInTheDocument();
        await expect(canvas.getByText('Electronics')).toBeInTheDocument();
        await expect(canvas.getByText('Accessories')).toBeInTheDocument();
    },
};

export const SingleCategory: Story = {
    args: {
        values: [{ value: 'sale', label: 'Sale', hitCount: 10 }],
        attributeId: 'cgid',
        isFilterSelected: () => false,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
RefineCategory with a single category option:

### Single Option Features:
- **One button**: Only one category shown
- **Minimal UI**: Clean single-option layout

### Use Cases:
- Leaf category with one sub-category
- Narrow category tree
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const buttons = canvas.getAllByRole('button');
        await expect(buttons).toHaveLength(1);
        await expect(canvas.getByText('Sale')).toBeInTheDocument();
    },
};
