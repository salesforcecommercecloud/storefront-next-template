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
import { Await, type LoaderFunctionArgs, type ShouldRevalidateFunctionArgs } from 'react-router';
import { type ShopperCustomers, type ShopperProducts, ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { getAuth } from '@/middlewares/auth.server';
import { fetchProductsForWishlist, getWishlist } from '@/lib/api/wishlist.server';
import { WishlistPageContent, WishlistSkeleton } from '@/components/wishlist/wishlist-page';
import { SeoMeta } from '@/components/seo-meta';
import { getLogger } from '@/lib/logger.server';
import { useTranslation } from 'react-i18next';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];
type Product = ShopperProducts.schemas['Product'];

/**
 * Server-side loader to fetch the customer's wishlist items and product details.
 * Product details are returned as a Promise for streaming — the Suspense boundary
 * in the component shows a skeleton until they resolve.
 */
export async function loader({ context }: LoaderFunctionArgs): Promise<{
    wishlist: CustomerProductList | null;
    items: CustomerProductListItem[];
    productsByProductId: Promise<Record<string, Product>>;
}> {
    const logger = getLogger(context);
    logger.debug('Wishlist: loader starting');

    const session = getAuth(context);

    const isRegistered =
        session.userType === 'registered' &&
        session.customerId &&
        session.accessToken &&
        session.accessTokenExpiry &&
        session.accessTokenExpiry > Date.now();

    if (!isRegistered || !session.customerId) {
        logger.warn('Wishlist: user not registered, returning empty wishlist');
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }

    try {
        const customerId = session.customerId;
        const { wishlist, items, id: listId } = await getWishlist(context, customerId);

        if (!wishlist || !listId) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        return {
            wishlist,
            items,
            // Fetch ALL items' product details — no initial-batch limit since pagination
            // is not yet implemented on the list view. Returned as a Promise so the
            // server can stream the response and the Suspense boundary renders a
            // skeleton while products load.
            productsByProductId: fetchProductsForWishlist(context, items),
        };
    } catch (error) {
        logger.error('Wishlist: failed to load wishlist', { error });

        let status_code: string | undefined;

        if (error instanceof ApiError) {
            status_code = String(error.status);
        }

        if (status_code === '401' || status_code === '403') {
            logger.warn('Wishlist: auth error, returning empty wishlist', { status_code });
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }
}

/**
 * Prevent automatic revalidation after wishlist remove actions.
 * Disabled-item state is managed client-side to avoid unnecessary refetches.
 */
export function shouldRevalidate({ formAction, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
    if (formAction === '/action/wishlist-remove') {
        return false;
    }
    return defaultShouldRevalidate;
}

export default function AccountWishlist({
    loaderData,
}: {
    loaderData: Awaited<ReturnType<typeof loader>>;
}): ReactElement {
    const { t } = useTranslation('account');
    return (
        <>
            <SeoMeta title={t('meta.wishlistTitle', { defaultValue: 'Wishlist' })} noIndex />
            <Suspense fallback={<WishlistSkeleton />}>
                <Await resolve={loaderData.productsByProductId}>
                    {(productsByProductId) => (
                        <WishlistPageContent items={loaderData.items} productsByProductId={productsByProductId} />
                    )}
                </Await>
            </Suspense>
        </>
    );
}
