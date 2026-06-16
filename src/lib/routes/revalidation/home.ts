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
import { resourceRoutes, routes } from '@/route-paths';

/**
 * Non-navigating mutations after which the home loader MUST re-run.
 *
 * - `set-site-context` (with `type: 'currency'`) submits via a fetcher and returns data rather than redirecting, so
 *   only loader revalidation refreshes the page. The featured-products carousel renders price *values* from the
 *   loader's SCAPI response (`fetchCarouselProducts(..., { currency })`); the client-side currency context only swaps
 *   the formatting symbol, so without re-running the loader the carousel would show old-currency amounts under the new
 *   symbol. Site and locale switches use the same action but trigger a full `window.location` reload, so they bypass
 *   `shouldRevalidate` entirely and need no entry here.
 * - `update-shopper-context` is a cross-cutting input to every SCAPI response (promotions, pricing, A/B segments), so
 *   it changes the carousel's output. The `useShopperContext` hook submits it as a non-navigating PUT fetcher that
 *   returns data (no redirect).
 *
 * These are matched against the action's full path (after stripping any query string). They are resource routes under
 * `/action/*`, which `url.excludeRoutes` keeps unprefixed, so an exact-path compare is correct. The logout case below
 * is matched separately because its path IS site/locale-prefixed.
 */
const HOME_RELEVANT_MUTATIONS: readonly string[] = [resourceRoutes.setSiteContext, resourceRoutes.updateShopperContext];

/**
 * `shouldRevalidate` policy for the home page. The loader fetches only catalog and content data, so it opts out of
 * the post-action revalidation React Router runs by default — every non-navigating mutation submitted while the home
 * page is active (notably add-to-cart from the quick view modal) would otherwise re-issue its four fetches for no
 * observable change. The basket badge stays current on its own: the cart action returns the updated basket and sets
 * the `__sfdc_basket` cookie the basket provider reads client-side.
 *
 * The exceptions are {@link HOME_RELEVANT_MUTATIONS}: a currency switch genuinely changes the loader's output
 * (per-currency SCAPI prices) and shopper-context updates change every SCAPI response, so they must be allowed
 * through. Navigations and explicit `useRevalidator().revalidate()` calls carry no `formMethod` and are suppressed
 * too — a fresh navigation to the route is a new match that runs the loader regardless of this gate, and the basket
 * badge stays current via its provider rather than this loader.
 *
 * Auth note: the loader's `fetchWishlistInitialState` is auth-dependent (a registered session seeds the
 * `WishlistProvider` with the shopper's saved items; a guest session seeds it empty). Login and logout from any
 * other page redirect to `/`, which re-matches the home route fresh and re-runs the loader. The one path that would
 * otherwise slip through is a logout submitted while already on `/`: the header posts to `/logout` and redirects back
 * to `/`, so the home route stays matched and React Router consults this gate. We return `true` for it so the loader
 * re-runs and re-seeds the wishlist for the now-guest session. Unlike the `/action/*` routes, the logout form action
 * is site/locale-prefixed (`buildUrl` prefixes it; `/logout` is not in `url.excludeRoutes`), so it is matched on its
 * path segment rather than by exact string.
 * @see https://reactrouter.com/start/framework/route-module#shouldrevalidate
 */
export function shouldRevalidate({ currentUrl, formMethod, formAction }: ShouldRevalidateFunctionArgs): boolean {
    if (formMethod && formMethod !== 'GET' && formAction) {
        // React Router builds formAction as a path; parse it to drop any trailing query string (e.g. an index-route
        // `?index`) so it doesn't defeat the path comparison.
        const actionPath = new URL(formAction, currentUrl.origin).pathname;
        if (HOME_RELEVANT_MUTATIONS.includes(actionPath)) {
            return true;
        }
        // Logout is site/locale-prefixed, so compare the trailing path segment. Anchored on a leading slash so a
        // route like `/account/auto-logout` cannot match the bare `logout` substring.
        if (actionPath === routes.logout || actionPath.endsWith(routes.logout)) {
            return true;
        }
    }

    return false;
}
