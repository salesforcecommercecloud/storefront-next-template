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
import { useTranslation } from 'react-i18next';
import { Await, useNavigate, useLoaderData, type LoaderFunctionArgs, redirect } from 'react-router';
import { OrderListHeader, OrderListBody } from '@/components/account/order-list';
import {
    fetchCustomerOrders,
    DEFAULT_ORDERS_OFFSET,
    DEFAULT_ORDERS_LIMIT,
    type CustomerOrdersResult,
} from '@/lib/api/order';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/typography';
import { getAuth } from '@/middlewares/auth.server';

type OrderListLoaderData = {
    ordersPromise: Promise<CustomerOrdersResult>;
};

/**
 * Loader fetches all customer orders via SCAPI getCustomerOrders endpoint.
 * Returns a deferred promise for streaming/suspense support.
 */
// eslint-disable-next-line react-refresh/only-export-components -- route file exports loader
export function loader({ context, request }: LoaderFunctionArgs): OrderListLoaderData {
    // Get customer ID from auth session
    const session = getAuth(context);
    if (!session.customerId) {
        throw redirect('/login');
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') ?? String(DEFAULT_ORDERS_OFFSET));
    const limit = parseInt(searchParams.get('limit') ?? String(DEFAULT_ORDERS_LIMIT));

    // Fetch orders asynchronously (deferred for streaming)
    const ordersPromise = fetchCustomerOrders(context, session.customerId, { offset, limit });

    return {
        ordersPromise,
    };
}

/**
 * Loading skeleton for order list items (header renders separately).
 */
function OrderListSkeleton(): ReactElement {
    return (
        <>
            <div className="space-y-4 m-0 border-x border-t border-order-border">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="py-0 rounded-none border-0 border-order-border shadow-none">
                        <CardContent className="p-6 space-y-4 border-b border-order-border animate-pulse">
                            <div className="flex flex-wrap items-start justify-between border-b border-order-border -mx-6 -mt-6 px-6 pt-3 pb-3 mb-6 bg-muted">
                                <div className="flex flex-wrap gap-x-8 gap-y-2">
                                    <div className="h-10 w-24 bg-muted-foreground/20 rounded" />
                                    <div className="h-10 w-20 bg-muted-foreground/20 rounded" />
                                    <div className="h-10 w-16 bg-muted-foreground/20 rounded" />
                                </div>
                                <div className="h-8 w-24 bg-muted-foreground/20 rounded-full" />
                            </div>
                            <div className="flex gap-2">
                                <div className="w-16 h-16 bg-muted-foreground/20 rounded-lg" />
                                <div className="w-16 h-16 bg-muted-foreground/20 rounded-lg" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="p-6 m-0 border-b border-x border-order-border rounded-b-xl">
                <div className="h-5 w-32 bg-muted-foreground/20 rounded" />
            </div>
        </>
    );
}

/**
 * Error state for order list.
 */
function OrderListError(): ReactElement {
    const { t } = useTranslation('account');
    return (
        <Card className="border-order-border">
            <CardContent className="p-12 text-center space-y-4">
                <Typography variant="p" className="text-muted-foreground">
                    {t('orders.errorDescription')}
                </Typography>
            </CardContent>
        </Card>
    );
}

/**
 * Order list page – renders at /account/orders.
 * Order details at /account/orders/:orderNo.
 */
export default function OrderListPage(): ReactElement {
    const { t } = useTranslation('account');
    const navigate = useNavigate();
    const loaderData = useLoaderData<OrderListLoaderData>();

    const handleViewDetails = (orderNo: string) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- navigate() result intentionally not awaited
        navigate(`/account/orders/${orderNo}`);
    };

    return (
        <div className="space-y-5">
            <OrderListHeader title={t('navigation.orderHistory')} subtitle={t('orders.subtitle')} />
            <Suspense fallback={<OrderListSkeleton />}>
                <Await resolve={loaderData.ordersPromise} errorElement={<OrderListError />}>
                    {(result) => (
                        <OrderListBody
                            orders={result.orders}
                            total={result.total}
                            offset={result.offset}
                            limit={result.limit}
                            onViewDetails={handleViewDetails}
                        />
                    )}
                </Await>
            </Suspense>
        </div>
    );
}
