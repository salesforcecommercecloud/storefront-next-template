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
import { expect, screen, userEvent, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@/config/context';
import { ProductProvider } from '@/providers/product-context';
import ProductContentProvider from '@/providers/product-content';
import { mockConfig } from '@/test-utils/config';
import WriteReviewButton from '../index';
import type { ReactElement } from 'react';

const mockProduct = { id: 'test-product-123' };

function WriteReviewButtonWrapper(): ReactElement {
    const inRouter = useInRouterContext();
    const content = (
        <ConfigProvider config={mockConfig}>
            <ProductProvider product={mockProduct}>
                <ProductContentProvider>
                    <div className="max-w-md p-6">
                        <WriteReviewButton />
                    </div>
                </ProductContentProvider>
            </ProductProvider>
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

const meta: Meta<typeof WriteReviewButtonWrapper> = {
    title: 'Components/WriteReviewButton',
    component: WriteReviewButtonWrapper,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The WriteReviewButton component opens the Write a Review modal.

**Features:**
- Fetches form config from the product content adapter (getWriteReviewForm)
- Displays the modal title as the button label when loaded
- Must be used within PDP context (ProductProvider + ProductContentProvider)
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof WriteReviewButtonWrapper>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Button label comes from adapter (mock returns "Write a Review" after load)
        const button = await screen.findByRole('button', { name: /write a review/i }, { timeout: 5000 });
        await expect(button).toBeInTheDocument();
    },
};

export const OpensModal: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await import('@/components/info-modal');
        const button = await screen.findByRole('button', { name: /write a review/i }, { timeout: 5000 });
        await userEvent.click(button);
        const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
        await expect(dialog).toBeInTheDocument();
        await expect(within(dialog).getByRole('heading', { name: 'Write a Review' })).toBeInTheDocument();
    },
};
