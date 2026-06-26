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
import { describe, expect, test } from 'vitest';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { shouldRevalidate as productShouldRevalidate } from './product';
import { resourceRoutes, routes } from '@/route-paths';

/** Builds a full ShouldRevalidateFunctionArgs with sensible defaults, overridable per test. */
function buildArgs(overrides: Partial<ShouldRevalidateFunctionArgs>): ShouldRevalidateFunctionArgs {
    return {
        currentUrl: new URL('http://localhost/product/product-1'),
        nextUrl: new URL('http://localhost/product/product-1'),
        currentParams: {},
        nextParams: {},
        defaultShouldRevalidate: true,
        formMethod: undefined,
        formAction: undefined,
        formEncType: undefined,
        formData: undefined,
        json: undefined,
        text: undefined,
        actionStatus: undefined,
        actionResult: undefined,
        ...overrides,
    } as ShouldRevalidateFunctionArgs;
}

describe('shouldRevalidate', () => {
    describe('action axis — product-irrelevant mutations skip the loader re-run', () => {
        // Walk the full denylist: a forgotten entry only wastes a fan-out, but a wrongly-skipped entry
        // would leave the PDP showing stale product data, so denylist accuracy is load-bearing. Removing
        // any entry from PRODUCT_IRRELEVANT_MUTATIONS must fail a test here.
        test.each([
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
            resourceRoutes.updateMarketingConsent,
            resourceRoutes.paymentMethodAdd,
            resourceRoutes.paymentMethodRemove,
            resourceRoutes.paymentMethodSetDefault,
            resourceRoutes.customerPreferencesUpdate,
            resourceRoutes.requestPasswordReset,
            resourceRoutes.otpRequest,
            resourceRoutes.otpVerify,
        ])('skips revalidation after %s', (formAction) => {
            expect(productShouldRevalidate(buildArgs({ formMethod: 'POST', formAction }))).toBe(false);
        });

        test('matches a denylisted action even when formAction is absolute with a query string', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({
                        formMethod: 'POST',
                        formAction: `http://localhost${resourceRoutes.cartItemAdd}?foo=bar`,
                    })
                )
            ).toBe(false);
        });

        test('matches a denylisted action when the bare path carries an ?index suffix', () => {
            // Index-route submissions arrive as `<path>?index`; the query must be stripped before comparing.
            expect(
                productShouldRevalidate(
                    buildArgs({ formMethod: 'POST', formAction: `${resourceRoutes.cartItemAdd}?index` })
                )
            ).toBe(false);
        });

        test.each(['DELETE', 'PATCH', 'PUT'] as const)(
            'skips revalidation for a denylisted action submitted via %s (the gate is not POST-specific)',
            (formMethod) => {
                expect(
                    productShouldRevalidate(buildArgs({ formMethod, formAction: resourceRoutes.cartItemRemove }))
                ).toBe(false);
            }
        );

        test('action-axis skip short-circuits ahead of the navigation axis', () => {
            // A denylisted submission returns false before the pathname check runs. In practice these are
            // non-navigating useFetcher() submits, so currentUrl/nextUrl match; this locks in the ordering
            // guarantee that the cheap skip wins even if a path change were somehow present.
            expect(
                productShouldRevalidate(
                    buildArgs({
                        formMethod: 'POST',
                        formAction: resourceRoutes.cartItemAdd,
                        currentUrl: new URL('http://localhost/product/product-1'),
                        nextUrl: new URL('http://localhost/product/product-2'),
                    })
                )
            ).toBe(false);
        });
    });

    describe('action axis — mutations that DO feed the loader still revalidate', () => {
        test('revalidates after add-review (changes the reviews the loader reads)', () => {
            expect(
                productShouldRevalidate(buildArgs({ formMethod: 'POST', formAction: resourceRoutes.addReview }))
            ).toBe(true);
        });

        test('revalidates after a store change (drives availability/inventory)', () => {
            expect(
                productShouldRevalidate(buildArgs({ formMethod: 'POST', formAction: resourceRoutes.setSelectedStore }))
            ).toBe(true);
        });

        test('revalidates after a pickup-store update (drives availability)', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({ formMethod: 'POST', formAction: resourceRoutes.cartPickupStoreUpdate })
                )
            ).toBe(true);
        });

        test('revalidates after a currency (set-site-context) submission (prices change)', () => {
            expect(
                productShouldRevalidate(buildArgs({ formMethod: 'POST', formAction: resourceRoutes.setSiteContext }))
            ).toBe(true);
        });

        test('revalidates after a shopper-context update (cross-cutting pricing/promotions input)', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({ formMethod: 'POST', formAction: resourceRoutes.updateShopperContext })
                )
            ).toBe(true);
        });

        // Auth is a cross-cutting pricing/promotions dimension: a logged-in shopper can see member prices and
        // personalized promotions, so the PDP loader must re-run when auth state flips. These page-route actions are
        // deliberately kept OFF the denylist — pinning them here so a future edit can't silently skip them and stale
        // member pricing. The default defaultShouldRevalidate:true models the post-redirect full revalidation auth
        // triggers; if any were added to PRODUCT_IRRELEVANT_MUTATIONS the action axis would short-circuit to false.
        test.each([routes.login, routes.signup, routes.logout])(
            'revalidates after %s (auth changes pricing)',
            (formAction) => {
                expect(productShouldRevalidate(buildArgs({ formMethod: 'POST', formAction }))).toBe(true);
            }
        );

        test('revalidates a mutation with no formAction (cannot confirm it is safe to skip)', () => {
            expect(productShouldRevalidate(buildArgs({ formMethod: 'POST', formAction: undefined }))).toBe(true);
        });

        test('does not skip a GET that happens to target a denylisted path', () => {
            // Only non-GET submissions are candidates for skipping; a GET must defer to the navigation axis.
            // Pair the denylisted path with a pathname change so the navigation axis would return true: if the
            // GET were wrongly treated as a skip-candidate, this would flip to false.
            expect(
                productShouldRevalidate(
                    buildArgs({
                        formMethod: 'GET',
                        formAction: resourceRoutes.cartItemAdd,
                        currentUrl: new URL('http://localhost/product/product-1'),
                        nextUrl: new URL('http://localhost/product/product-2'),
                        defaultShouldRevalidate: false,
                    })
                )
            ).toBe(true);
        });
    });

    describe('navigation axis — original product/variant behavior is preserved', () => {
        test('revalidates when the pathname changes (different product)', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({
                        currentUrl: new URL('http://localhost/product/product-1'),
                        nextUrl: new URL('http://localhost/product/product-2'),
                        defaultShouldRevalidate: false,
                    })
                )
            ).toBe(true);
        });

        test('revalidates when the pid (variant) changes', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({
                        currentUrl: new URL('http://localhost/product/product-1?pid=variant-1'),
                        nextUrl: new URL('http://localhost/product/product-1?pid=variant-2'),
                        defaultShouldRevalidate: false,
                    })
                )
            ).toBe(true);
        });

        test('revalidates when a pid appears (base product → selected variant)', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({
                        currentUrl: new URL('http://localhost/product/product-1'),
                        nextUrl: new URL('http://localhost/product/product-1?pid=variant-1'),
                        defaultShouldRevalidate: false,
                    })
                )
            ).toBe(true);
        });

        test('revalidates when a pid is cleared (selected variant → base product)', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({
                        currentUrl: new URL('http://localhost/product/product-1?pid=variant-1'),
                        nextUrl: new URL('http://localhost/product/product-1'),
                        defaultShouldRevalidate: false,
                    })
                )
            ).toBe(true);
        });

        test('does NOT revalidate when the pid is unchanged but client-only params differ', () => {
            // Same variant, only color/size moved — the loader doesn't read those, so no re-run.
            expect(
                productShouldRevalidate(
                    buildArgs({
                        currentUrl: new URL('http://localhost/product/product-1?pid=variant-1&color=red'),
                        nextUrl: new URL('http://localhost/product/product-1?pid=variant-1&color=blue'),
                        defaultShouldRevalidate: false,
                    })
                )
            ).toBe(false);
        });

        test('does NOT revalidate for client-only param changes (color/size)', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({
                        currentUrl: new URL('http://localhost/product/product-1?color=red&size=large'),
                        nextUrl: new URL('http://localhost/product/product-1?color=blue&size=medium'),
                        defaultShouldRevalidate: false,
                    })
                )
            ).toBe(false);
        });

        test('honors an explicit revalidate() (defaultShouldRevalidate true, e.g. a store change)', () => {
            expect(
                productShouldRevalidate(
                    buildArgs({
                        currentUrl: new URL('http://localhost/product/product-1?color=red'),
                        nextUrl: new URL('http://localhost/product/product-1?color=red'),
                        defaultShouldRevalidate: true,
                    })
                )
            ).toBe(true);
        });
    });
});
