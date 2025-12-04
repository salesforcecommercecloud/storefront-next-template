import type { Meta, StoryObj } from '@storybook/react-vite';
import CategorySkeleton, {
    CategoryBreadcrumbsSkeleton,
    CategoryHeaderSkeleton,
    CategoryRefinementsSkeleton,
} from '../index';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children, name }: { children: ReactNode; name: string }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action(`${name}-render`);
        logRender({});
    }, [name]);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CategorySkeleton> = {
    title: 'CATEGORY/Category Skeleton',
    component: CategorySkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A skeleton loading component for category pages. This component displays placeholder content while category and product data is being loaded.

## Features

- **Product Grid Skeleton**: Placeholder cards for product listings
- **Pagination Skeleton**: Placeholder for pagination controls
- **Modular Components**: Separate skeletons for breadcrumbs, header, and refinements
- **Responsive**: Adapts to different screen sizes
- **Consistent Layout**: Matches the actual category page structure

## Usage

The CategorySkeleton is displayed while:
- Category data is being fetched
- Product search results are loading
- Refinements are being retrieved
- Initial page load

\`\`\`tsx
import CategorySkeleton from '../category-skeleton';

function CategoryPage() {
  if (isLoading) {
    return <CategorySkeleton />;
  }
  return <CategoryContent category={category} products={products} />;
}
\`\`\`

## Structure

- **CategorySkeleton**: Main skeleton with product grid and pagination
- **CategoryBreadcrumbsSkeleton**: Placeholder for breadcrumb navigation
- **CategoryHeaderSkeleton**: Placeholder for category title and sorting
- **CategoryRefinementsSkeleton**: Placeholder for filter sidebar
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger name="category-skeleton">
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `
The default CategorySkeleton shows the complete loading state:

### Features:
- **Product grid skeleton**: 12 product card placeholders
- **Pagination skeleton**: Placeholder pagination controls
- **Full layout**: Complete category page structure
- **Responsive**: Works on all screen sizes

### Use Cases:
- Initial page load
- Category data fetching
- Product search loading
- Standard loading state
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test skeleton container is present
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test product grid skeleton is present
        const grid = canvasElement.querySelector('.grid');
        await expect(grid).toBeInTheDocument();
    },
};

export const BreadcrumbsSkeleton: Story = {
    render: () => (
        <ActionLogger name="category-breadcrumbs-skeleton">
            <CategoryBreadcrumbsSkeleton />
        </ActionLogger>
    ),
    parameters: {
        docs: {
            description: {
                story: `
CategoryBreadcrumbsSkeleton shows placeholder for breadcrumb navigation:

### Features:
- **Breadcrumb placeholders**: Skeleton lines for breadcrumb items
- **Separator placeholders**: Skeleton for chevron separators
- **Compact layout**: Minimal space usage

### Use Cases:
- Breadcrumb loading state
- Navigation skeleton
- Category hierarchy loading
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test breadcrumb skeleton is present
        const nav = canvas.getByRole('navigation', { name: /breadcrumb/i });
        await expect(nav).toBeInTheDocument();
    },
};

export const HeaderSkeleton: Story = {
    render: () => (
        <ActionLogger name="category-header-skeleton">
            <CategoryHeaderSkeleton />
        </ActionLogger>
    ),
    parameters: {
        docs: {
            description: {
                story: `
CategoryHeaderSkeleton shows placeholder for category header:

### Features:
- **Title skeleton**: Placeholder for category title
- **Sorting skeleton**: Placeholder for sort dropdown
- **Flexible layout**: Adapts to content

### Use Cases:
- Category header loading
- Title and controls skeleton
- Header section loading state
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test header skeleton is present
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const RefinementsSkeleton: Story = {
    render: () => (
        <ActionLogger name="category-refinements-skeleton">
            <CategoryRefinementsSkeleton />
        </ActionLogger>
    ),
    parameters: {
        docs: {
            description: {
                story: `
CategoryRefinementsSkeleton shows placeholder for filter sidebar:

### Features:
- **Active filters skeleton**: Placeholder for active filter chips
- **Filter accordions skeleton**: Placeholder for filter sections
- **Sidebar layout**: Matches refinements structure

### Use Cases:
- Filter sidebar loading
- Refinements loading state
- Filter options skeleton
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test refinements skeleton is present
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test skeleton container is present
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test product grid skeleton is present
        const grid = canvasElement.querySelector('.grid');
        await expect(grid).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test skeleton container is present
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test product grid skeleton is present
        const grid = canvasElement.querySelector('.grid');
        await expect(grid).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test skeleton container is present
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test product grid skeleton is present
        const grid = canvasElement.querySelector('.grid');
        await expect(grid).toBeInTheDocument();
    },
};
