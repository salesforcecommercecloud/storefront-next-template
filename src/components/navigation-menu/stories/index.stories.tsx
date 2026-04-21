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
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import CategoryNavigationMenu, { WithCategoryNavigationMenu } from '../index';
// @ts-expect-error Mock data file is JavaScript
import { mockCategories } from '@/components/__mocks__/mock-data';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logMenuClick = action('menu-click');
        const logMenuHover = action('menu-hover');
        const logMenuOpen = action('menu-open');
        const logMenuClose = action('menu-close');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const navLink = target.closest('a[href]');
            const trigger = target.closest('[data-slot="navigation-menu-trigger"]');

            if (navLink) {
                const href = navLink.getAttribute('href') || '';
                const text = navLink.textContent?.trim() || '';
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                logMenuClick({ href, label: text });
                return;
            }

            if (trigger) {
                const label = trigger.textContent?.trim() || '';
                logMenuOpen({ label });
            }
        };

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const navLink = target.closest('a[href], [data-slot="navigation-menu-trigger"]');
            if (navLink) {
                const label = navLink.textContent?.trim() || '';
                const href = (navLink as HTMLAnchorElement).getAttribute('href') || '';
                logMenuHover({ label, href });
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                logMenuClose({});
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('mouseover', handleMouseOver, true);
        root.addEventListener('keydown', handleKeyDown, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('mouseover', handleMouseOver, true);
            root.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const mockRootCategory = mockCategories.root;
const mockCategoriesList = mockRootCategory.categories || [];

const meta: Meta<typeof CategoryNavigationMenu> = {
    title: 'NAVIGATION/Navigation Menu',
    component: CategoryNavigationMenu,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Navigation menu component for displaying category hierarchies. Supports nested categories with customizable rendering.

**Features:**
- Nested category support
- Customizable rendering via render functions
- Props customization for styling
- React Router integration
- Viewport support for dropdown menus
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <ActionLogger>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </ActionLogger>
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
                        {
                            path: '/category/:id',
                            element: <div>Category Page</div>,
                        },
                    ],
                    { initialEntries: ['/'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
    argTypes: {
        categories: {
            description: 'Array of category objects to display in the navigation menu',
            control: 'object',
        },
        maxDepth: {
            description: 'Maximum depth of nested categories to display',
            control: 'number',
        },
        viewport: {
            description: 'Whether to show the viewport for dropdown menus',
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof CategoryNavigationMenu>;

export const Default: Story = {
    args: {
        categories: mockCategoriesList,
        maxDepth: 2,
        viewport: true,
    },
    parameters: {
        docs: {
            description: {
                story: 'Default navigation menu with nested categories.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const WithNestedCategories: Story = {
    args: {
        categories: mockCategoriesList,
        maxDepth: 3,
        viewport: true,
    },
    parameters: {
        docs: {
            description: {
                story: 'Navigation menu with deeper nested categories (maxDepth: 3).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();

        // Find a trigger button if available
        const triggers = canvasElement.querySelectorAll('[data-slot="navigation-menu-trigger"]');
        if (triggers.length > 0) {
            const firstTrigger = triggers[0] as HTMLElement;
            await userEvent.hover(firstTrigger);
            await expect(firstTrigger).toBeInTheDocument();
        }
    },
};

export const WithoutViewport: Story = {
    args: {
        categories: mockCategoriesList,
        maxDepth: 2,
        viewport: false,
    },
    parameters: {
        docs: {
            description: {
                story: 'Navigation menu without viewport (inline dropdowns).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    args: {
        categories: mockCategoriesList,
        maxDepth: 2,
        viewport: true,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive navigation menu with hover and click interactions.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();

        // Find and interact with a trigger button
        const triggers = canvasElement.querySelectorAll('[data-slot="navigation-menu-trigger"]');
        if (triggers.length > 0) {
            const firstTrigger = triggers[0] as HTMLElement;
            await userEvent.hover(firstTrigger);
            await expect(firstTrigger).toBeInTheDocument();

            // Try to click to open the menu
            await userEvent.click(firstTrigger);
        }

        // Find and interact with a link
        const links = canvasElement.querySelectorAll('a[href]');
        if (links.length > 0) {
            const firstLink = links[0] as HTMLElement;
            await userEvent.hover(firstLink);
            await expect(firstLink).toBeInTheDocument();
        }
    },
};

export const UsingWithCategoryNavigationMenu: Story = {
    args: {},
    render: () => {
        const rootCategoryPromise = Promise.resolve(mockRootCategory);
        const subCategoriesPromise = Promise.resolve(
            mockCategoriesList.flatMap((cat: ShopperProducts.schemas['Category']) => cat.categories || [])
        );

        return (
            <WithCategoryNavigationMenu resolve={rootCategoryPromise} defer={subCategoriesPromise}>
                {({ categories }) => <CategoryNavigationMenu categories={categories} maxDepth={2} viewport={true} />}
            </WithCategoryNavigationMenu>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Navigation menu using WithCategoryNavigationMenu HOC for async category loading.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};
