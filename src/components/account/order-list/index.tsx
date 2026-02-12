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
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/typography';
import { useTranslation } from 'react-i18next';
import {
    OrderListItem,
    type OrderListItemData,
    type OrderProductItem,
    type PickupLocation,
} from '@/components/account/order-list-item';

/**
 * Order status constants.
 * These are the supported status values from SCAPI.
 */
export const OrderStatus = {
    CREATED: 'created',
    NEW: 'new',
    FAILED: 'failed',
    FAILED_WITH_REOPEN: 'failed_with_reopen',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Order data structure for display.
 * Extended to support the new OrderListItem component.
 */
export type Order = {
    orderNo: string;
    orderDate: string;
    status: string;
    statusLabel?: string;
    total: number;
    currency?: string;
    itemCount: number;
    productItems?: OrderProductItem[];
    pickupLocation?: PickupLocation;
};

/**
 * Props for the OrderList component.
 */
export type OrderListProps = {
    title: string;
    subtitle?: string;
    orders: Order[];
    emptyMessage?: string;
    /** Maximum number of product thumbnails per order */
    maxThumbnails?: number;
    /** Callback when View Details is clicked */
    onViewDetails?: (orderNo: string) => void;
    /** Callback when Download Receipt is clicked */
    onDownloadReceipt?: (orderNo: string) => void;
};

/**
 * Convert Order to OrderListItemData format.
 */
function toOrderListItemData(order: Order): OrderListItemData {
    return {
        orderNo: order.orderNo,
        orderDate: order.orderDate,
        total: order.total,
        currency: order.currency,
        status: order.status,
        statusLabel: order.statusLabel,
        itemCount: order.itemCount,
        productItems: order.productItems,
        pickupLocation: order.pickupLocation,
    };
}

/**
 * Reusable order list component that displays a list of order cards.
 * Uses OrderListItem for each order with product thumbnails and pickup info.
 *
 * @param props - Component props
 * @returns JSX element representing the order list
 *
 * @example
 * ```tsx
 * <OrderList
 *   title="Order History"
 *   subtitle="View and track your orders"
 *   orders={orders}
 *   onViewDetails={(orderNo) => navigate(`/orders/${orderNo}`)}
 *   onDownloadReceipt={(orderNo) => downloadReceipt(orderNo)}
 * />
 * ```
 */
export function OrderList({
    title,
    subtitle,
    orders,
    emptyMessage,
    maxThumbnails = 12,
    onViewDetails,
    onDownloadReceipt,
}: OrderListProps): ReactElement {
    const { t } = useTranslation('account');

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="p-6 m-0 border-t border-x border-order-border rounded-t-xl">
                <Typography variant="h3" className="text-foreground font-semibold" tabIndex={0}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="small" as="p" className="text-muted-foreground mt-1">
                        {subtitle}
                    </Typography>
                )}
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <Card className="border-order-border">
                    <CardContent className="p-0">
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">{emptyMessage || t('orders.empty')}</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4 m-0 border-x border-t border-order-border">
                    {orders.map((order) => (
                        <OrderListItem
                            key={order.orderNo}
                            order={toOrderListItemData(order)}
                            maxThumbnails={maxThumbnails}
                            onViewDetails={onViewDetails}
                            onDownloadReceipt={onDownloadReceipt}
                        />
                    ))}
                </div>
            )}
            <div className="p-6 m-0 border-b border-x border-order-border rounded-b-xl">
                <Typography variant="small" as="p" className="text-muted-foreground">
                    {t('orders.totalOrders', { count: orders.length })}
                </Typography>
            </div>
        </div>
    );
}

// Re-export types from OrderListItem for convenience
export type { OrderProductItem, PickupLocation, OrderListItemData };

export default OrderList;
