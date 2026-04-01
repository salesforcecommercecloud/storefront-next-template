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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { CurrencyProvider } from '@/providers/currency';
import ProductContentProvider from '@/providers/product-content';
import { mockConfig } from '@/test-utils/config';
import ReturnsAndWarranty from '../index';
import type { ReactElement } from 'react';

function ReturnsAndWarrantyWrapper(): ReactElement {
    const inRouter = useInRouterContext();
    const content = (
        <ConfigProvider config={mockConfig}>
            <CurrencyProvider value="USD">
                <ProductContentProvider>
                    <div className="max-w-md p-6">
                        <ReturnsAndWarranty productId="test-product-123" />
                    </div>
                </ProductContentProvider>
            </CurrencyProvider>
        </ConfigProvider>
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
        ],
        { initialEntries: ['/'] }
    );

    return <RouterProvider router={router} />;
}

const meta: Meta<typeof ReturnsAndWarrantyWrapper> = {
    title: 'Components/ReturnsAndWarranty',
    component: ReturnsAndWarrantyWrapper,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
};

export default meta;
type Story = StoryObj<typeof ReturnsAndWarrantyWrapper>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const card = await canvas.findByText('30-Day Returns & 1 Year Warranty', {}, { timeout: 5000 });
        await expect(card).toBeInTheDocument();
        await expect(canvas.getByText('View Policies')).toBeInTheDocument();
    },
};
