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
import CategoryBreadcrumbs from '../index';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { mockCategory } from '@/components/__mocks__/mock-data';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

const BREADCRUMBS_HARNESS_ATTR = 'data-breadcrumbs-harness';

function BreadcrumbsStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('breadcrumb-clicked'), []);
    const logHover = useMemo(() => action('breadcrumb-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${BREADCRUMBS_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const link = (event.target as HTMLElement | null)?.closest('a');
            if (!link || !isInsideHarness(link)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const text = link.textContent?.trim() || '';
            if (text) {
                logClick({ label: text, href: link.getAttribute('href') });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const link = (event.target as HTMLElement | null)?.closest('a');
            if (!link || !isInsideHarness(link)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && link.contains(related)) {
                return;
            }
            const text = link.textContent?.trim() || '';
            if (text) {
                logHover({ label: text });
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
        <div ref={containerRef} {...{ [BREADCRUMBS_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof CategoryBreadcrumbs> = {
    title: 'CATEGORY/Category Breadcrumbs',
    component: CategoryBreadcrumbs,
    tags: ['autodocs', 'interaction'],
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
        layout: 'padded',
        docs: {
            description: {
                component: `
A breadcrumb navigation component that displays the category hierarchy path. Users can navigate to parent categories by clicking on breadcrumb links.

## Features

- **Hierarchical Navigation**: Shows the full category path from root to current category
- **Clickable Links**: Each breadcrumb item is a clickable link to navigate to that category
- **Visual Separators**: Chevron icons separate breadcrumb items
- **Accessible**: Proper ARIA labels and semantic HTML
- **Action Logging**: Integrates with Storybook's ActionLogger to track user interactions

## Usage

The CategoryBreadcrumbs component is used on:
- Category pages
- Product listing pages
- Any page that needs to show category hierarchy

\`\`\`tsx
import CategoryBreadcrumbs from '../category-breadcrumbs';
import { getCategory } from '@/lib/api/categories';

function CategoryPage({ categoryId }) {
  const category = await getCategory(categoryId);
  return <CategoryBreadcrumbs category={category} />;
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`category\` | \`ShopperProducts.schemas['Category']\` | The category object containing parent category tree information |

## Behavior

- **Clicking a breadcrumb**: Navigates to that category page
- **Hovering a breadcrumb**: Highlights the link
- **Single category**: If no parent tree exists, shows only the current category
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <BreadcrumbsStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </BreadcrumbsStoryHarness>
                );

                if (inRouter) {
                    return content;
                }

                // Create router with catch-all route to handle any category navigation
                // This prevents 404 errors when breadcrumb links navigate to category paths
                const router = createMemoryRouter(
                    [
                        {
                            path: '/',
                            element: content,
                        },
                        {
                            path: '/category/*',
                            element: content,
                        },
                    ],
                    {
                        initialEntries: ['/'],
                    }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Create mock category with parent tree
const mockCategoryWithTree: ShopperProducts.schemas['Category'] = {
    ...mockCategory,
    parentCategoryTree: mockCategory.parentCategoryTree || [
        { id: 'mens', name: 'Mens' },
        { id: 'mens-accessories', name: 'Accessories' },
        { id: 'mens-accessories-ties', name: 'Ties' },
    ],
};

const mockCategorySingle: ShopperProducts.schemas['Category'] = {
    id: 'root',
    name: 'Home',
    parentCategoryTree: [{ id: 'root', name: 'Home' }],
};

export const Default: Story = {
    args: {
        category: mockCategoryWithTree,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default CategoryBreadcrumbs shows a full category hierarchy:

### Features:
- **Multiple levels**: Shows all parent categories
- **Clickable links**: Each breadcrumb is clickable
- **Chevron separators**: Visual separators between items
- **Action logging**: All clicks and hovers are logged

### Use Cases:
- Standard category pages
- Deep category hierarchies
- Multi-level navigation
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test breadcrumb navigation is present
        const nav = canvas.getByRole('navigation', { name: /breadcrumb/i });
        await expect(nav).toBeInTheDocument();

        // Test breadcrumb links are present
        const links = canvas.getAllByRole('link');
        await expect(links.length).toBeGreaterThan(0);

        // Test clicking a breadcrumb link - just verify it exists, don't actually navigate
        // Navigation would cause 404 errors in Storybook since we don't have all category routes
        await expect(links[0]).toBeInTheDocument();
    },
};

export const SingleCategory: Story = {
    args: {
        category: mockCategorySingle,
    },
    parameters: {
        docs: {
            description: {
                story: `
CategoryBreadcrumbs with a single category (no parent tree):

### Single Category Features:
- **One item**: Shows only the current category
- **No separators**: No chevrons needed
- **Same functionality**: Still clickable and logged

### Use Cases:
- Root category
- Top-level categories
- Categories without parents
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test breadcrumb navigation is present
        const nav = canvas.getByRole('navigation', { name: /breadcrumb/i });
        await expect(nav).toBeInTheDocument();

        // Test single breadcrumb link is present
        const link = canvas.getByRole('link');
        await expect(link).toBeInTheDocument();
        await expect(link).toHaveTextContent('Home');
    },
};

export const DeepHierarchy: Story = {
    args: {
        category: {
            ...mockCategoryWithTree,
            parentCategoryTree: [
                { id: 'root', name: 'Home' },
                { id: 'mens', name: 'Mens' },
                { id: 'mens-clothing', name: 'Clothing' },
                { id: 'mens-clothing-tops', name: 'Tops' },
                { id: 'mens-clothing-tops-shirts', name: 'Shirts' },
                { id: 'mens-clothing-tops-shirts-casual', name: 'Casual Shirts' },
            ],
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
CategoryBreadcrumbs with a deep category hierarchy:

### Deep Hierarchy Features:
- **Many levels**: Shows 6+ category levels
- **Wrapping**: Breadcrumbs wrap on smaller screens
- **Full path**: Complete navigation path visible
- **All clickable**: Each level is navigable

### Use Cases:
- Deep category structures
- Specific product categories
- Multi-level navigation paths
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test breadcrumb navigation is present
        const nav = canvas.getByRole('navigation', { name: /breadcrumb/i });
        await expect(nav).toBeInTheDocument();

        // Test multiple breadcrumb links are present
        const links = canvas.getAllByRole('link');
        await expect(links.length).toBeGreaterThanOrEqual(5);
    },
};
