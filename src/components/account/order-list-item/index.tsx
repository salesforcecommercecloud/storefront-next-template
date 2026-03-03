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
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/typography';
import { useTranslation } from 'react-i18next';
import { Check, X, ChevronRight, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

/**
 * Order status constants for display.
 */
export const OrderDisplayStatus = {
    CREATED: 'created',
    NEW: 'new',
    FAILED: 'failed',
    FAILED_WITH_REOPEN: 'failed_with_reopen',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;

export type OrderDisplayStatusType = (typeof OrderDisplayStatus)[keyof typeof OrderDisplayStatus];

/**
 * Translation keys for order status labels.
 */
type StatusLabelKey =
    | 'orders.status.created'
    | 'orders.status.new'
    | 'orders.status.failed'
    | 'orders.status.failedWithReopen'
    | 'orders.status.completed'
    | 'orders.status.cancelled';

/**
 * Product item in an order for thumbnail display.
 */
export interface OrderProductItem {
    productId: string;
    quantity: number;
    imageUrl?: string;
    imageAlt?: string;
}

/**
 * Pickup location information.
 */
export interface PickupLocation {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
}

/**
 * Order data structure for the list item display.
 */
export interface OrderListItemData {
    orderNo: string;
    orderDate: string;
    total: number;
    currency?: string;
    status: string;
    statusLabel?: string;
    itemCount: number;
    productItems?: OrderProductItem[];
    pickupLocation?: PickupLocation;
}

/**
 * Props for the OrderListItem component.
 */
export interface OrderListItemProps {
    order: OrderListItemData;
    /** Maximum number of product thumbnails to show before "+X" indicator */
    maxThumbnails?: number;
    /** Callback when View Details is clicked */
    onViewDetails?: (orderNo: string) => void;
    /** Custom class name */
    className?: string;
}

/**
 * Status configuration mapping for visual styling.
 * Uses translation keys for labels (resolved in OrderStatusBadge).
 */
const STATUS_CONFIG: Record<
    OrderDisplayStatusType,
    {
        className: string;
        icon: React.ComponentType<{ className?: string }> | undefined;
        labelKey: string;
    }
> = {
    [OrderDisplayStatus.CREATED]: {
        className: 'border-transparent bg-order-status-new text-order-status-new-foreground',
        icon: undefined,
        labelKey: 'orders.status.created',
    },
    [OrderDisplayStatus.NEW]: {
        className: 'border-transparent bg-order-status-new text-order-status-new-foreground',
        icon: undefined,
        labelKey: 'orders.status.new',
    },
    [OrderDisplayStatus.FAILED]: {
        className: 'border-transparent bg-order-status-cancelled text-order-status-cancelled-foreground',
        icon: X,
        labelKey: 'orders.status.failed',
    },
    [OrderDisplayStatus.FAILED_WITH_REOPEN]: {
        className: 'border-transparent bg-order-status-warning text-order-status-warning-foreground',
        icon: undefined,
        labelKey: 'orders.status.failedWithReopen',
    },
    [OrderDisplayStatus.COMPLETED]: {
        className: 'border-transparent bg-order-status-completed text-order-status-completed-foreground',
        icon: Check,
        labelKey: 'orders.status.completed',
    },
    [OrderDisplayStatus.CANCELLED]: {
        className: 'border-transparent bg-order-status-cancelled text-order-status-cancelled-foreground',
        icon: X,
        labelKey: 'orders.status.cancelled',
    },
};

/**
 * Get status configuration with fallback.
 */
function getStatusConfig(status: string): {
    className: string;
    icon: React.ComponentType<{ className?: string }> | undefined;
    labelKey: string;
} {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_') as OrderDisplayStatusType;
    return STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG[OrderDisplayStatus.CREATED];
}

/**
 * Format a date string for display using the current locale.
 */
function formatOrderDate(dateString: string, locale: string, invalidDateLabel: string): string {
    try {
        const date = new Date(dateString);
        // Check if date is invalid
        if (isNaN(date.getTime())) {
            return invalidDateLabel;
        }
        return date.toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return invalidDateLabel;
    }
}

/**
 * Status badge component for order status display.
 */
function OrderStatusBadge({ status, label }: { status: string; label?: string }): ReactElement {
    const { t } = useTranslation('account');
    const config = getStatusConfig(status);
    const Icon = config.icon;
    const displayLabel = label ?? t(config.labelKey as StatusLabelKey);

    return (
        <Badge data-testid="order-status-badge" className={cn('gap-1 font-semibold', config.className)}>
            {Icon && <Icon className="size-3" />}
            {displayLabel}
        </Badge>
    );
}

/**
 * Product thumbnail component with quantity badge.
 */
function ProductThumbnail({ item }: { item: OrderProductItem }): ReactElement {
    return (
        <div className="relative">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.imageAlt || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-muted rounded" />
                )}
            </div>
            {item.quantity > 1 && (
                <Badge className="absolute -top-1.5 -right-1.5 size-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                    {item.quantity}
                </Badge>
            )}
        </div>
    );
}

/**
 * Overflow indicator for additional products.
 */
function OverflowIndicator({ count }: { count: number }): ReactElement {
    return (
        <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center">
            <Typography variant="small" as="span" className="text-muted-foreground">
                +{count}
            </Typography>
        </div>
    );
}

/**
 * Pickup location card component.
 */
function PickupLocationCard({ location }: { location: PickupLocation }): ReactElement {
    const { t } = useTranslation('account');
    const fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.postalCode}`;

    return (
        <Card className="bg-order-pickup border-order-pickup-border p-0">
            <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    <Typography variant="small" as="span" className="font-semibold text-foreground">
                        {t('orders.pickupLocation')}
                    </Typography>
                </div>

                <div className="space-y-1 pl-6">
                    <div>
                        <Typography variant="muted" as="p" className="text-xs">
                            {t('orders.location')}
                        </Typography>
                        <Typography variant="small" as="p" className="text-foreground">
                            {location.name}
                        </Typography>
                    </div>

                    <div>
                        <Typography variant="muted" as="p" className="text-xs">
                            {t('orders.address')}
                        </Typography>
                        <Typography variant="small" as="p" className="text-foreground font-normal">
                            {fullAddress}
                        </Typography>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * OrderListItem component displays a single order in a card format.
 *
 * Features:
 * - Order date, total, and item count in header
 * - Status badge with color coding
 * - Product thumbnail gallery with quantity badges
 * - Optional pickup location details
 * - View details link and download receipt button
 *
 * @example
 * ```tsx
 * <OrderListItem
 *   order={{
 *     orderNo: 'ORD-001',
 *     orderDate: '2024-09-14T10:30:00Z',
 *     total: 48.38,
 *     status: 'ready_for_pickup',
 *     itemCount: 2,
 *     productItems: [
 *       { productId: '1', quantity: 1, imageUrl: '/img/shirt.jpg', imageAlt: 'Shirt' },
 *       { productId: '2', quantity: 2, imageUrl: '/img/pants.jpg', imageAlt: 'Pants' },
 *     ],
 *     pickupLocation: {
 *       name: 'Salesforce Foundations San Francisco',
 *       address: '415 Mission Street',
 *       city: 'San Francisco',
 *       state: 'CA',
 *       postalCode: '94105',
 *     },
 *   }}
 *   onViewDetails={(orderNo) => navigate(`/account/orders/${orderNo}`)}
 * />
 * ```
 */
export function OrderListItem({
    order,
    maxThumbnails = 12,
    onViewDetails,
    className,
}: OrderListItemProps): ReactElement {
    const { t, i18n } = useTranslation('account');
    const invalidDateLabel = t('orders.invalidDate');

    const productItems = order.productItems ?? [];
    const visibleProducts = productItems.slice(0, maxThumbnails);
    const overflowCount = productItems.length - maxThumbnails;

    const orderDetailsUrl = `/account/orders/${order.orderNo}`;

    return (
        <Link
            to={orderDetailsUrl}
            className={cn('block transition-opacity hover:opacity-95 m-0', className)}
            onClick={() => onViewDetails?.(order.orderNo)}>
            <Card className="py-0 rounded-none border-0 border-order-border shadow-none">
                <CardContent className="p-6 space-y-4 border-b border-order-border hover:bg-muted">
                    {/* Header: Order Info + Status */}
                    <div className="flex flex-wrap items-start justify-between border-b border-order-border -mx-6 -mt-6 px-6 pt-3 pb-3 mb-6 bg-muted">
                        <div className="flex flex-wrap gap-x-8 gap-y-2">
                            <div>
                                <Typography variant="muted" as="p" className="text-xs">
                                    {t('orders.orderDate')}
                                </Typography>
                                <Typography variant="small" as="p" className="text-foreground">
                                    {formatOrderDate(order.orderDate, i18n.language, invalidDateLabel)}
                                </Typography>
                            </div>
                            <div>
                                <Typography variant="muted" as="p" className="text-xs">
                                    {t('orders.total')}
                                </Typography>
                                <Typography variant="small" as="p" className="text-foreground">
                                    {formatCurrency(order.total, order.currency)}
                                </Typography>
                            </div>
                            <div>
                                <Typography variant="muted" as="p" className="text-xs">
                                    {t('orders.items')}
                                </Typography>
                                <Typography variant="small" as="p" className="text-foreground">
                                    {order.itemCount}
                                </Typography>
                            </div>
                        </div>

                        <OrderStatusBadge status={order.status} label={order.statusLabel} />
                    </div>

                    {/* Product Thumbnails */}
                    {productItems.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {visibleProducts.map((item) => (
                                <ProductThumbnail key={item.productId} item={item} />
                            ))}
                            {overflowCount > 0 && <OverflowIndicator count={overflowCount} />}
                        </div>
                    )}

                    {/* Pickup Location (if exists) */}
                    {order.pickupLocation && <PickupLocationCard location={order.pickupLocation} />}

                    {/* Footer: View Details Link */}
                    <div className="pt-2">
                        <Typography
                            variant="small"
                            as="span"
                            className="inline-flex items-center gap-1 text-primary hover:underline">
                            {t('orders.viewOrderDetails', 'View Order Details')}
                            <ChevronRight className="size-4" />
                        </Typography>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default OrderListItem;
