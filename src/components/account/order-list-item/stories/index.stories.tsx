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
import { OrderListItem, type OrderListItemData } from '../index';
import heroNewArrivals from '/images/hero-new-arrivals.webp';

const baseOrder: OrderListItemData = {
    orderNo: 'ORD-2024-001',
    orderDate: '2024-09-14T10:30:00Z',
    total: 48.38,
    currency: 'USD',
    status: 'ready_for_pickup',
    statusLabel: 'Ready for Pickup',
    itemCount: 2,
    productItems: [
        {
            productId: 'prod-1',
            productName: 'Classic White Shirt',
            quantity: 1,
            imageUrl: heroNewArrivals,
        },
        {
            productId: 'prod-2',
            productName: 'Blue Dress Pants',
            quantity: 2,
            imageUrl: heroNewArrivals,
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
        onDownloadReceipt: action('onDownloadReceipt'),
    },
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
                pickupWindowStart: '2024-09-16',
                pickupWindowEnd: '2024-09-20',
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
                    productName: 'Summer Dress',
                    quantity: 2,
                    imageUrl: heroNewArrivals,
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
                productName: `Product ${i + 1}`,
                quantity: i % 3 === 0 ? 2 : 1,
                imageUrl: heroNewArrivals,
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
                    productName: 'Cancelled Item 1',
                    quantity: 2,
                    imageUrl: heroNewArrivals,
                },
                {
                    productId: 'prod-5',
                    productName: 'Cancelled Item 2',
                    quantity: 3,
                    imageUrl: heroNewArrivals,
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
                    productName: 'Partially Delivered Item 1',
                    quantity: 3,
                    imageUrl: heroNewArrivals,
                },
                {
                    productId: 'prod-7',
                    productName: 'Partially Delivered Item 2',
                    quantity: 2,
                    imageUrl: heroNewArrivals,
                },
                {
                    productId: 'prod-8',
                    productName: 'Partially Delivered Item 3',
                    quantity: 4,
                    imageUrl: heroNewArrivals,
                },
                {
                    productId: 'prod-9',
                    productName: 'Partially Delivered Item 4',
                    quantity: 1,
                    imageUrl: heroNewArrivals,
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
                    productName: 'Product without image 1',
                    quantity: 1,
                },
                {
                    productId: 'prod-11',
                    productName: 'Product without image 2',
                    quantity: 2,
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
                        pickupWindowStart: '2024-09-16',
                        pickupWindowEnd: '2024-09-20',
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
                            productName: 'Summer Dress',
                            quantity: 2,
                            imageUrl: heroNewArrivals,
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
                        productName: `Product ${i + 1}`,
                        quantity: i % 3 === 0 ? 2 : 1,
                        imageUrl: heroNewArrivals,
                    })),
                }}
                maxThumbnails={12}
            />
        </div>
    ),
};
