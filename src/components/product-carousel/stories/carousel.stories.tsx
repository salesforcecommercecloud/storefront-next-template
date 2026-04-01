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
import ProductCarousel, { ProductCarouselWithSuspense } from '../carousel';
// @ts-expect-error mock file is JS
import { mockStandardProductHit } from '../../__mocks__/product-search-hit-data';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import DynamicImageProvider from '@/providers/dynamic-image';
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

const meta: Meta<typeof ProductCarousel> = {
    title: 'Components/ProductCarousel/Carousel',
    component: ProductCarousel,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ConfigProvider config={mockConfig}>
                <CurrencyWrapper currency="GBP">
                    <ActionLogger>
                        <DynamicImageProvider value={{ widths: ['50vw', '50vw', '15vw'] }}>
                            <div className="p-8">
                                <Story />
                            </div>
                        </DynamicImageProvider>
                    </ActionLogger>
                </CurrencyWrapper>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductCarousel>;

const products = Array(8)
    .fill(mockStandardProductHit)
    .map((p, i) => ({
        ...p,
        productId: `${p.productId}-${i}`,
        productName: `${p.productName} ${i + 1}`,
    }));

export const Default: Story = {
    args: {
        products,
        title: 'Featured Products',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Featured Products')).toBeInTheDocument();
        // Use getAllByRole('link') to find product tiles
        const items = canvas.getAllByRole('link');
        await expect(items.length).toBeGreaterThan(0);
    },
};

export const NoTitle: Story = {
    args: {
        products,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const title = canvas.queryByRole('heading', { level: 2 });
        await expect(title).not.toBeInTheDocument();
    },
};

export const Empty: Story = {
    args: {
        products: [],
        title: 'Empty Carousel',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('No products found')).toBeInTheDocument();
    },
};

export const WithSuspenseWrapper: Story = {
    render: () => <ProductCarouselWithSuspense products={products} title="Suspense Wrapper" />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Suspense Wrapper')).toBeInTheDocument();
    },
};
