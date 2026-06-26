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
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { resourceRoutes } from '@/route-paths';
import { getActionPath } from './shared';

/**
 * Mutations that change none of the data the PDP loader reads. The PDP loader is expensive — it `await`s
 * `fetchProductById` (availability, prices, promotions, variations) and the reviews summary, then fans out to
 * category, Page Designer, BNPL, reviews list, returns/warranty, FAQ, and estimated-delivery fetches. React Router
 * re-runs the whole loader after *every* action submission by default, so a single add-to-cart on the PDP re-issues
 * that entire fan-out for data the cart never touched. Skipping it for these submissions removes the waste.
 *
 * Every entry is proven on two axes: (1) the action's result touches no field the loader reads — it changes neither
 * the product (price/availability/promotions), the reviews, nor the category; and (2) it is submitted via a
 * non-navigating `useFetcher().submit()` and returns data (not a `redirect`), so the loader would otherwise
 * revalidate for nothing. Cart/wishlist state reaches the client without this loader anyway — the basket via the
 * `__sfdc_basket` cookie + `BasketProvider`, the wishlist via the client-side `WishlistProvider` store
 * (`wishlistInitialState` on the loader is only an SSR seed).
 *
 * This is a denylist, NOT an allowlist: the safe default is to revalidate. A forgotten entry only wastes a fan-out,
 * whereas a wrongly-skipped entry would leave the PDP showing stale product data. The mutations that DO feed this
 * loader are deliberately kept OFF the list so they still revalidate: `addReview` (changes the reviews the loader
 * reads), `setSelectedStore` / `cartPickupStoreUpdate` (change the selected store, which drives product availability
 * and inventory), `setSiteContext` (currency → prices), and `updateShopperContext` (a cross-cutting input to SCAPI
 * pricing/promotions).
 */
const PRODUCT_IRRELEVANT_MUTATIONS: readonly string[] = [
    // Cart & wishlist — state propagates via cookie/provider, never the PDP loader.
    resourceRoutes.cartItemAdd,
    resourceRoutes.cartItemRemove,
    resourceRoutes.cartItemUpdate,
    resourceRoutes.cartBundleAdd,
    resourceRoutes.cartBundleUpdate,
    resourceRoutes.cartSetAdd,
    resourceRoutes.bonusProductAdd,
    resourceRoutes.promoCodeAdd,
    resourceRoutes.promoCodeRemove,
    resourceRoutes.wishlistAdd,
    resourceRoutes.wishlistRemove,
    // Account & preferences — SCAPI-only mutations that touch nothing the PDP reads.
    resourceRoutes.updateMarketingConsent,
    resourceRoutes.paymentMethodAdd,
    resourceRoutes.paymentMethodRemove,
    resourceRoutes.paymentMethodSetDefault,
    resourceRoutes.customerPreferencesUpdate,
    // Pre-auth flows — SLAS calls that issue no session and change no product data.
    resourceRoutes.requestPasswordReset,
    resourceRoutes.otpRequest,
    resourceRoutes.otpVerify,
];

/**
 * `shouldRevalidate` policy for the PDP route. It gates two axes:
 *
 * - **Action axis** — suppresses the loader re-run for mutations proven not to affect any field it reads
 *   ({@link PRODUCT_IRRELEVANT_MUTATIONS}). Everything else (notably `addReview`, store changes, and the currency
 *   switch) falls through and revalidates, because the loader does read that data.
 * - **Navigation axis** — keeps the original behavior: revalidate on a different product (`pathname`) or a different
 *   variant (`pid`), but skip client-only search-param changes (color/size) the loader doesn't consume, so the page
 *   doesn't flash a skeleton when swapping swatches. An explicit `useRevalidator().revalidate()` (which arrives with
 *   `defaultShouldRevalidate` true and no `formMethod`) still forces a re-run.
 */
export function shouldRevalidate({
    currentUrl,
    nextUrl,
    formMethod,
    formAction,
    defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
    // Action axis: skip the expensive loader re-run for a denylisted mutation.
    if (formMethod && formMethod !== 'GET') {
        const actionPath = getActionPath(formAction, currentUrl.origin);
        if (actionPath && PRODUCT_IRRELEVANT_MUTATIONS.includes(actionPath)) {
            return false;
        }
    }

    // Navigation axis: revalidate for a different product or variant.
    if (currentUrl.pathname !== nextUrl.pathname) {
        return true;
    }
    if (currentUrl.searchParams.get('pid') !== nextUrl.searchParams.get('pid')) {
        return true;
    }

    // An explicit revalidate() call (e.g. a store change) arrives here with defaultShouldRevalidate true — honor it.
    if (defaultShouldRevalidate) {
        return true;
    }

    // Client-only param change (color/size) the loader doesn't read — skip to avoid a skeleton flash.
    return false;
}
