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
import RefineDefault from '../refine-default';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { FilterValue } from '../types';

const REFINE_DEFAULT_HARNESS_ATTR = 'data-refine-default-harness';

function RefineDefaultStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('filter-checkbox-clicked'), []);
    const logHover = useMemo(() => action('filter-checkbox-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) =>
            Boolean(element?.closest(`[${REFINE_DEFAULT_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const checkbox = (event.target as HTMLElement | null)?.closest('input[type="checkbox"], label');
            if (!checkbox || !isInsideHarness(checkbox)) {
                return;
            }
            const label = checkbox.closest('label');
            const text = label?.textContent?.trim() || '';
            if (text) {
                logClick({ value: text });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const label = (event.target as HTMLElement | null)?.closest('label');
            if (!label || !isInsideHarness(label)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && label.contains(related)) {
                return;
            }
            const text = label.textContent?.trim() || '';
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
        <div ref={containerRef} {...{ [REFINE_DEFAULT_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof RefineDefault> = {
    title: 'CATEGORY/Category Refinements/Refine Default',
    component: RefineDefault,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A default refinement component that displays filter options as checkboxes. Used for most filter types that don't have specialized components.

## Features

- **Checkbox List**: Checkboxes for each filter option
- **Labels**: Text labels for each option
- **Hit Counts**: Shows number of products for each option
- **Selected State**: Visual indication of selected options
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The RefineDefault component is used within:
- Category refinements accordion
- Product filter sidebars
- Default filtering for most attributes

\`\`\`tsx
import RefineDefault from '../refine-default';

function DefaultFilter({ values, attributeId, isFilterSelected, toggleFilter }) {
  return (
    <RefineDefault
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
| \`attributeId\` | \`string\` | The attribute ID |
| \`isFilterSelected\` | \`(attributeId: string, value: string) => boolean\` | Function to check if a filter is selected |
| \`toggleFilter\` | \`(attributeId: string, value: string) => void\` | Function to toggle a filter |

## Behavior

- **Clicking a checkbox**: Toggles that filter option
- **Selected options**: Show checked state
- **Multiple selection**: Can select multiple options
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <RefineDefaultStoryHarness>
                <Story />
            </RefineDefaultStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockDefaultValues: FilterValue[] = [
    { value: 'true', label: 'New Arrival', hitCount: 4 },
    { value: 'Brand A', label: 'Brand A', hitCount: 12 },
    { value: 'Brand B', label: 'Brand B', hitCount: 8 },
];

const isFilterSelected = (attributeId: string, value: string) => {
    return attributeId === 'c_isNew' && value === 'true';
};

const toggleFilter = (attributeId: string, value: string) => {
    // Mock toggle function
    void attributeId;
    void value;
};

export const Default: Story = {
    args: {
        values: mockDefaultValues,
        attributeId: 'c_isNew',
        isFilterSelected,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default RefineDefault shows checkbox options:

### Features:
- **Checkboxes**: Checkbox inputs for each option
- **Labels**: Text labels
- **Hit counts**: Product counts
- **Selected state**: "New Arrival" is selected
- **Action logging**: All clicks are logged

### Use Cases:
- Standard filtering
- Multiple options
- Checkbox-based selection
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test checkboxes are present
        const checkboxes = canvas.getAllByRole('checkbox');
        await expect(checkboxes.length).toBeGreaterThan(0);

        // Test clicking a checkbox
        if (checkboxes.length > 0) {
            await userEvent.click(checkboxes[0]);
        }
    },
};

export const NoSelectedOptions: Story = {
    args: {
        values: mockDefaultValues,
        attributeId: 'c_isNew',
        isFilterSelected: () => false,
        toggleFilter,
    },
    parameters: {
        docs: {
            description: {
                story: `
RefineDefault with no selected options:

### No Selection Features:
- **All unchecked**: No options are selected
- **Same functionality**: All features work the same
- **Visual state**: No checkmarks shown

### Use Cases:
- Initial state
- After clearing filters
- No filter applied
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test checkboxes are present
        const checkboxes = canvas.getAllByRole('checkbox');
        await expect(checkboxes.length).toBeGreaterThan(0);

        // Test all are unchecked
        checkboxes.forEach((checkbox) => {
            void expect(checkbox).not.toBeChecked();
        });
    },
};
