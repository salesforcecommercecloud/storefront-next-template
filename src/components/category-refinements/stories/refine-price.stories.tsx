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
import RefinePrice from '../refine-price';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
// @ts-expect-error Mock data file is JavaScript
import searchResults from '@/components/__mocks__/search-results';
import type { FilterValue } from '../types';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

const REFINE_PRICE_HARNESS_ATTR = 'data-refine-price-harness';

function RefinePriceStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logChange = useMemo(() => action('price-filter-changed'), []);
    const logApply = useMemo(() => action('price-filter-applied'), []);
    const logHover = useMemo(() => action('price-filter-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) =>
            Boolean(element?.closest(`[${REFINE_PRICE_HARNESS_ATTR}]`));

        const handleChange = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input || !isInsideHarness(input)) {
                return;
            }
            if (input.type === 'number') {
                logChange({ value: input.value, field: input.name || 'price' });
            }
        };

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }
            const text = button.textContent?.trim() || '';
            if (text.toLowerCase().includes('apply')) {
                logApply({});
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const element = (event.target as HTMLElement | null)?.closest('input, button');
            if (!element || !isInsideHarness(element)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && element.contains(related)) {
                return;
            }
            logHover({});
        };

        document.addEventListener('change', handleChange, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('change', handleChange, true);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logChange, logApply, logHover]);

    return (
        <div ref={containerRef} {...{ [REFINE_PRICE_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof RefinePrice> = {
    title: 'CATEGORY/Category Refinements/Refine Price',
    component: RefinePrice,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A price refinement component that allows users to filter products by price range. Includes both manual price input and predefined price ranges.

## Features

- **Price Range Input**: Min and max price inputs
- **Apply Button**: Button to apply the price filter
- **Predefined Ranges**: Checkbox list of predefined price ranges
- **Validation**: Validates price inputs against product prices
- **URL Integration**: Reads from and updates URL parameters
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The RefinePrice component is used within:
- Category refinements accordion
- Product filter sidebars
- Price-based filtering

\`\`\`tsx
import RefinePrice from '../refine-price';

function PriceFilter({ values, attributeId, isFilterSelected, toggleFilter, result }) {
  return (
    <RefinePrice
      values={values}
      attributeId={attributeId}
      isFilterSelected={isFilterSelected}
      toggleFilter={toggleFilter}
      result={result}
    />
  );
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`values\` | \`FilterValue[]\` | Array of predefined price range values |
| \`attributeId\` | \`string\` | The attribute ID (typically 'price') |
| \`isFilterSelected\` | \`(attributeId: string, value: string) => boolean\` | Function to check if a filter is selected |
| \`toggleFilter\` | \`(attributeId: string, value: string) => void\` | Function to toggle a filter |
| \`result\` | \`ShopperSearch.schemas['ProductSearchResult']\` | Product search result for price validation |

## Behavior

- **Entering prices**: Updates min/max price inputs
- **Applying filter**: Creates price range filter
- **Predefined ranges**: Can select predefined price ranges
- **URL sync**: Reads price from URL on mount
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <RefinePriceStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </RefinePriceStoryHarness>
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

const mockPriceValues: FilterValue[] = [
    { value: '(0..50)', label: '$0 - $50', hitCount: 5 },
    { value: '(50..100)', label: '$50 - $100', hitCount: 20 },
    { value: '(100..200)', label: '$100 - $200', hitCount: 15 },
    { value: '(200..)', label: '$200+', hitCount: 6 },
];

const isFilterSelected = (attributeId: string, value: string) => {
    return attributeId === 'price' && value === '(50..100)';
};

const toggleFilter = (attributeId: string, value: string) => {
    // Mock toggle function
    void attributeId;
    void value;
};

export const Default: Story = {
    args: {
        values: mockPriceValues,
        attributeId: 'price',
        isFilterSelected,
        toggleFilter,
        result: mockSearchResult,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default RefinePrice shows price range inputs and predefined ranges:

### Features:
- **Price inputs**: Min and max price inputs
- **Apply button**: Button to apply price filter
- **Predefined ranges**: Checkbox list of price ranges
- **Selected state**: "$50 - $100" is selected
- **Action logging**: All interactions are logged

### Use Cases:
- Standard price filtering
- Custom price ranges
- Predefined price ranges
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test price inputs are present
        const inputs = canvas.getAllByRole('spinbutton');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);

        // Test predefined ranges are present
        const checkboxes = canvas.getAllByRole('checkbox');
        await expect(checkboxes.length).toBeGreaterThan(0);
    },
};

export const WithPriceInUrl: Story = {
    args: {
        values: mockPriceValues,
        attributeId: 'price',
        isFilterSelected,
        toggleFilter,
        result: mockSearchResult,
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <RefinePriceStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </RefinePriceStoryHarness>
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
                    { initialEntries: ['/?refine=price=(50..100)'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
    parameters: {
        docs: {
            description: {
                story: `
RefinePrice with price filter in URL:

### URL Price Features:
- **Pre-populated**: Inputs are pre-filled from URL
- **Same functionality**: All features work the same
- **URL sync**: Reads price from URL on mount

### Use Cases:
- URL-based price filtering
- Preserved price selection
- Deep linking with price filter
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test price inputs are present
        const inputs = canvas.getAllByRole('spinbutton');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);
    },
};

export const NoPredefinedRanges: Story = {
    args: {
        values: [],
        attributeId: 'price',
        isFilterSelected: () => false,
        toggleFilter,
        result: mockSearchResult,
    },
    parameters: {
        docs: {
            description: {
                story: `
RefinePrice with no predefined ranges:

### No Ranges Features:
- **Price inputs only**: Only shows min/max inputs
- **No checkboxes**: No predefined range checkboxes
- **Same functionality**: Price input still works

### Use Cases:
- Custom price filtering only
- No predefined ranges configured
- Manual price entry
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test price inputs are present
        const inputs = canvas.getAllByRole('spinbutton');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);

        // Test no checkboxes for predefined ranges
        const checkboxes = canvas.queryAllByRole('checkbox');
        await expect(checkboxes.length).toBe(0);
    },
};
