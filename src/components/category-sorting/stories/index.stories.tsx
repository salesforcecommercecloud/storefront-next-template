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
import { allModes } from '../../../../.storybook/modes';
import CategorySorting from '../index';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
// @ts-expect-error Mock data file is JavaScript
import searchResults from '@/components/__mocks__/search-results';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

const SORTING_HARNESS_ATTR = 'data-sorting-harness';

function SortingStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logChange = useMemo(() => action('sort-option-changed'), []);
    const logHover = useMemo(() => action('sort-option-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${SORTING_HARNESS_ATTR}]`));

        const handleChange = (event: Event) => {
            const select = event.target as HTMLSelectElement | null;
            if (!select || !isInsideHarness(select)) {
                return;
            }
            logChange({ value: select.value, label: select.options[select.selectedIndex]?.text || '' });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const select = (event.target as HTMLElement | null)?.closest('select');
            if (!select || !isInsideHarness(select)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && select.contains(related)) {
                return;
            }
            logHover({});
        };

        document.addEventListener('change', handleChange, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('change', handleChange, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logChange, logHover]);

    return (
        <div ref={containerRef} {...{ [SORTING_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof CategorySorting> = {
    title: 'CATEGORY/Category Sorting',
    component: CategorySorting,
    tags: ['autodocs', 'interaction'],
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
        layout: 'centered',
        docs: {
            description: {
                component: `
A sorting dropdown component for category product listings. Allows users to sort products by different criteria.

## Features

- **Sort Options**: Dropdown with available sorting options
- **URL Integration**: Updates URL parameters when selection changes
- **Current Selection**: Shows the currently selected sort option
- **Accessible**: Proper label-select association
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The CategorySorting component is used on:
- Category pages
- Product listing pages
- Search results pages
- Any sortable product list

\`\`\`tsx
import CategorySorting from '../category-sorting';

function CategoryPage({ searchResult }) {
  return <CategorySorting result={searchResult} />;
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`result\` | \`ShopperSearch.schemas['ProductSearchResult']\` | Product search result containing sorting options |

## Behavior

- **Changing sort option**: Updates URL parameters and navigates
- **No options**: Component returns null if no sorting options available
- **URL updates**: Updates sort and resets offset to 0
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <SortingStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </SortingStoryHarness>
                );

                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/',
                            element: content,
                        },
                    ],
                    { initialEntries: ['/'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Use real mock data from @mocks directory
const mockSearchResult = searchResults as ShopperSearch.schemas['ProductSearchResult'];

const mockSearchResultNoSorting: ShopperSearch.schemas['ProductSearchResult'] = {
    ...mockSearchResult,
    sortingOptions: [],
    selectedSortingOption: undefined,
};

export const Default: Story = {
    args: {
        result: mockSearchResult,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default CategorySorting shows the sort dropdown:

### Features:
- **Sort label**: "Sort by:" label
- **Dropdown**: Select with sorting options
- **Current selection**: Shows selected option
- **Action logging**: Changes are logged

### Use Cases:
- Standard sorting
- Category listings
- Product sorting
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test sort label is present
        const label = canvas.getByText(/sort by/i);
        await expect(label).toBeInTheDocument();

        // Test select is present
        const select = canvas.getByRole<HTMLSelectElement>('combobox');
        await expect(select).toBeInTheDocument();

        // Test changing sort option
        await userEvent.selectOptions(select, select.options[1]?.value || '');
    },
};

export const NoSortingOptions: Story = {
    args: {
        result: mockSearchResultNoSorting,
    },
    parameters: {
        docs: {
            description: {
                story: `
CategorySorting when no sorting options are available:

### No Options Features:
- **Not rendered**: Component returns null
- **Clean UI**: No sorting controls shown
- **No errors**: Gracefully handles missing options

### Use Cases:
- Search results without sorting
- Categories without sort options
- Disabled sorting
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test sorting is not rendered (component returns null)
        const select = canvasElement.querySelector('select');
        await expect(select).not.toBeInTheDocument();
    },
};

export const WithSelectedOption: Story = {
    args: {
        result: {
            ...mockSearchResult,
            selectedSortingOption: mockSearchResult.sortingOptions?.[1]?.id || '',
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
CategorySorting with a pre-selected sort option:

### Selected Option Features:
- **Pre-selected**: Shows the selected option
- **Same functionality**: All features work the same
- **Visual feedback**: Selected option is highlighted

### Use Cases:
- URL-based sorting
- Preserved sort selection
- Default sort options
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test select is present
        const select = canvas.getByRole<HTMLSelectElement>('combobox');
        await expect(select).toBeInTheDocument();

        // Test selected option is set
        await expect(select.value).not.toBe('');
    },
};
