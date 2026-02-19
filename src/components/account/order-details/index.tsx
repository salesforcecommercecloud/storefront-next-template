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
import { useTranslation } from 'react-i18next';
import type { ShopperOrders } from '@salesforce/storefront-next-runtime/scapi';
import OrderItemsList, { type ProductDataById } from '@/components/account/order-details/order-items-list';
import OrderSummary from '@/components/order-summary';
import ShippingAddressDisplay from '@/components/checkout/components/shipping-address-display';

const BACK_LINK_PREFIX = '< ';

const SHIPMENT_RECIPIENT_SEPARATOR = ' → ';

export type { ProductDataById };

export type OrderDetailsProps = {
    order: ShopperOrders.schemas['Order'];
    productsById: ProductDataById;
};

function getShipmentRecipientName(shipment: ShopperOrders.schemas['Shipment']): string {
    const addr = shipment.shippingAddress;
    if (addr?.firstName || addr?.lastName) {
        return [addr.firstName, addr.lastName].filter(Boolean).join(' ');
    }
    if (addr?.fullName) {
        return addr.fullName;
    }
    return '';
}

type ProductItem = ShopperOrders.schemas['ProductItem'];

function groupProductItemsByShipmentId(productItems: ProductItem[]): Record<string, ProductItem[]> {
    return productItems.reduce<Record<string, ProductItem[]>>((itemsByShipmentId, item) => {
        const shipmentId = item.shipmentId ?? 'default';
        if (!itemsByShipmentId[shipmentId]) itemsByShipmentId[shipmentId] = [];
        itemsByShipmentId[shipmentId].push(item);
        return itemsByShipmentId;
    }, {});
}

function getOrderStatusLabel(status: string | undefined, t: ReturnType<typeof useTranslation>['t']): string {
    switch (status) {
        case 'new':
            return t('orders.status.new');
        case 'shipped':
            return t('orders.status.inTransit');
        case 'delivered':
            return t('orders.status.delivered');
        default:
            return status ?? '';
    }
}

export function OrderDetails({ order, productsById }: OrderDetailsProps): ReactElement {
    const { t } = useTranslation('account');
    const shipments = order.shipments ?? [];
    const productItems = order.productItems ?? [];
    const orderStatusLabel = getOrderStatusLabel(order.status, t);
    const itemsByShipmentId = groupProductItemsByShipmentId(productItems);

    return (
        <div data-section="order-details">
            {/* Back to Order History */}
            <Link
                to="/account/orders"
                className="inline-block text-sm text-muted-foreground hover:text-foreground mb-5">
                {BACK_LINK_PREFIX}
                {t('orders.backToOrderHistory')}
            </Link>

            {/* Single bordered container for the whole order details component */}
            <Card className="rounded-none">
                <CardContent className="px-6 pt-0 pb-6 space-y-6">
                    {/* Order Details header */}
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">{t('orders.orderDetailsPageTitle')}</h1>
                            <p className="mt-1 text-base font-medium text-muted-foreground">
                                {t('orders.orderDetailsTitle')}
                                <span> #{order.orderNo}</span>
                            </p>
                        </div>
                        <span className="inline-flex w-fit items-center bg-primary/10 px-3 py-1 text-sm font-medium text-primary shrink-0">
                            {orderStatusLabel}
                        </span>
                    </div>
                    <div className="border-t border-muted-foreground/20" aria-hidden />

                    {/* Items Ordered and Order Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-semibold">{t('orders.itemsOrdered')}</h2>
                            <Card className="rounded-none p-0 overflow-visible">
                                <CardContent className="p-0">
                                    {shipments.map((shipment, idx) => {
                                        const sid = shipment.shipmentId ?? `ship-${idx}`;
                                        const items = itemsByShipmentId[sid] ?? [];
                                        const recipientName = getShipmentRecipientName(shipment);
                                        return (
                                            <div
                                                key={sid}
                                                data-shipment-id={sid}
                                                className={idx > 0 ? 'border-t border-muted-foreground/20' : ''}>
                                                <div className="px-3 py-2 bg-muted rounded-none">
                                                    <p className="text-sm">
                                                        <span className="font-medium">
                                                            {t('orders.shipmentNumber', {
                                                                n: String(idx + 1),
                                                            })}
                                                        </span>
                                                        {recipientName && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {SHIPMENT_RECIPIENT_SEPARATOR}
                                                                {recipientName}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="p-3">
                                                    <OrderItemsList items={items} productsById={productsById} />
                                                </div>
                                                {/* Tracking Number and Shipping Address for this shipment */}
                                                <div className="mt-2 border-t border-muted-foreground/20 pt-4 px-3 pb-3 mx-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {shipment.trackingNumber != null && (
                                                            <Card
                                                                className="rounded-none min-h-[4rem] p-0 bg-card"
                                                                data-card="tracking-number">
                                                                <CardContent className="p-3">
                                                                    <p className="text-xs font-semibold text-muted-foreground">
                                                                        {t('orders.trackingNumber')}
                                                                    </p>
                                                                    <p className="mt-2 text-sm font-medium text-foreground break-all">
                                                                        {shipment.trackingNumber}
                                                                    </p>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                        {shipment.shippingAddress && (
                                                            <Card
                                                                className="rounded-none min-h-[4rem] p-0 bg-card"
                                                                data-card="shipping-address">
                                                                <CardContent className="p-3">
                                                                    <p className="text-xs font-semibold text-muted-foreground">
                                                                        {t('orders.shippingAddress')}
                                                                    </p>
                                                                    <div className="mt-2">
                                                                        <ShippingAddressDisplay
                                                                            address={shipment.shippingAddress}
                                                                        />
                                                                    </div>
                                                                    {shipment.shippingMethod?.name && (
                                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                                            {shipment.shippingMethod.name}
                                                                        </p>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>
                        {/* Order Summary – OrderSummary accepts both Basket and Order for totals */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">{t('orders.orderSummary')}</h3>
                            <OrderSummary basket={order} showCartItems={false} showHeading={false} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default OrderDetails;
