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
import { waitForStorybookReady } from '@storybook/test-utils';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { CurrencyProvider } from '@/providers/currency';
import ProductContentProvider from '@/providers/product-content';
import { mockConfig } from '@/test-utils/config';
import EstimatedDelivery from '../index';
import type { ReactElement } from 'react';

function EstimatedDeliveryWrapper(): ReactElement {
    const inRouter = useInRouterContext();
    const content = (
        <ConfigProvider config={mockConfig}>
            <CurrencyProvider value="USD">
                <ProductContentProvider>
                    <div className="max-w-md p-6">
                        <EstimatedDelivery productId="test-product-123" />
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

const meta: Meta<typeof EstimatedDeliveryWrapper> = {
    title: 'Components/EstimatedDelivery',
    component: EstimatedDeliveryWrapper,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
};

export default meta;
type Story = StoryObj<typeof EstimatedDeliveryWrapper>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const card = await canvas.findByText('Estimated Delivery', {}, { timeout: 5000 });
        await expect(card).toBeInTheDocument();
        await expect(canvas.getByText('Learn More')).toBeInTheDocument();
    },
};

export const WithModalInteraction: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await import('@/components/info-modal');
        const canvas = within(canvasElement);

        const learnMore = await canvas.findByText('Learn More', {}, { timeout: 5000 });
        await userEvent.click(learnMore);

        const documentBody = within(document.body);
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();
    },
};
