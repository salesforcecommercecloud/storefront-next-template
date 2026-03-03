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
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
 * Empty state displayed when the customer has no orders.
 */
function OrderListEmpty({ message }: { message?: string }): ReactElement {
    const { t } = useTranslation('account');

    return (
        <Card className="border-order-border m-0 rounded-none shadow-none border-b-0">
            <CardContent className="p-0">
                <div className="py-4 space-y-4 flex flex-col items-center justify-center">
                    <Typography variant="h4" className="text-muted-foreground w-fit">
                        {message || t('orders.empty')}
                    </Typography>
                    <Button asChild>
                        <Link to="/">{t('orders.continueShopping')}</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Page header for the order list with title and optional subtitle.
 * Extracted so the route can render it outside Suspense for instant display.
 */
export function OrderListHeader({ title, subtitle }: { title: string; subtitle?: string }): ReactElement {
    return (
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
    );
}

/**
 * Order items body with footer. Renders order cards, empty state, and total count.
 * Designed to be used inside Suspense/Await so the header can render instantly.
 */
export function OrderListBody({
    orders,
    emptyMessage,
    maxThumbnails = 12,
    onViewDetails,
}: Omit<OrderListProps, 'title' | 'subtitle'>): ReactElement {
    const { t } = useTranslation('account');

    return (
        <>
            {orders.length === 0 ? (
                <OrderListEmpty message={emptyMessage} />
            ) : (
                <div className="space-y-4 m-0 border-x border-t border-order-border">
                    {orders.map((order) => (
                        <OrderListItem
                            key={order.orderNo}
                            order={toOrderListItemData(order)}
                            maxThumbnails={maxThumbnails}
                            onViewDetails={onViewDetails}
                        />
                    ))}
                </div>
            )}
            <div className="p-6 m-0 border-b border-x border-order-border rounded-b-xl">
                <Typography variant="small" as="p" className="text-muted-foreground" data-testid="total-orders-text">
                    {t('orders.totalOrders', { count: orders.length })}
                </Typography>
            </div>
        </>
    );
}

/**
 * Reusable order list component that displays a list of order cards.
 * Composes OrderListHeader + OrderListBody for convenience.
 *
 * @example
 * ```tsx
 * <OrderList
 *   title="Order History"
 *   subtitle="View and track your orders"
 *   orders={orders}
 *   onViewDetails={(orderNo) => navigate(`/orders/${orderNo}`)}
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
}: OrderListProps): ReactElement {
    return (
        <div className="space-y-6">
            <OrderListHeader title={title} subtitle={subtitle} />
            <OrderListBody
                orders={orders}
                emptyMessage={emptyMessage}
                maxThumbnails={maxThumbnails}
                onViewDetails={onViewDetails}
            />
        </div>
    );
}

// Re-export types from OrderListItem for convenience
export type { OrderProductItem, PickupLocation, OrderListItemData };

export default OrderList;
