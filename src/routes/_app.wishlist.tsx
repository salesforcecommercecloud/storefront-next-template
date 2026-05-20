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
import { Await, redirect, type ShouldRevalidateFunctionArgs } from 'react-router';
import type { Route } from './+types/_app.wishlist';
import { loadWishlistPageData, type WishlistPageData } from '@/lib/api/wishlist.server';
import { WishlistPageContent, WishlistSkeleton } from '@/components/wishlist/wishlist-page';
import { WishlistLoadError } from '@/components/wishlist/wishlist-load-error';
import { SeoMeta } from '@/components/seo-meta';
import { getLogger } from '@/lib/logger.server';
import { getAuth } from '@/middlewares/auth.server';
import { hasUsableShopperSession } from '@/middlewares/auth.utils';
import { buildUrlFromContext } from '@/lib/url.server';
import { useTranslation } from 'react-i18next';
import { WishlistPageAnalytics } from '@/analytics/wishlist-page-analytics';

/**
 * Public guest wishlist route. Registered shoppers with a usable session are
 * redirected to `/account/wishlist` so their layout (with the account sidebar)
 * stays consistent. Guests, plus registered shoppers whose session has expired,
 * see the wishlist content rendered inside the regular storefront chrome —
 * `loadWishlistPageData` returns an empty payload for the latter case, which
 * is preferable to bouncing between this route and the account layout's own
 * re-auth redirect.
 *
 * Delegates to `loadWishlistPageData` (shared with `/account/wishlist`) for
 * the actual data fetch.
 */
export async function loader({ context }: Route.LoaderArgs): Promise<WishlistPageData> {
    const logger = getLogger(context);
    logger.debug('Wishlist (guest): loader starting');

    const session = getAuth(context);
    if (session.userType === 'registered' && hasUsableShopperSession(session)) {
        throw redirect(buildUrlFromContext('/account/wishlist', context));
    }

    return loadWishlistPageData(context);
}

/**
 * Prevent automatic revalidation after wishlist remove actions.
 * Mirrors the registered route — disabled-item state is managed client-side
 * to avoid unnecessary refetches.
 */
export function shouldRevalidate({ formAction, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
    if (formAction === '/action/wishlist-remove') {
        return false;
    }
    return defaultShouldRevalidate;
}

/**
 * Route-level error boundary for non-auth loader failures (5xx, network).
 * Keeps the wishlist failure scoped to this page instead of escalating to the
 * root error page. Auth errors (401/403) still degrade silently to an empty
 * wishlist via `loadWishlistPageData`. Mirrors the registered `/account/wishlist`
 * route's boundary; `retryHref` points back to this guest entry point.
 */
export function ErrorBoundary(): ReactElement {
    return <WishlistLoadError retryHref="/wishlist" />;
}

export default function GuestWishlist({
    loaderData,
}: {
    loaderData: Awaited<ReturnType<typeof loader>>;
}): ReactElement {
    const { t } = useTranslation('account');
    return (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <WishlistPageAnalytics />
            <SeoMeta title={t('meta.wishlistTitle', { defaultValue: 'Wishlist' })} />
            <Suspense fallback={<WishlistSkeleton />}>
                <Await resolve={loaderData.productsByProductId}>
                    {(productsByProductId) => (
                        <WishlistPageContent items={loaderData.items} productsByProductId={productsByProductId} />
                    )}
                </Await>
            </Suspense>
        </div>
    );
}
