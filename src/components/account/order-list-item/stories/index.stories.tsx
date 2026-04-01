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
import { action } from 'storybook/actions';
import { CurrencyWrapper } from '@/test-utils/context-provider';
import { OrderListItem, type OrderListItemData } from '../index';
import heroNewArrivals from '/images/hero-02.webp';

const baseOrder: OrderListItemData = {
    orderNo: 'ORD-2024-001',
    orderDate: '2024-09-14T10:30:00Z',
    total: 48.38,
    currency: 'GBP',
    status: 'ready_for_pickup',
    statusLabel: 'Ready for Pickup',
    itemCount: 2,
    productItems: [
        {
            productId: 'prod-1',
            quantity: 1,
            imageUrl: heroNewArrivals,
            imageAlt: 'Classic White Shirt',
        },
        {
            productId: 'prod-2',
            quantity: 2,
            imageUrl: heroNewArrivals,
            imageAlt: 'Blue Dress Pants',
        },
    ],
};

const meta: Meta<typeof OrderListItem> = {
    title: 'Account/OrderListItem',
    component: OrderListItem,
    parameters: {
        layout: 'padded',
    },
    argTypes: {
        order: {
            control: 'object',
        },
        maxThumbnails: {
            control: { type: 'number', min: 1, max: 20 },
        },
    },
    args: {
        onViewDetails: action('onViewDetails'),
    },
    decorators: [
        (Story) => (
            <CurrencyWrapper currency="GBP">
                <Story />
            </CurrencyWrapper>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof OrderListItem>;

/**
 * Default order list item showing basic order information.
 */
export const Default: Story = {
    args: {
        order: baseOrder,
    },
};

/**
 * Order with pickup location information displayed.
 */
export const WithPickupLocation: Story = {
    args: {
        order: {
            ...baseOrder,
            pickupLocation: {
                name: 'Salesforce Foundations San Francisco',
                address: '415 Mission Street',
                city: 'San Francisco',
                state: 'CA',
                postalCode: '94105',
            },
        },
    },
};

/**
 * Order in transit status.
 */
export const InTransit: Story = {
    args: {
        order: {
            ...baseOrder,
            orderNo: 'ORD-2024-002',
            orderDate: '2024-09-12T14:00:00Z',
            total: 43.0,
            status: 'in_transit',
            statusLabel: 'In Transit',
            itemCount: 1,
            productItems: [
                {
                    productId: 'prod-3',
                    quantity: 2,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Summer Dress',
                },
            ],
        },
    },
};

/**
 * Delivered order status.
 */
export const Delivered: Story = {
    args: {
        order: {
            ...baseOrder,
            orderNo: 'ORD-2024-003',
            orderDate: '2024-09-01T09:00:00Z',
            total: 405.0,
            status: 'delivered',
            statusLabel: 'Delivered',
            itemCount: 18,
            productItems: Array.from({ length: 18 }, (_, i) => ({
                productId: `prod-${i}`,
                quantity: i % 3 === 0 ? 2 : 1,
                imageUrl: heroNewArrivals,
                imageAlt: `Product ${i + 1}`,
            })),
        },
        maxThumbnails: 12,
    },
};

/**
 * Cancelled order status.
 */
export const Cancelled: Story = {
    args: {
        order: {
            ...baseOrder,
            orderNo: 'ORD-2024-004',
            orderDate: '2024-09-08T11:30:00Z',
            total: 95.92,
            status: 'cancelled',
            statusLabel: 'Cancelled',
            itemCount: 2,
            productItems: [
                {
                    productId: 'prod-4',
                    quantity: 2,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Cancelled Item 1',
                },
                {
                    productId: 'prod-5',
                    quantity: 3,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Cancelled Item 2',
                },
            ],
        },
    },
};

/**
 * Partially delivered order status.
 */
export const PartiallyDelivered: Story = {
    args: {
        order: {
            ...baseOrder,
            orderNo: 'ORD-2024-005',
            orderDate: '2024-09-10T08:00:00Z',
            total: 54.0,
            status: 'partially_delivered',
            statusLabel: 'Partially Delivered',
            itemCount: 4,
            productItems: [
                {
                    productId: 'prod-6',
                    quantity: 3,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Partially Delivered Item 1',
                },
                {
                    productId: 'prod-7',
                    quantity: 2,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Partially Delivered Item 2',
                },
                {
                    productId: 'prod-8',
                    quantity: 4,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Partially Delivered Item 3',
                },
                {
                    productId: 'prod-9',
                    quantity: 1,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Partially Delivered Item 4',
                },
            ],
        },
    },
};

/**
 * Order without product images (shows placeholder).
 */
export const WithoutImages: Story = {
    args: {
        order: {
            ...baseOrder,
            orderNo: 'ORD-2024-006',
            productItems: [
                {
                    productId: 'prod-10',
                    quantity: 1,
                },
                {
                    productId: 'prod-11',
                    quantity: 2,
                },
            ],
        },
    },
};

/**
 * Order with a mix of products with and without images.
 */
export const MixedImages: Story = {
    args: {
        order: {
            ...baseOrder,
            orderNo: 'ORD-2024-008',
            itemCount: 4,
            productItems: [
                {
                    productId: 'prod-12',
                    quantity: 1,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Product With Image',
                },
                {
                    productId: 'prod-13',
                    quantity: 2,
                },
                {
                    productId: 'prod-14',
                    quantity: 1,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Another Product With Image',
                },
                {
                    productId: 'prod-15',
                    quantity: 3,
                },
            ],
        },
    },
};

/**
 * Order with product images that have explicit alt text (from API image data).
 */
export const WithImageAlt: Story = {
    args: {
        order: {
            ...baseOrder,
            orderNo: 'ORD-2024-007',
            productItems: [
                {
                    productId: 'prod-1',
                    quantity: 1,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Classic White Shirt - Front View',
                },
                {
                    productId: 'prod-2',
                    quantity: 2,
                    imageUrl: heroNewArrivals,
                    imageAlt: 'Blue Dress Pants - Side View',
                },
            ],
        },
    },
};

/**
 * Multiple orders displayed in a list.
 */
export const OrdersList: Story = {
    render: () => (
        <div className="space-y-4">
            <OrderListItem
                order={{
                    ...baseOrder,
                    pickupLocation: {
                        name: 'Salesforce Foundations San Francisco',
                        address: '415 Mission Street',
                        city: 'San Francisco',
                        state: 'CA',
                        postalCode: '94105',
                    },
                }}
            />
            <OrderListItem
                order={{
                    ...baseOrder,
                    orderNo: 'ORD-2024-002',
                    orderDate: '2024-09-12T14:00:00Z',
                    total: 43.0,
                    status: 'in_transit',
                    statusLabel: 'In Transit',
                    itemCount: 1,
                    productItems: [
                        {
                            productId: 'prod-3',
                            quantity: 2,
                            imageUrl: heroNewArrivals,
                            imageAlt: 'Summer Dress',
                        },
                    ],
                }}
            />
            <OrderListItem
                order={{
                    ...baseOrder,
                    orderNo: 'ORD-2024-003',
                    orderDate: '2024-09-01T09:00:00Z',
                    total: 405.0,
                    status: 'delivered',
                    statusLabel: 'Delivered',
                    itemCount: 18,
                    productItems: Array.from({ length: 18 }, (_, i) => ({
                        productId: `prod-${i}`,
                        quantity: i % 3 === 0 ? 2 : 1,
                        imageUrl: heroNewArrivals,
                        imageAlt: `Product ${i + 1}`,
                    })),
                }}
                maxThumbnails={12}
            />
        </div>
    ),
};
