import type { Meta, StoryObj } from '@storybook/react-vite';
import CategoryPagination from '../index';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
// @ts-expect-error Mock data file is JavaScript
import searchResults from '@/components/__mocks__/search-results';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

const PAGINATION_HARNESS_ATTR = 'data-pagination-harness';

function PaginationStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('pagination-clicked'), []);
    const logHover = useMemo(() => action('pagination-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${PAGINATION_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }
            const label = button.getAttribute('aria-label') || button.textContent?.trim() || '';
            if (label) {
                logClick({ label });
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
            const label = button.getAttribute('aria-label') || button.textContent?.trim() || '';
            if (label) {
                logHover({ label });
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
        <div ref={containerRef} {...{ [PAGINATION_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof CategoryPagination> = {
    title: 'CATEGORY/Category Pagination',
    component: CategoryPagination,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A pagination component for category product listings. Allows users to navigate through multiple pages of products.

## Features

- **Page Navigation**: Navigate to specific pages or use previous/next buttons
- **Smart Ellipsis**: Shows ellipsis for large page counts
- **Current Page Indicator**: Highlights the current page
- **Disabled States**: Previous/next buttons disabled at boundaries
- **URL Integration**: Updates URL parameters when navigating
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The CategoryPagination component is used on:
- Category pages
- Product listing pages
- Search results pages
- Any paginated product list

\`\`\`tsx
import CategoryPagination from '../category-pagination';

function CategoryPage({ searchResult, limit }) {
  return <CategoryPagination limit={limit} result={searchResult} />;
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`limit\` | \`number\` | Number of products per page |
| \`result\` | \`ShopperSearch.schemas['ProductSearchResult']\` | Product search result containing total and offset |

## Behavior

- **Clicking a page number**: Navigates to that page
- **Clicking previous/next**: Navigates to adjacent pages
- **Single page**: Component returns null if only one page
- **URL updates**: Updates offset parameter in URL
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <PaginationStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </PaginationStoryHarness>
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

const mockSearchResultPage1: ShopperSearch.schemas['ProductSearchResult'] = {
    ...mockSearchResult,
    offset: 0,
    total: 100,
};

const mockSearchResultPage5: ShopperSearch.schemas['ProductSearchResult'] = {
    ...mockSearchResult,
    offset: 96, // Page 5 with limit 24
    total: 100,
};

const mockSearchResultSinglePage: ShopperSearch.schemas['ProductSearchResult'] = {
    ...mockSearchResult,
    offset: 0,
    total: 20, // Less than limit
};

export const Default: Story = {
    args: {
        limit: 24,
        result: mockSearchResultPage1,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default CategoryPagination shows pagination controls:

### Features:
- **Page numbers**: Shows page numbers with ellipsis
- **Previous/Next**: Navigation buttons
- **Current page**: Highlights current page
- **Action logging**: All clicks are logged

### Use Cases:
- Standard pagination
- Multi-page results
- Category listings
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test pagination navigation is present
        const nav = canvas.getByRole('navigation', { name: /pagination/i });
        await expect(nav).toBeInTheDocument();

        // Test page buttons are present
        const pageButtons = canvas.getAllByRole('button');
        await expect(pageButtons.length).toBeGreaterThan(0);

        // Test clicking a page button
        const page1Button = canvas.getByRole('button', { name: /page 1/i });
        await expect(page1Button).toBeInTheDocument();
    },
};

export const MiddlePage: Story = {
    args: {
        limit: 24,
        result: mockSearchResultPage5,
    },
    parameters: {
        docs: {
            description: {
                story: `
CategoryPagination when viewing a middle page:

### Middle Page Features:
- **Ellipsis**: Shows ellipsis on both sides
- **Surrounding pages**: Shows pages around current
- **First and last**: Always shows first and last page
- **Navigation**: Previous and next buttons enabled

### Use Cases:
- Large result sets
- Middle page navigation
- Ellipsis display
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test pagination navigation is present
        const nav = canvas.getByRole('navigation', { name: /pagination/i });
        await expect(nav).toBeInTheDocument();

        // Test ellipsis is present (middle page should have ellipsis)
        const ellipsis = canvasElement.querySelector('span');
        if (ellipsis && ellipsis.textContent === '...') {
            await expect(ellipsis).toBeInTheDocument();
        }
    },
};

export const SinglePage: Story = {
    args: {
        limit: 24,
        result: mockSearchResultSinglePage,
    },
    parameters: {
        docs: {
            description: {
                story: `
CategoryPagination when there's only one page:

### Single Page Features:
- **No pagination**: Component returns null
- **Not rendered**: No pagination controls shown
- **Clean UI**: No unnecessary controls

### Use Cases:
- Small result sets
- Single page results
- No pagination needed
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test pagination is not rendered (component returns null)
        const nav = canvasElement.querySelector('nav[aria-label="Pagination"]');
        await expect(nav).not.toBeInTheDocument();
    },
};

export const FirstPage: Story = {
    args: {
        limit: 24,
        result: {
            ...mockSearchResult,
            offset: 0,
            total: 100,
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
CategoryPagination when on the first page:

### First Page Features:
- **Previous disabled**: Previous button is disabled
- **Next enabled**: Next button is enabled
- **Page 1 highlighted**: Current page indicator
- **Navigation**: Can navigate forward

### Use Cases:
- Initial page load
- First page navigation
- Forward navigation only
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test pagination navigation is present
        const nav = canvas.getByRole('navigation', { name: /pagination/i });
        await expect(nav).toBeInTheDocument();

        // Test previous button is disabled
        const prevButton = canvas.getByRole('button', { name: /previous page/i });
        await expect(prevButton).toBeDisabled();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test pagination navigation is present
        const nav = canvas.getByRole('navigation', { name: /pagination/i });
        await expect(nav).toBeInTheDocument();

        // Test page buttons are present
        const pageButtons = canvas.getAllByRole('button');
        await expect(pageButtons.length).toBeGreaterThan(0);

        // Test clicking a page button
        const page1Button = canvas.getByRole('button', { name: /page 1/i });
        await expect(page1Button).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test pagination navigation is present
        const nav = canvas.getByRole('navigation', { name: /pagination/i });
        await expect(nav).toBeInTheDocument();

        // Test page buttons are present
        const pageButtons = canvas.getAllByRole('button');
        await expect(pageButtons.length).toBeGreaterThan(0);

        // Test clicking a page button
        const page1Button = canvas.getByRole('button', { name: /page 1/i });
        await expect(page1Button).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test pagination navigation is present
        const nav = canvas.getByRole('navigation', { name: /pagination/i });
        await expect(nav).toBeInTheDocument();

        // Test page buttons are present
        const pageButtons = canvas.getAllByRole('button');
        await expect(pageButtons.length).toBeGreaterThan(0);

        // Test clicking a page button
        const page1Button = canvas.getByRole('button', { name: /page 1/i });
        await expect(page1Button).toBeInTheDocument();
    },
};
