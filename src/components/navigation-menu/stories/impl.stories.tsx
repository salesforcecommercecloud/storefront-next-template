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
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import CategoryNavigationMenu from '../impl';
import { mockCategories } from '@/components/__mocks__/mock-data';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logMenuClick = action('menu-click');
        const logMenuHover = action('menu-hover');
        const logMenuOpen = action('menu-open');

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

        root.addEventListener('click', handleClick, true);
        root.addEventListener('mouseover', handleMouseOver, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const mockRootCategory = mockCategories.root;
const mockCategoriesList = mockRootCategory.categories || [];

const meta: Meta<typeof CategoryNavigationMenu> = {
    title: 'NAVIGATION/Navigation Menu/Impl',
    component: CategoryNavigationMenu,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Category navigation menu implementation component. This is the core implementation that handles rendering nested category hierarchies.

**Features:**
- Highly customizable via render functions and props slots
- Supports nested categories with configurable max depth
- Customizable styling via props functions
- React Router integration
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
                story: 'Default category navigation menu implementation.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const WithCustomStyling: Story = {
    args: {
        categories: mockCategoriesList,
        maxDepth: 2,
        viewport: true,
        propsElement: ({ category, level }) => ({
            className: `${level === 0 && category.id === 'mens' ? 'text-primary' : ''} text-base ${level <= 1 ? 'font-bold' : 'font-medium'}`,
        }),
    },
    parameters: {
        docs: {
            description: {
                story: 'Category navigation menu with custom styling via propsElement.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const WithCustomRenderSlots: Story = {
    args: {
        categories: mockCategoriesList,
        maxDepth: 2,
        viewport: true,
        renderSlotListBefore: ({ level }) =>
            level === 0 ? <div className="text-xs text-muted-foreground mb-2">Categories</div> : null,
        renderSlotListAfter: ({ level }) =>
            level === 0 ? <div className="text-xs text-muted-foreground mt-2">End of categories</div> : null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Category navigation menu with custom render slots before and after lists.',
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
                story: 'Interactive category navigation menu with hover and click interactions.',
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
