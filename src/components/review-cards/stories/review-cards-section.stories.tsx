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
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@/config/context';
import { ProductProvider } from '@/providers/product-context';
import ProductContentProvider from '@/providers/product-content';
import { mockConfig } from '@/test-utils/config';
import ReviewCardsSection from '../review-cards-section';

const mockProduct = { id: 'storybook-product' };

function ReviewCardsSectionWrapper(): ReactElement {
    const inRouter = useInRouterContext();
    const content = (
        <ConfigProvider config={mockConfig}>
            <ProductProvider product={mockProduct}>
                <ProductContentProvider>
                    <div className="max-w-3xl">
                        <h2 className="mb-4 text-xl font-semibold">Customer Reviews</h2>
                        <ReviewCardsSection />
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

const meta: Meta<typeof ReviewCardsSectionWrapper> = {
    title: 'Components/ReviewCards/ReviewCardsSection',
    component: ReviewCardsSectionWrapper,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
ReviewCardsSection displays paginated customer reviews for a product.

**Features:**
- Fetches reviews from the product content adapter (getReviews)
- Pagination (5 per page) with previous/next and page numbers
- Scrolls to top of section on page change
- Must be used within PDP context (ProductProvider + ProductContentProvider)
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof ReviewCardsSectionWrapper>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Mock adapter returns 7 reviews; wait for "Showing 1-5 of 7 reviews"
        await expect(canvas.findByText(/Showing 1-5 of 7 reviews/, {}, { timeout: 5000 })).resolves.toBeInTheDocument();
        // Pagination to page 2
        const page2 = await canvas.findByRole('button', { name: 'Page 2' }, { timeout: 3000 });
        await userEvent.click(page2);
        await expect(canvas.findByText(/Showing 6-7 of 7 reviews/)).resolves.toBeInTheDocument();
    },
};
