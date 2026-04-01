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
import ProductView from '../product-view';
// @ts-expect-error mock file is JS
import { mockStandardProductOrderable } from '../../__mocks__/standard-product';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { CurrencyWrapper } from '@/test-utils/context-provider';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logAction = action('interaction');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactiveElement = target.closest('button, a, [role="button"]');
            if (interactiveElement) {
                event.preventDefault();
                event.stopPropagation();
                const label = interactiveElement.textContent?.trim().substring(0, 50) || 'unlabeled';
                const tag = interactiveElement.tagName.toLowerCase();

                if (label.match(/add to cart/i)) {
                    action('add-to-cart')({ label });
                } else if (label.match(/wishlist/i)) {
                    action('wishlist')({ label });
                } else {
                    logAction({ type: 'click', tag, label });
                }
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ProductView> = {
    title: 'Components/ProductView/ProductView',
    component: ProductView,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [
                    // In isolated Storybook context, heading hierarchy is incomplete (h1 -> h3)
                    // Real PDP page provides proper h1/h2 context from page layout
                    { id: 'heading-order', enabled: false },
                ],
            },
        },
    },
    decorators: [
        (Story) => {
            // Mock window.fetch to prevent 404s
            if (typeof window !== 'undefined') {
                window.fetch = async () =>
                    ({
                        ok: true,
                        json: async () => ({}),
                        text: async () => '',
                    }) as any;
            }
            return (
                <ConfigProvider config={mockConfig}>
                    <CurrencyWrapper currency="GBP">
                        <ActionLogger>
                            <div className="max-w-7xl mx-auto p-4">
                                <Story />
                            </div>
                        </ActionLogger>
                    </CurrencyWrapper>
                </ConfigProvider>
            );
        },
    ],
};

export default meta;
type Story = StoryObj<typeof ProductView>;

export const Default: Story = {
    args: {
        product: mockStandardProductOrderable.product as any,
        category: {
            id: 'mens-clothing-suits',
            name: 'Suits',
            parentCategoryTree: [
                { id: 'mens', name: 'Mens' },
                { id: 'mens-clothing', name: 'Clothing' },
            ],
        } as any,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check Title
        await expect(
            canvas.getByRole('heading', { level: 1, name: mockStandardProductOrderable.product.name })
        ).toBeInTheDocument();

        // Check Price
        const prices = canvas.getAllByText(/£99\.99/);
        await expect(prices.length).toBeGreaterThan(0);

        // Check Add to Cart
        const addToCart = canvas.getByRole('button', { name: /add to cart/i });
        await expect(addToCart).toBeInTheDocument();

        // Check Breadcrumbs
        await expect(canvas.getByText('Mens')).toBeInTheDocument();
        await expect(canvas.getByText('Clothing')).toBeInTheDocument();
    },
};

export const WithoutBreadcrumbs: Story = {
    args: {
        product: mockStandardProductOrderable.product as any,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { level: 1 })).toBeInTheDocument();
    },
};
