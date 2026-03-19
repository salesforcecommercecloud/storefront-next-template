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
import { useTranslation } from 'react-i18next';
import type { ShopperOrders } from '@salesforce/storefront-next-runtime/scapi';
import OrderItemsList, { type ProductDataById } from '@/components/account/order-details/order-items-list';
import OrderSummary from '@/components/order-summary';
import ShippingAddressDisplay from '@/components/checkout/components/shipping-address-display';

export type { ProductDataById };

export type OrderDetailsProps = {
    order: ShopperOrders.schemas['Order'];
    productsById: ProductDataById;
};

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

type PaymentMethodDisplay = { id: string; label: string };

function getPaymentMethodDisplays(
    order: ShopperOrders.schemas['Order'],
    t: ReturnType<typeof useTranslation>['t']
): PaymentMethodDisplay[] {
    const instruments = order.paymentInstruments ?? [];
    return instruments.flatMap((instrument, index) => {
        const card = instrument.paymentCard;
        if (!card?.numberLastDigits) return [];
        const id = instrument.paymentInstrumentId ?? `payment-${index}`;
        const cardType = card.cardType ?? 'Card';
        const label = t('orders.paymentMethodEndingIn', {
            cardType,
            lastDigits: card.numberLastDigits,
        });
        return [{ id, label }];
    });
}

export function OrderDetails({ order, productsById }: OrderDetailsProps): ReactElement {
    const { t } = useTranslation('account');
    const shipments = order.shipments ?? [];
    const productItems = order.productItems ?? [];
    const orderStatusLabel = getOrderStatusLabel(order.status, t);
    const itemsByShipmentId = groupProductItemsByShipmentId(productItems);
    const paymentMethodDisplays = getPaymentMethodDisplays(order, t);

    return (
        <div data-section="order-details">
            {/* Single bordered container for the whole order details component */}
            <Card className="rounded-none">
                <CardContent className="px-6 pt-0 pb-6 space-y-6">
                    {/* Order Details header */}
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">{t('orders.orderDetailsPageTitle')}</h1>
                            <p
                                className="mt-1 flex items-center text-base font-medium text-muted-foreground"
                                data-testid="order-number">
                                <span
                                    className="inline-flex size-4 shrink-0 items-center justify-center leading-none"
                                    aria-hidden="true">
                                    #
                                </span>
                                <span>{order.orderNo}</span>
                            </p>
                        </div>
                        <span
                            data-testid="order-status-badge"
                            className="inline-flex w-fit items-center bg-primary/10 px-3 py-1 text-sm font-medium text-primary shrink-0">
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
                                        return (
                                            <div
                                                key={sid}
                                                data-shipment-id={sid}
                                                className={idx > 0 ? 'border-t border-muted-foreground/20' : ''}>
                                                <div className="px-3 py-2 bg-muted rounded-none">
                                                    <p className="text-sm font-medium">
                                                        {t('orders.shipmentNumber', {
                                                            n: String(idx + 1),
                                                        })}
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
                                                                    <p className="text-xs font-semibold text-foreground">
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
                                                                    <p className="text-xs font-semibold text-foreground">
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
                            {paymentMethodDisplays.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-foreground">{t('orders.paymentMethod')}</p>
                                    <Card
                                        className="rounded-none p-0 bg-card border border-border"
                                        data-card="payment-method">
                                        <CardContent className="p-3 py-2">
                                            <ul className="text-sm font-medium text-muted-foreground space-y-1 list-none">
                                                {paymentMethodDisplays.map(({ id, label }) => (
                                                    <li key={id}>{label}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default OrderDetails;
