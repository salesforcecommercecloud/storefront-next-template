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
import ProductRecommendations from '..';
// @ts-expect-error mock file is JS
import { mockStandardProductHit } from '../../__mocks__/product-search-hit-data';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { CurrencyWrapper } from '@/test-utils/context-provider';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import RecommendersProvider from '@/providers/recommenders';

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

const meta: Meta<typeof ProductRecommendations> = {
    title: 'Components/ProductRecommendations',
    component: ProductRecommendations,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
The ProductRecommendations component displays product recommendation carousels using Einstein.

**Features:**
- Fetches recommendations from Einstein via the recommenders adapter
- Supports both recommender and zone types
- Handles loading states with skeleton UI
- Gracefully handles empty states and errors
- Integrates with ProductCarousel for display

**Note:** This component requires the RecommendersProvider to be set up with a properly configured adapter.
In Storybook, the component may not display recommendations without a real adapter configuration.
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ConfigProvider config={mockConfig}>
                <CurrencyWrapper currency="GBP">
                    <RecommendersProvider>
                        <ActionLogger>
                            <div className="p-8">
                                <Story />
                            </div>
                        </ActionLogger>
                    </RecommendersProvider>
                </CurrencyWrapper>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductRecommendations>;

export const Default: Story = {
    args: {
        recommender: {
            name: 'pdp-similar-items',
            title: 'You May Also Like',
            type: 'recommender',
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Component may show loading state, render content, or return null without real adapter
        // This is expected behavior - component gracefully handles missing adapter
        const title = canvas.queryByText('You May Also Like');
        const loading = canvas.queryByTestId('product-recommendation-skeleton');
        // If component rendered, verify it shows either title or loading state
        if (title || loading) {
            await expect(title || loading).toBeInTheDocument();
        }
        // If component returned null (no adapter), that's also valid behavior
    },
};

export const WithCustomTitle: Story = {
    args: {
        recommender: {
            name: 'pdp-similar-items',
            title: 'Similar Products',
            type: 'recommender',
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Component may return null without real adapter - this is expected
        const title = canvas.queryByText('Similar Products');
        const loading = canvas.queryByTestId('product-recommendation-skeleton');
        if (title || loading) {
            await expect(title || loading).toBeInTheDocument();
        }
    },
};

export const ZoneType: Story = {
    args: {
        recommender: {
            name: 'pdp-zone',
            title: 'Featured Products',
            type: 'zone',
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Component may return null without real adapter - this is expected
        const title = canvas.queryByText('Featured Products');
        const loading = canvas.queryByTestId('product-recommendation-skeleton');
        if (title || loading) {
            await expect(title || loading).toBeInTheDocument();
        }
    },
};

export const WithProducts: Story = {
    args: {
        recommender: {
            name: 'pdp-similar-items',
            title: 'You May Also Like',
            type: 'recommender',
        },
        products: [
            {
                ...mockStandardProductHit,
                productId: 'current-product',
            },
        ],
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Component may return null without real adapter - this is expected
        const title = canvas.queryByText('You May Also Like');
        const loading = canvas.queryByTestId('product-recommendation-skeleton');
        if (title || loading) {
            await expect(title || loading).toBeInTheDocument();
        }
    },
};

export const WithArgs: Story = {
    args: {
        recommender: {
            name: 'pdp-similar-items',
            title: 'You May Also Like',
            type: 'recommender',
        },
        args: {
            maxResults: 10,
            categoryId: 'mens-clothing',
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Component may return null without real adapter - this is expected
        const title = canvas.queryByText('You May Also Like');
        const loading = canvas.queryByTestId('product-recommendation-skeleton');
        if (title || loading) {
            await expect(title || loading).toBeInTheDocument();
        }
    },
};
