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

import { describe, it, expect } from 'vitest';
import { buildRegisteredSessionCookieOps } from './api-login-utils';
import type { RegisteredTokens } from './scapi-helper';

const tokens: RegisteredTokens = {
    accessToken: 'AT-test-access',
    refreshToken: 'RT-test-refresh',
    usid: 'USID-test',
    customerId: 'CID-test',
    expiresIn: 3600,
};

describe('buildRegisteredSessionCookieOps', () => {
    it('adds four cookies named for the storefront auth scheme', () => {
        const ops = buildRegisteredSessionCookieOps('RefArchGlobal', tokens, 'https://example.com');
        expect(ops.add.map((c) => c.name)).toEqual([
            'cc-at_RefArchGlobal',
            'cc-nx_RefArchGlobal',
            'usid_RefArchGlobal',
            'customer_id_RefArchGlobal',
        ]);
    });

    it('uses the registered refresh token name (cc-nx_), not the guest variant (cc-nx-g_)', () => {
        // Regression guard: api-cart-setup.flow.ts uses cc-nx-g_ for guest sessions.
        // Confusing the two would silently log the user out / mark them guest.
        const ops = buildRegisteredSessionCookieOps('SiteA', tokens, 'https://example.com');
        const names = ops.add.map((c) => c.name);
        expect(names).toContain('cc-nx_SiteA');
        expect(names).not.toContain('cc-nx-g_SiteA');
    });

    it('clears the guest refresh token cookie to mirror the auth-middleware contract', () => {
        // Regression guard: the storefront's auth middleware deletes cc-nx-g_ on a real
        // UI login (see template-retail-rsc-app/src/middlewares/auth.server.ts ~line 958).
        // login.spec.ts asserts the guest cookie is absent post-login, so API login must
        // mirror that behavior or the spec breaks when migrated to dispatch through here.
        const ops = buildRegisteredSessionCookieOps('SiteA', tokens, 'https://example.com');
        expect(ops.clear).toContain('cc-nx-g_SiteA');
    });

    it('maps token fields to the correct cookie values', () => {
        const ops = buildRegisteredSessionCookieOps('Site', tokens, 'https://example.com');
        const byName = Object.fromEntries(ops.add.map((c) => [c.name, c.value]));
        expect(byName['cc-at_Site']).toBe('AT-test-access');
        expect(byName['cc-nx_Site']).toBe('RT-test-refresh');
        expect(byName.usid_Site).toBe('USID-test');
        expect(byName.customer_id_Site).toBe('CID-test');
    });

    it('marks all added cookies httpOnly', () => {
        const ops = buildRegisteredSessionCookieOps('Site', tokens, 'https://example.com');
        for (const cookie of ops.add) {
            expect(cookie.httpOnly).toBe(true);
        }
    });

    it('uses the host from the origin for the cookie domain', () => {
        const ops = buildRegisteredSessionCookieOps('Site', tokens, 'https://shop.example.com:8443/some/path');
        for (const cookie of ops.add) {
            expect(cookie.domain).toBe('shop.example.com');
            expect(cookie.path).toBe('/');
        }
    });

    it('sets secure: true for https origins', () => {
        const ops = buildRegisteredSessionCookieOps('Site', tokens, 'https://example.com');
        for (const cookie of ops.add) {
            expect(cookie.secure).toBe(true);
        }
    });

    it('sets secure: false for http origins (so localhost dev works)', () => {
        const ops = buildRegisteredSessionCookieOps('Site', tokens, 'http://localhost:5173');
        for (const cookie of ops.add) {
            expect(cookie.secure).toBe(false);
            expect(cookie.domain).toBe('localhost');
        }
    });

    it('uses sameSite: Lax (matches the cookies the storefront sets in production)', () => {
        const ops = buildRegisteredSessionCookieOps('Site', tokens, 'https://example.com');
        for (const cookie of ops.add) {
            expect(cookie.sameSite).toBe('Lax');
        }
    });
});
