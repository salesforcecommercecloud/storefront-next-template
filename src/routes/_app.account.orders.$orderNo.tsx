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
import { type ReactElement, Suspense } from 'react';
import { Await, Link, type LoaderFunctionArgs, redirect, useLoaderData } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import OrderDetails, { type ProductDataById } from '@/components/account/order-details';
import {
    mockOrderDetailsOrder,
    mockOrderDetailsProductsById,
} from '@/components/account/order-details/mock-order-details';
import OrderSkeleton from '@/components/order-skeleton';
import { useTranslation } from 'react-i18next';
import type { ShopperOrders } from '@salesforce/storefront-next-runtime/scapi';

type OrderDetailsLoaderData = {
    order: ShopperOrders.schemas['Order'];
    productsById: ProductDataById;
};

type OrderDetailsPageLoaderData = {
    orderData: Promise<OrderDetailsLoaderData>;
};

/** Loader returns mock order data. Replace with real SCAPI (getOrder + getProducts) when integrating. */
// eslint-disable-next-line react-refresh/only-export-components -- route file exports loader
export function loader({ params }: LoaderFunctionArgs): OrderDetailsPageLoaderData {
    const { orderNo } = params;
    if (!orderNo) {
        throw redirect('/account/orders');
    }

    const orderDataPromise = Promise.resolve({
        order: { ...mockOrderDetailsOrder, orderNo },
        productsById: mockOrderDetailsProductsById,
    });

    return {
        orderData: orderDataPromise,
    };
}

/** Shared UI for order not found / load error. Used by ErrorBoundary and Await errorElement. */
function OrderNotFoundCard() {
    const { t } = useTranslation('account');
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center">{t('orders.orderNotFound')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
                <Typography variant="p" className="text-muted-foreground">
                    {t('orders.orderNotFoundDescription')}
                </Typography>
                <Button asChild>
                    <Link to="/account/orders">{t('orders.backToOrderHistory')}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export function ErrorBoundary() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <OrderNotFoundCard />
            </div>
        </div>
    );
}

/** Order details at /account/orders/:orderNo – uses OrderDetails component. */
export default function OrderDetailsPage(): ReactElement {
    const loaderData = useLoaderData<OrderDetailsPageLoaderData>();
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Suspense fallback={<OrderSkeleton />}>
                <Await
                    resolve={loaderData.orderData}
                    errorElement={
                        <div className="px-4 py-8">
                            <OrderNotFoundCard />
                        </div>
                    }>
                    {(data) => <OrderDetails order={data.order} productsById={data.productsById} />}
                </Await>
            </Suspense>
        </div>
    );
}
