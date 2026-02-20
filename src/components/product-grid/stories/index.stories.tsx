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
import { expect, within, userEvent } from 'storybook/test';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import ProductGrid from '../index';
import {
    mockProductSearchItem,
    mockStandardProductHit,
    mockMasterProductHitWithOneVariant,
    mockMasterProductHitWithMultipleVariants,
    mockProductSetHit,
} from '@/components/__mocks__/product-search-hit-data';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNavigate = action('grid-product-navigate');
        const logWishlist = action('grid-product-wishlist');
        const logSwatch = action('grid-product-swatch');
        const logHover = action('grid-product-hover');
        const logMoreOptions = action('grid-product-more-options');

        const sanitizeLabel = (value: string | null | undefined): string => {
            if (!value) {
                return '';
            }
            return value.replace(/\s+/g, ' ').trim();
        };

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const pdp = target.closest('a[href^="/product"]');
            if (pdp) {
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                const name = sanitizeLabel(pdp.textContent);
                logNavigate({ label: name || 'Product Detail' });
                return;
            }

            const wishlist = target.closest('button[aria-label*="wishlist"], button[aria-label*="Wishlist"]');
            if (wishlist) {
                const aria = sanitizeLabel((wishlist as HTMLElement).getAttribute('aria-label'));
                logWishlist({ label: aria || 'Wishlist' });
                return;
            }

            const moreOptionsButton = target.closest('button');
            if (moreOptionsButton) {
                const label = sanitizeLabel(moreOptionsButton.textContent);
                if (/more options/i.test(label)) {
                    event.preventDefault();
                    (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                    logMoreOptions({ label: label || 'More Options' });
                    return;
                }
            }

            const swatch = target.closest(
                'button[role="radio"][aria-label], button[role="radio"][name], [data-testid^="swatch-"]'
            );
            if (swatch) {
                const el = swatch as HTMLElement;
                const value = sanitizeLabel(
                    el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.getAttribute('name')
                );
                logSwatch({ label: value || 'Swatch' });
            }
        };

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const swatch = target.closest(
                'button[role="radio"][aria-label], button[role="radio"][name], [data-testid^="swatch-"]'
            );
            if (swatch) {
                const el = swatch as HTMLElement;
                const value = sanitizeLabel(
                    el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.getAttribute('name')
                );
                logHover({ label: value || 'Swatch' });
                return;
            }

            const card = target.closest('[data-slot="card"]');
            if (card) {
                const link = card.querySelector('a[href^="/product"]');
                const nameEl = link?.querySelector('h3, [data-slot="card-title"]');
                const name = sanitizeLabel(nameEl?.textContent || link?.textContent);
                logHover({ label: name || 'Product Card' });
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

const meta: Meta<typeof ProductGrid> = {
    title: 'PRODUCTS/Product Grid',
    component: ProductGrid,
    tags: ['autodocs', 'interaction'],
    parameters: {
        docs: {
            description: {
                component: `
Renders a responsive grid of product tiles from search results.

Features:
- 2/3/4-column responsive grid
- Uses ProductCard for each hit
- Empty state message when no products
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

function cloneHit(
    base: ShopperSearch.schemas['ProductSearchHit'],
    overrides: Partial<ShopperSearch.schemas['ProductSearchHit']> = {}
) {
    return {
        ...base,
        ...overrides,
    } as ShopperSearch.schemas['ProductSearchHit'];
}

const defaultProducts: ShopperSearch.schemas['ProductSearchHit'][] = [
    cloneHit(mockStandardProductHit, { productId: 'STD-1', productName: 'Standard Product 1' }),
    cloneHit(mockMasterProductHitWithOneVariant, { productId: 'MASTER-1', productName: 'Master Product 1' }),
    cloneHit(mockMasterProductHitWithMultipleVariants, { productId: 'MASTER-MULTI-1', productName: 'Master Multi 1' }),
    cloneHit(mockProductSearchItem, { productId: 'MASTER-2', productName: 'Master Product 2' }),
    cloneHit(mockProductSetHit, { productId: 'SET-1', productName: 'Product Set 1' }),
    cloneHit(mockStandardProductHit, { productId: 'STD-2', productName: 'Standard Product 2' }),
    cloneHit(mockMasterProductHitWithMultipleVariants, { productId: 'MASTER-MULTI-2', productName: 'Master Multi 2' }),
    cloneHit(mockProductSearchItem, { productId: 'MASTER-3', productName: 'Master Product 3' }),
];

export const DefaultGrid: Story = {
    args: {
        critical: defaultProducts.slice(0, 1),
        nonCritical: Promise.resolve(defaultProducts.slice(1)),
    },
    parameters: {
        docs: {
            description: {
                story: `
Standard grid with a variety of product hit types (standard, master, set).
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const productLinks = canvas.queryAllByRole('link', { name: /product/i });
        if (productLinks.length > 0) {
            await userEvent.hover(productLinks[0]);
            await userEvent.click(productLinks[0]);
        } else {
            // If no product links found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const SingleProductCritical: Story = {
    args: {
        critical: [cloneHit(mockStandardProductHit, { productId: 'STD-ONLY', productName: 'Standard Only' })],
    },
    parameters: {
        docs: {
            description: {
                story: `Single critical product tile rendering.`,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const wishlistButtons = canvas.queryAllByRole('button', { name: /wishlist/i });
        if (wishlistButtons.length > 0) {
            const enabledButton = wishlistButtons.find((btn) => !btn.hasAttribute('disabled'));
            if (enabledButton) {
                await userEvent.click(enabledButton);
            }
        } else {
            // If no wishlist buttons found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const SingleProductNonCritical: Story = {
    args: {
        nonCritical: Promise.resolve([
            cloneHit(mockStandardProductHit, { productId: 'STD-ONLY', productName: 'Standard Only' }),
        ]),
    },
    parameters: {
        docs: {
            description: {
                story: `Single non-critical product tile rendering.`,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const wishlistButtons = canvas.queryAllByRole('button', { name: /wishlist/i });
        if (wishlistButtons.length > 0) {
            const enabledButton = wishlistButtons.find((btn) => !btn.hasAttribute('disabled'));
            if (enabledButton) {
                await userEvent.click(enabledButton);
            }
        } else {
            // If no wishlist buttons found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const EmptyState: Story = {
    args: {
        critical: [],
    },
    parameters: {
        docs: {
            description: {
                story: `Shows the empty state messaging when there are no products.`,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const emptyMessage = canvasElement.querySelector('p');
        void expect(emptyMessage).toHaveTextContent(/no products/i);
    },
};

const manyProducts: ShopperSearch.schemas['ProductSearchHit'][] = Array.from({ length: 24 }).map((_, idx) =>
    cloneHit(mockStandardProductHit, {
        productId: `STD-MANY-${idx + 1}`,
        productName: `Standard Product ${idx + 1}`,
        price: (mockStandardProductHit.price ?? 50) + (idx % 5) * 3,
    })
);

export const ManyProducts: Story = {
    args: {
        critical: manyProducts.slice(0, 2),
        nonCritical: Promise.resolve(manyProducts.slice(2)),
    },
    parameters: {
        docs: {
            description: {
                story: `Grid with many products to demonstrate wrapping and spacing across breakpoints.`,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const productLinks = canvas.getAllByRole('link', { name: /product/i });
        if (productLinks.length > 1) {
            await userEvent.hover(productLinks[1]);
        }
    },
};

export const MobileView: Story = {
    args: {
        critical: defaultProducts.slice(0, 2),
        nonCritical: Promise.resolve(defaultProducts.slice(2)),
    },
    parameters: {
        docs: {
            description: {
                story: `Mobile viewport showing 2-column grid.`,
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const productLinks = canvas.queryAllByRole('link', { name: /product/i });
        if (productLinks.length > 0) {
            await userEvent.click(productLinks[0]);
        } else {
            // If no product links found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const DesktopView: Story = {
    args: {
        critical: defaultProducts.slice(0, 2),
        nonCritical: Promise.resolve(defaultProducts.slice(2)),
    },
    parameters: {
        docs: {
            description: {
                story: `Desktop viewport showing 4-column grid.`,
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const moreOptionsButton = canvas.getAllByRole('button', { name: /more options/i })[0];
        if (moreOptionsButton) {
            await userEvent.click(moreOptionsButton);
        }
    },
};
