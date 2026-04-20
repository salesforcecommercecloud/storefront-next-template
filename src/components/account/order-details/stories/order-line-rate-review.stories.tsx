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
import { MemoryRouter } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import ProductContentProvider from '@/providers/product-content';
import AuthProvider from '@/providers/auth';
import { mockConfig, mockLocale } from '@/test-utils/config';
import { OrderLineRateReview } from '../order-line-rate-review';

const mockSite = mockConfig.commerce.sites[0];

const mockProduct = {
    id: '701643108633M',
    name: 'Sample Product',
    imageGroups: [
        {
            viewType: 'small',
            images: [{ link: 'https://example.com/product.jpg', alt: 'Sample Product' }],
        },
    ],
    variationAttributes: [],
    variationValues: {},
} as ShopperProducts.schemas['Product'];

const meta: Meta<typeof OrderLineRateReview> = {
    title: 'ACCOUNT/Order Details/Order Line Rate Review',
    component: OrderLineRateReview,
    tags: ['autodocs', 'skip-a11y'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Per-line “Rate & Review” control: opens the PDP-parity write-review modal when not submitted; shows “Review submitted” after submit. Requires ProductContentProvider (ancestor in the app).',
            },
        },
    },
    decorators: [
        (Story) => (
            <MemoryRouter>
                <ConfigProvider config={mockConfig}>
                    <AuthProvider value={{ userType: 'registered', customerId: 'cust-123' }}>
                        <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="GBP">
                            <ProductContentProvider>
                                <div className="p-2">
                                    <Story />
                                </div>
                            </ProductContentProvider>
                        </SiteProvider>
                    </AuthProvider>
                </ConfigProvider>
            </MemoryRouter>
        ),
    ],
    args: {
        product: mockProduct,
        lineKey: 'item-1',
        onLineReviewSubmitted: () => {},
    },
};

export default meta;
type Story = StoryObj<typeof OrderLineRateReview>;

export const Default: Story = {
    args: {
        reviewSubmitted: false,
    },
};

export const ReviewSubmitted: Story = {
    args: {
        reviewSubmitted: true,
    },
};
