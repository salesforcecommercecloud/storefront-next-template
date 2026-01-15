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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Check, X, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

/**
 * Order status constants.
 * These are the supported status values from SCAPI.
 */
export const OrderStatus = {
    NEW: 'new',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Order data structure for display.
 */
export type Order = {
    orderNo: string;
    status: string;
    method: string;
    amount: number;
};

/**
 * Props for the OrderList component.
 */
export type OrderListProps = {
    title: string;
    subtitle?: string;
    orders: Order[];
    emptyMessage?: string;
    /** Callback when View Details button is clicked */
    onViewDetails?: (order: Order) => void;
};

/**
 * Status configuration mapping.
 * Maps each order status to its styling and icon.
 * Uses semantic color classes from the design system.
 */
const STATUS_CONFIG: Record<OrderStatusType, { className: string; icon: React.ComponentType<{ className?: string }> }> =
    {
        [OrderStatus.COMPLETED]: {
            className: 'border-transparent bg-success/85 text-success-foreground',
            icon: Check,
        },
        [OrderStatus.CANCELLED]: {
            className: 'border-transparent bg-destructive/20 text-destructive',
            icon: X,
        },
        [OrderStatus.NEW]: {
            className: 'border-transparent bg-primary/20 text-primary',
            icon: Clock,
        },
    };

/**
 * Get the appropriate styling and icon for an order status.
 */
function getStatusConfig(status: string): {
    className: string;
    icon: React.ComponentType<{ className?: string }>;
} {
    const normalizedStatus = status.toLowerCase() as OrderStatusType;
    return STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG[OrderStatus.NEW];
}

/**
 * Status badge component that displays order status with appropriate styling.
 * Supports multiple statuses with distinct colors matching Market Street design.
 *
 * @param status - The order status value
 * @param label - The display label for the status
 * @returns JSX element representing the status badge
 */
function StatusBadge({ status, label }: { status: string; label: string }): ReactElement {
    const { className, icon: Icon } = getStatusConfig(status);

    return (
        <Badge className={className}>
            {Icon && <Icon className="size-3 mr-1" />}
            {label}
        </Badge>
    );
}

/**
 * Reusable order list component that displays a table of orders.
 * Supports customizable header, description, and item limit.
 *
 * @param props - Component props
 * @returns JSX element representing the order list
 */
export function OrderList({ title, subtitle, orders, emptyMessage, onViewDetails }: OrderListProps): ReactElement {
    const { t } = useTranslation('account');

    // Display whatever orders are passed
    const displayOrders = orders;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                    {title}
                </h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>

            {/* Orders Table */}
            <Card className="border-border">
                <CardContent className="p-0">
                    {displayOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">{emptyMessage || t('orders.empty')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Table Header */}
                            <div className="hidden sm:grid sm:grid-cols-5 gap-4 px-6 py-3 border-b border-border bg-muted/30">
                                <div className="text-sm font-medium text-foreground">
                                    {t('orders.tableHeaders.orderNumber')}
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    {t('orders.tableHeaders.status')}
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    {t('orders.tableHeaders.method')}
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    {t('orders.tableHeaders.amount')}
                                </div>
                                <div className="text-sm font-medium text-foreground sr-only">
                                    {t('orders.tableHeaders.actions')}
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-border">
                                {displayOrders.map((order) => (
                                    <div
                                        key={order.orderNo}
                                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors">
                                        {/* Order Number */}
                                        <div>
                                            <span className="sm:hidden text-xs text-muted-foreground">
                                                {t('orders.tableHeaders.orderNumber')}:{' '}
                                            </span>
                                            <span className="text-sm font-medium text-foreground">{order.orderNo}</span>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <span className="sm:hidden text-xs text-muted-foreground mr-2">
                                                {t('orders.tableHeaders.status')}:{' '}
                                            </span>
                                            <StatusBadge status={order.status} label={order.status} />
                                        </div>

                                        {/* Method */}
                                        <div>
                                            <span className="sm:hidden text-xs text-muted-foreground">
                                                {t('orders.tableHeaders.method')}:{' '}
                                            </span>
                                            <span className="text-sm text-foreground">{order.method}</span>
                                        </div>

                                        {/* Amount */}
                                        <div>
                                            <span className="sm:hidden text-xs text-muted-foreground">
                                                {t('orders.tableHeaders.amount')}:{' '}
                                            </span>
                                            <span className="text-sm text-foreground">
                                                {formatCurrency(order.amount)}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="sm:text-right mt-2 sm:mt-0">
                                            <Button variant="outline" size="sm" onClick={() => onViewDetails?.(order)}>
                                                {t('orders.viewDetails')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default OrderList;
