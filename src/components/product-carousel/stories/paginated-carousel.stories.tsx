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
import PaginatedProductCarousel from '../paginated-carousel';
// @ts-expect-error mock file is JS
import { mockStandardProductHit } from '../../__mocks__/product-search-hit-data';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';

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

const meta: Meta<typeof PaginatedProductCarousel> = {
    title: 'Components/ProductCarousel/PaginatedCarousel',
    component: PaginatedProductCarousel,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ConfigProvider config={mockConfig}>
                <ActionLogger>
                    <div className="p-8">
                        <Story />
                    </div>
                </ActionLogger>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PaginatedProductCarousel>;

const generateProducts = (count: number, start = 0) =>
    Array(count)
        .fill(mockStandardProductHit)
        .map((p, i) => ({
            ...p,
            productId: `${p.productId}-${start + i}`,
            productName: `${p.productName} ${start + i + 1}`,
        }));

const initialProducts = generateProducts(4);

export const Default: Story = {
    args: {
        products: initialProducts,
        total: 20,
        offset: 0,
        limit: 4,
        title: 'Paginated Carousel',
        onLoadMore: async (offset, limit) => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return generateProducts(limit, offset);
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Paginated Carousel')).toBeInTheDocument();
        // Use getAllByRole('link') which should find the product tiles
        const items = canvas.getAllByRole('link');
        expect(items.length).toBeGreaterThan(0);
    },
};

export const LoadingState: Story = {
    args: {
        products: initialProducts,
        total: 20,
        offset: 0,
        limit: 4,
        title: 'Loading State',
        onLoadMore: async () => {
            return new Promise(() => {}); // Never resolves
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Loading State')).toBeInTheDocument();
        const items = canvas.getAllByRole('link');
        expect(items.length).toBeGreaterThan(0);
    },
};

export const AllLoaded: Story = {
    args: {
        products: initialProducts,
        total: 4,
        offset: 0,
        limit: 4,
        title: 'All Products Loaded',
        onLoadMore: async () => [],
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('All Products Loaded')).toBeInTheDocument();
        const items = canvas.getAllByRole('link');
        expect(items.length).toBeGreaterThan(0);
    },
};
