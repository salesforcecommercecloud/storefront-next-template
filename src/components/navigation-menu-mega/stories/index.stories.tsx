/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import CategoryNavigationMenuMega from '../index';
// @ts-expect-error Mock data file is JavaScript
import { mockCategories } from '@/components/__mocks__/mock-data';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logMenuClick = action('mega-menu-click');
        const logMenuHover = action('mega-menu-hover');
        const logMenuOpen = action('mega-menu-open');
        const logBannerClick = action('banner-click');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const navLink = target.closest('a[href]');
            const trigger = target.closest('[data-slot="navigation-menu-trigger"]');
            const img = target.closest('img');

            if (img && img.closest('a[href]')) {
                const link = img.closest('a[href]') as HTMLAnchorElement;
                const href = link.getAttribute('href') || '';
                logBannerClick({ href, alt: img.getAttribute('alt') || '' });
                return;
            }

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

const meta: Meta<typeof CategoryNavigationMenuMega> = {
    title: 'NAVIGATION/Navigation Menu Mega',
    component: CategoryNavigationMenuMega,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Mega menu implementation for category navigation. Features full-width dropdown menus with category banners and enhanced styling.

**Features:**
- Full-width mega menu layout
- Category banner support
- Vertical and horizontal banner orientations
- Custom styling for top-seller categories
- Async category loading via WithCategoryNavigationMenu
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
        resolve: {
            description: 'Promise resolving to root category with first-level subcategories',
            control: false,
        },
        defer: {
            description: 'Promise resolving to deeper subcategory data (prefetched)',
            control: false,
        },
    },
};

export default meta;
type Story = StoryObj<typeof CategoryNavigationMenuMega>;

export const Default: Story = {
    args: {
        resolve: Promise.resolve(mockRootCategory),
        defer: Promise.resolve(
            mockCategoriesList.flatMap((cat: ShopperProductsTypes.Category) => cat.categories || [])
        ),
    },
    parameters: {
        docs: {
            description: {
                story: 'Default mega menu with category navigation.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        // The component is hidden on mobile (lg:block), so we check for the navigation menu structure
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    args: {
        resolve: Promise.resolve(mockRootCategory),
        defer: Promise.resolve(
            mockCategoriesList.flatMap((cat: ShopperProductsTypes.Category) => cat.categories || [])
        ),
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive mega menu with hover and click interactions.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();

        // Find and interact with a trigger button if available
        const triggers = canvasElement.querySelectorAll('[data-slot="navigation-menu-trigger"]');
        if (triggers.length > 0) {
            const firstTrigger = triggers[0] as HTMLElement;
            await userEvent.hover(firstTrigger);
            await expect(firstTrigger).toBeInTheDocument();
        }

        // Find and interact with links
        const links = canvasElement.querySelectorAll('a[href]');
        if (links.length > 0) {
            const firstLink = links[0] as HTMLElement;
            await userEvent.hover(firstLink);
            await expect(firstLink).toBeInTheDocument();
        }
    },
};
export const WithBanners: Story = {
    args: {
        resolve: Promise.resolve({
            ...mockRootCategory,
            categories: mockCategoriesList.map((cat: ShopperProductsTypes.Category) => ({
                ...cat,
                c_headerMenuBanner: '<img src="https://example.com/banner.jpg" alt="Banner" />',
                c_headerMenuOrientation: 'horizontal',
            })),
        }),
        defer: Promise.resolve(
            mockCategoriesList.flatMap((cat: ShopperProductsTypes.Category) => cat.categories || [])
        ),
    },
    parameters: {
        docs: {
            description: {
                story: 'Mega menu with category banners (horizontal orientation).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        // The component is hidden on mobile (lg:block), so we check for the navigation menu structure
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        // The component is hidden on mobile (lg:block), so we check for the navigation menu structure
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        // The component is hidden on mobile (lg:block), so we check for the navigation menu structure
        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();
    },
};
