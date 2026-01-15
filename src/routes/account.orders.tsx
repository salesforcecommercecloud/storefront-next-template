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
import { OrderList, type Order } from '@/components/account/order-list';

// Mock order data for UI development
// API statuses: 'new', 'completed', 'cancelled'
const MOCK_ORDERS: Order[] = [
    { orderNo: 'INV001', status: 'new', method: 'Credit Card', amount: 54.0 },
    { orderNo: 'INV002', status: 'new', method: 'Credit Card', amount: 43.0 },
    { orderNo: 'INV003', status: 'completed', method: 'Credit Card', amount: 48.38 },
    { orderNo: 'INV004', status: 'cancelled', method: 'Credit Card', amount: 95.92 },
    { orderNo: 'INV005', status: 'completed', method: 'Credit Card', amount: 250.0 },
];

/**
 * Order history page component that displays a list of customer orders.
 * Uses the reusable OrderList component.
 *
 * @returns JSX element representing the order history page
 */
export default function AccountOrders(): ReactElement {
    const { t } = useTranslation('account');

    const handleViewDetails = (_order: Order) => {
        // TODO: Navigate to order details page
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
