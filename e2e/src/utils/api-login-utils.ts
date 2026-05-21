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

import type { RegisteredTokens } from './scapi-helper';

// TODO: cookie names (cc-at_, cc-nx_, cc-nx-g_, usid_, customerId_) are scattered across
// api-login-utils.ts, api-cart-setup.flow.ts, login.flow.ts (logout), and cookie-utils.ts.
// Extract to a single source of truth in scapi-helper.ts (they're SCAPI/SLAS protocol names)
// or cookie-utils.ts. Bundle with the loginFlow migration / api-cart-setup dedup TODOs.

/**
 * Cookie shape compatible with Playwright's `addCookies()`. Re-declared here so
 * the pure helper can be unit-tested without pulling in Playwright types.
 */
export interface PlaywrightCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
    httpOnly: boolean;
}

/**
 * Cookie operations needed to transition the Playwright browser context into a
 * registered-shopper session: which cookie names to clear first, and which
 * cookies to add. Callers should apply `clear` then `add`.
 */
export interface RegisteredSessionCookieOps {
    /** Cookie names to clear before adding the new session cookies. */
    clear: string[];
    /** Cookies to add for the registered session. */
    add: PlaywrightCookie[];
}

/**
 * Build the cookie operations that transition the browser to a registered-shopper
 * session.
 *
 * Mirrors the storefront's auth middleware on a real UI login (see
 * `template-retail-rsc-app/src/middlewares/auth.server.ts`):
 *
 * - **Adds** `cc-at_` (access token), `cc-nx_` (registered refresh token, no `-g`
 *   suffix — the `-g` variant is for guest sessions), `usid_` (user session ID),
 *   and `customerId_`.
 * - **Clears** `cc-nx-g_` (guest refresh token). The middleware deletes it on
 *   login to enforce its "exactly one refresh token cookie exists" invariant.
 *   The middleware uses cookie-presence to derive user type, so leaving both
 *   cookies present after API login would diverge from the real-login state and
 *   break tests that assert on the absence of the guest cookie post-login (see
 *   `login.spec.ts` "Guest shopper login transitions cookies" scenario).
 *
 * Domain comes from the BASE_URL origin so cookies are scoped correctly under
 * both `http://localhost` and `https://*.mobify-storefront.com`.
 *
 * **Cookie expiry is intentionally omitted (session cookies).** In production
 * the auth middleware sets `expires` on each cookie (~30 min for access token,
 * the JWT-claim duration for refresh token). Tests scope every login to the
 * Playwright browser context's lifetime, which is much shorter than the
 * production expiries — so for setup-style tests the difference is invisible.
 * It is **not** invisible for tests that assert on cookie expiry behavior
 * (token rotation, "session expires after N minutes", etc.). Those tests
 * should use `loginFlow.execute()` (real UI login) so they exercise the
 * production cookie attributes, not this helper.
 *
 * Pure function — no Playwright/CodeceptJS dependency — so it can be unit-tested
 * directly.
 */
export function buildRegisteredSessionCookieOps(
    siteId: string,
    tokens: RegisteredTokens,
    origin: string
): RegisteredSessionCookieOps {
    const url = new URL(origin);
    const cookieDefaults = {
        domain: url.hostname,
        path: '/',
        secure: url.protocol === 'https:',
        sameSite: 'Lax' as const,
    };

    return {
        clear: [`cc-nx-g_${siteId}`],
        add: [
            { ...cookieDefaults, name: `cc-at_${siteId}`, value: tokens.accessToken, httpOnly: true },
            { ...cookieDefaults, name: `cc-nx_${siteId}`, value: tokens.refreshToken, httpOnly: true },
            { ...cookieDefaults, name: `usid_${siteId}`, value: tokens.usid, httpOnly: true },
            { ...cookieDefaults, name: `customer_id_${siteId}`, value: tokens.customerId, httpOnly: true },
        ],
    };
}
