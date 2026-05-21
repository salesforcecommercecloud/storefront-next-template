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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MiddlewareFunction, RouterContextProvider } from 'react-router';
import { DataStore } from '@salesforce/mrt-utilities/middleware';
import {
    createDataStoreContext,
    createDataStoreMiddleware,
    createLazyDataStoreMiddleware,
    prefixWithSiteId,
    readLazyDataStoreEntry,
} from './utils';
import { getSitePreferences, sitePreferencesContext } from './middleware/custom-site-preferences';
import { siteContext } from '../site-context';

type MiddlewareNext = Parameters<MiddlewareFunction<Response>>[1];

describe('createDataStoreMiddleware', () => {
    let context: RouterContextProvider;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.MOBIFY_PROPERTY_ID = 'prop-1';
        process.env.DEPLOY_TARGET = 'production';

        const store = new Map<unknown, unknown>();
        context = {
            set: (ctx: unknown, value: unknown) => store.set(ctx, value),
            get: (ctx: unknown) => store.get(ctx),
        } as unknown as RouterContextProvider;

        next = vi.fn().mockResolvedValue(new Response('ok'));
    });

    afterEach(() => {
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        DataStore._testDocumentClient = null;
        DataStore._testLogMRTError = null;
    });

    it('fetches site preferences and stores them in context', async () => {
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({
                Item: { value: { enabled: true, title: 'Site Prefs' } },
            }),
        } as unknown as typeof DataStore._testDocumentClient;

        const middleware = createDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: sitePreferencesContext,
        });
        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        const contextValue = context.get(sitePreferencesContext) as Record<string, unknown>;
        expect(contextValue).toEqual({ enabled: true, title: 'Site Prefs' });
        expect(getSitePreferences(context)).toEqual({ enabled: true, title: 'Site Prefs' });
        expect(next).toHaveBeenCalledOnce();
    });

    it('stores entry values in a custom context', async () => {
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({
                Item: { value: { allowed: ['USD', 'CAD'] } },
            }),
        } as unknown as typeof DataStore._testDocumentClient;

        const allowedCurrenciesContext = createDataStoreContext<{ allowed: string[] }>();
        const middleware = createDataStoreMiddleware({
            entryKey: 'allowed-currencies',
            context: allowedCurrenciesContext,
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        expect(context.get(allowedCurrenciesContext)).toEqual({ allowed: ['USD', 'CAD'] });
        expect(next).toHaveBeenCalledOnce();
    });

    it('resolves entry keys from context', async () => {
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({
                Item: { value: { enabled: true } },
            }),
        } as unknown as typeof DataStore._testDocumentClient;

        const siteIdContext = createDataStoreContext<string>();
        context.set(siteIdContext, 'site-1');

        let resolvedSiteId: string | null = null;
        const middleware = createDataStoreMiddleware({
            entryKey: (ctx) => {
                resolvedSiteId = ctx.get(siteIdContext) ?? null;
                return 'site-preferences';
            },
            context: sitePreferencesContext,
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        expect(resolvedSiteId).toBe('site-1');
        expect(context.get(sitePreferencesContext)).toEqual({ enabled: true });
        expect(next).toHaveBeenCalledOnce();
    });

    it('throws when data store is unavailable', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        const originalCi = process.env.CI;
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        process.env.NODE_ENV = 'production';
        process.env.CI = 'false';

        const middleware = createDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: sitePreferencesContext,
        });

        await expect(
            middleware(
                { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
                next as MiddlewareNext
            )
        ).rejects.toThrow(
            'Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.'
        );
        expect(next).not.toHaveBeenCalled();
        process.env.NODE_ENV = originalNodeEnv;
        if (typeof originalCi === 'undefined') {
            delete process.env.CI;
        } else {
            process.env.CI = originalCi;
        }
    });

    it('uses fallback value when data store is unavailable and fallback mode is configured', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        const originalCi = process.env.CI;
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        process.env.NODE_ENV = 'production';
        process.env.CI = 'false';

        const middleware = createDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: sitePreferencesContext,
            onUnavailable: 'fallback',
            fallbackValue: { enabled: false },
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        expect(context.get(sitePreferencesContext)).toEqual({ enabled: false });
        expect(next).toHaveBeenCalledOnce();

        process.env.NODE_ENV = originalNodeEnv;
        if (typeof originalCi === 'undefined') {
            delete process.env.CI;
        } else {
            process.env.CI = originalCi;
        }
    });

    it('resolves fallback value from callback with access to context', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        const originalCi = process.env.CI;
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        process.env.NODE_ENV = 'production';
        process.env.CI = 'false';

        const siteIdContext = createDataStoreContext<string>();
        context.set(siteIdContext, 'site-1');
        const customContext = createDataStoreContext<{ siteId: string }>();

        const middleware = createDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: customContext,
            onUnavailable: 'fallback',
            fallbackValue: (ctx) => ({ siteId: ctx.get(siteIdContext) ?? 'unknown' }),
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        expect(context.get(customContext)).toEqual({ siteId: 'site-1' });
        expect(next).toHaveBeenCalledOnce();

        process.env.NODE_ENV = originalNodeEnv;
        if (typeof originalCi === 'undefined') {
            delete process.env.CI;
        } else {
            process.env.CI = originalCi;
        }
    });
});

describe('createLazyDataStoreMiddleware', () => {
    let context: RouterContextProvider;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.MOBIFY_PROPERTY_ID = 'prop-1';
        process.env.DEPLOY_TARGET = 'production';

        const store = new Map<unknown, unknown>();
        context = {
            set: (ctx: unknown, value: unknown) => store.set(ctx, value),
            get: (ctx: unknown) => store.get(ctx),
        } as unknown as RouterContextProvider;

        next = vi.fn().mockResolvedValue(new Response('ok'));
    });

    afterEach(() => {
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        DataStore._testDocumentClient = null;
        DataStore._testLogMRTError = null;
    });

    it('does not fetch the entry until a consumer reads it', async () => {
        const sendMock = vi.fn().mockResolvedValue({ Item: { value: { enabled: true } } });
        DataStore._testDocumentClient = {
            send: sendMock,
        } as unknown as typeof DataStore._testDocumentClient;

        const middleware = createLazyDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: sitePreferencesContext,
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        expect(sendMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledOnce();

        const value = await readLazyDataStoreEntry(context, sitePreferencesContext);
        expect(value).toEqual({ enabled: true });
        expect(sendMock).toHaveBeenCalledOnce();
    });

    it('reuses the cached promise across multiple reads in the same request', async () => {
        const sendMock = vi.fn().mockResolvedValue({ Item: { value: { enabled: true } } });
        DataStore._testDocumentClient = {
            send: sendMock,
        } as unknown as typeof DataStore._testDocumentClient;

        const middleware = createLazyDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: sitePreferencesContext,
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        await Promise.all([
            readLazyDataStoreEntry(context, sitePreferencesContext),
            readLazyDataStoreEntry(context, sitePreferencesContext),
            readLazyDataStoreEntry(context, sitePreferencesContext),
        ]);

        expect(sendMock).toHaveBeenCalledOnce();
    });

    it('returns null on read when the entry is missing', async () => {
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({}),
        } as unknown as typeof DataStore._testDocumentClient;

        const middleware = createLazyDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: sitePreferencesContext,
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const value = await readLazyDataStoreEntry(context, sitePreferencesContext);
        expect(value).toBeNull();
        warnSpy.mockRestore();
    });

    it('returns null when no loader has been registered in context', async () => {
        const value = await readLazyDataStoreEntry(context, sitePreferencesContext);
        expect(value).toBeNull();
    });
});

describe('prefixWithSiteId', () => {
    function createContext(siteId?: string): Readonly<RouterContextProvider> {
        const store = new Map<unknown, unknown>();
        if (siteId) {
            store.set(siteContext, { site: { id: siteId } });
        }
        return {
            set: (ctx: unknown, value: unknown) => store.set(ctx, value),
            get: (ctx: unknown) => store.get(ctx),
        } as unknown as RouterContextProvider;
    }

    it('returns a key prefixed with the site id', () => {
        const entryKey = prefixWithSiteId('login-preferences');
        expect(entryKey(createContext('site-1'))).toBe('site-1-login-preferences');
    });

    it('throws when site id is not available', () => {
        const entryKey = prefixWithSiteId('login-preferences');
        expect(() => entryKey(createContext())).toThrow(
            'Site id not found. Ensure site context middleware runs before data-store middleware.'
        );
    });
});

describe('getSitePreferences', () => {
    it('warns when data-store context is missing', () => {
        const emptyContext = {
            set: vi.fn(),
            get: vi.fn().mockReturnValue(null),
        } as unknown as RouterContextProvider;

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        expect(getSitePreferences(emptyContext)).toEqual({});
        expect(warnSpy).toHaveBeenCalledWith(
            'Data store context not found. Ensure data-store middleware runs before loaders and the required env vars are set.'
        );

        warnSpy.mockRestore();
    });
});
