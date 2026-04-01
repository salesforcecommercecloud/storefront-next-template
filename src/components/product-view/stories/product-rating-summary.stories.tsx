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
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { ProductProvider } from '@/providers/product-context';
import ProductContentProvider from '@/providers/product-content';
import { ProductReviewsProvider } from '@/providers/product-reviews-context';
import { mockConfig } from '@/test-utils/config';
import { ProductRatingSummary } from '../product-rating-summary';

const mockProduct = { id: 'storybook-product', name: 'Storybook Product' };

function ProductRatingSummaryWrapper(): ReactElement {
    const inRouter = useInRouterContext();
    const content = (
        <ConfigProvider config={mockConfig}>
            <ProductProvider product={mockProduct}>
                <ProductContentProvider>
                    <ProductReviewsProvider>
                        <div className="max-w-md">
                            <ProductRatingSummary />
                        </div>
                    </ProductReviewsProvider>
                </ProductContentProvider>
            </ProductProvider>
        </ConfigProvider>
    );

    if (inRouter) return content;

    const router = createMemoryRouter([{ path: '/', element: content }], { initialEntries: ['/'] });
    return <RouterProvider router={router} />;
}

const meta: Meta<typeof ProductRatingSummaryWrapper> = {
    title: 'Components/ProductView/ProductRatingSummary',
    component: ProductRatingSummaryWrapper,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Star rating summary under product description. Hover or focus to open distribution popover; click or Enter/Space to expand reviews accordion.',
            },
        },
    },
};

export default meta;

type Story = StoryObj<typeof ProductRatingSummaryWrapper>;

export const Default: Story = {};
