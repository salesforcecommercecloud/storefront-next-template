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
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { OrderList, type Order } from '@/components/account/order-list';
import heroNewArrivals from '/images/hero-new-arrivals.webp';

// Mock order data for UI development (order history list)
// Based on Order History page design: date, total, item count, thumbnails, pickup location
const MOCK_ORDERS: Order[] = [
    {
        orderNo: 'ORD-2024-001',
        orderDate: '2024-09-14T10:30:00Z',
        status: 'created',
        statusLabel: 'Created',
        total: 48.38,
        currency: 'USD',
        itemCount: 2,
        productItems: [
            { productId: '701643632930', productName: 'Classic White Shirt', quantity: 1, imageUrl: heroNewArrivals },
            { productId: '701643632931', productName: 'Blue Dress Pants', quantity: 2, imageUrl: heroNewArrivals },
        ],
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
    {
        orderNo: 'ORD-2024-002',
        orderDate: '2024-09-12T14:00:00Z',
        status: 'new',
        statusLabel: 'New',
        total: 43.0,
        currency: 'USD',
        itemCount: 1,
        productItems: [
            { productId: '701643632932', productName: 'Summer Dress', quantity: 2, imageUrl: heroNewArrivals },
        ],
    },
    {
        orderNo: 'ORD-2024-003',
        orderDate: '2024-09-10T08:00:00Z',
        status: 'failed',
        statusLabel: 'Failed',
        total: 54.0,
        currency: 'USD',
        itemCount: 4,
        productItems: [
            { productId: '701643632933', productName: 'Item 1', quantity: 3, imageUrl: heroNewArrivals },
            { productId: '701643632934', productName: 'Item 2', quantity: 2, imageUrl: heroNewArrivals },
            { productId: '701643632935', productName: 'Item 3', quantity: 4, imageUrl: heroNewArrivals },
            { productId: '701643632936', productName: 'Item 4', quantity: 1, imageUrl: heroNewArrivals },
        ],
    },
    {
        orderNo: 'ORD-2024-004',
        orderDate: '2024-09-08T11:30:00Z',
        status: 'failed_with_reopen',
        statusLabel: 'Failed With Reopen',
        total: 95.92,
        currency: 'USD',
        itemCount: 2,
        productItems: [
            { productId: '701643632937', productName: 'Reopened Item 1', quantity: 2, imageUrl: heroNewArrivals },
            { productId: '701643632938', productName: 'Reopened Item 2', quantity: 3, imageUrl: heroNewArrivals },
        ],
    },
    {
        orderNo: 'ORD-2024-005',
        orderDate: '2024-09-05T11:30:00Z',
        status: 'completed',
        statusLabel: 'Completed',
        total: 95.92,
        currency: 'USD',
        itemCount: 2,
        productItems: [
            { productId: '701643632939', productName: 'Completed Item 1', quantity: 2, imageUrl: heroNewArrivals },
            { productId: '701643632940', productName: 'Completed Item 2', quantity: 3, imageUrl: heroNewArrivals },
        ],
    },
    {
        orderNo: 'ORD-2024-006',
        orderDate: '2024-09-01T09:00:00Z',
        status: 'cancelled',
        statusLabel: 'Cancelled',
        total: 405.0,
        currency: 'USD',
        itemCount: 18,
        productItems: Array.from({ length: 18 }, (_, i) => ({
            productId: `7016436329${40 + i}`,
            productName: `Product ${i + 1}`,
            quantity: i % 3 === 0 ? 2 : 1,
            imageUrl: heroNewArrivals,
        })),
    },
];

/**
 * Order list page – renders at /account/orders.
 * Order details at /account/orders/:orderNo.
 */
export default function OrderListPage(): ReactElement {
    const { t } = useTranslation('account');
    const navigate = useNavigate();

    const handleViewDetails = (orderNo: string) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- navigate() result intentionally not awaited
        navigate(`/account/orders/${orderNo}`);
    };

    return (
        <OrderList
            title={t('navigation.orderHistory')}
            subtitle={t('orders.subtitle')}
            orders={MOCK_ORDERS}
            onViewDetails={handleViewDetails}
        />
    );
}
