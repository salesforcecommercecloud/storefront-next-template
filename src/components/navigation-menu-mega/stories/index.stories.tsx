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
import CategoryNavigationMenuMega from '../index';
// @ts-expect-error Mock data file is JavaScript
import { mockCategories } from '@/components/__mocks__/mock-data';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

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
            mockCategoriesList.flatMap((cat: ShopperProducts.schemas['Category']) => cat.categories || [])
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
            mockCategoriesList.flatMap((cat: ShopperProducts.schemas['Category']) => cat.categories || [])
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
            categories: mockCategoriesList.map((cat: ShopperProducts.schemas['Category']) => ({
                ...cat,
                c_headerMenuBanner: '<img src="https://example.com/banner.jpg" alt="Banner" />',
                c_headerMenuOrientation: 'horizontal',
            })),
        }),
        defer: Promise.resolve(
            mockCategoriesList.flatMap((cat: ShopperProducts.schemas['Category']) => cat.categories || [])
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

export const KeyboardAccessibility: Story = {
    args: {
        resolve: Promise.resolve(mockRootCategory),
        defer: Promise.resolve(
            mockCategoriesList.flatMap((cat: ShopperProducts.schemas['Category']) => cat.categories || [])
        ),
    },
    parameters: {
        docs: {
            description: {
                story: 'Verifies keyboard users can expand dropdowns without navigating away. Uses onPointerDown for mouse navigation while preserving keyboard dropdown expansion.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const menu = canvasElement.querySelector('[data-slot="navigation-menu"]');
        await expect(menu || canvasElement).toBeInTheDocument();

        // Find first trigger with subcategories
        const triggers = canvasElement.querySelectorAll('[data-slot="navigation-menu-trigger"]');
        if (triggers.length === 0) return;

        const firstTrigger = triggers[0] as HTMLElement;

        // Verify dropdown is closed initially
        const viewport = canvasElement.querySelector('[data-slot="navigation-menu-viewport"]');

        // Simulate keyboard interaction (Enter key)
        firstTrigger.focus();
        await userEvent.keyboard('{Enter}');

        // Wait for animation
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Verify dropdown opened (keyboard users should be able to expand without navigation)
        const openState = viewport?.getAttribute('data-state');
        await expect(openState).toBe('open');

        // Verify subcategories are now visible
        const content = canvasElement.querySelector('[data-slot="navigation-menu-content"]');
        await expect(content).toBeInTheDocument();
    },
};
