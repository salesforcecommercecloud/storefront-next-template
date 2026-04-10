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
    hasMrtEnvironment,
    isDevelopmentEnvironment,
} from './utils';
import { resetDataStoreProviderCache } from './provider';
import { getSitePreferences, sitePreferencesContext } from './middleware/custom-site-preferences';

type MiddlewareNext = Parameters<MiddlewareFunction<Response>>[1];

describe('createDataStoreMiddleware', () => {
    let context: RouterContextProvider;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        resetDataStoreProviderCache();
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
        resetDataStoreProviderCache();
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

    it('uses a custom provider when provided', async () => {
        const provider = {
            kind: 'local' as const,
            getEntry: vi.fn().mockResolvedValue({ value: { enabled: false } }),
        };

        const middleware = createDataStoreMiddleware({
            entryKey: 'site-preferences',
            context: sitePreferencesContext,
            provider,
        });

        await middleware(
            { request: new Request('https://example.com'), context, params: {}, unstable_pattern: '' },
            next as MiddlewareNext
        );

        expect(provider.getEntry).toHaveBeenCalledWith('site-preferences');
        expect(context.get(sitePreferencesContext)).toEqual({ enabled: false });
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
        const originalAllowLocal = process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL;
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        process.env.NODE_ENV = 'production';
        delete process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL;
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
        if (typeof originalAllowLocal === 'undefined') {
            delete process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL;
        } else {
            process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL = originalAllowLocal;
        }
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

describe('provider utils', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAwsRegion = process.env.AWS_REGION;
    const originalPropertyId = process.env.MOBIFY_PROPERTY_ID;
    const originalDeployTarget = process.env.DEPLOY_TARGET;

    beforeEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.AWS_REGION = originalAwsRegion;
        process.env.MOBIFY_PROPERTY_ID = originalPropertyId;
        process.env.DEPLOY_TARGET = originalDeployTarget;
    });

    it('detects MRT environment variables', () => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.MOBIFY_PROPERTY_ID = 'prop-1';
        process.env.DEPLOY_TARGET = 'production';

        expect(hasMrtEnvironment()).toBe(true);

        delete process.env.DEPLOY_TARGET;
        expect(hasMrtEnvironment()).toBe(false);
    });

    it('detects development environment', () => {
        process.env.NODE_ENV = 'production';
        expect(isDevelopmentEnvironment()).toBe(false);

        process.env.NODE_ENV = 'test';
        expect(isDevelopmentEnvironment()).toBe(true);
    });
});

describe('tryImportLocalProvider', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('returns the local provider module when available', async () => {
        vi.doMock('@salesforce/storefront-next-dev/data-store/local-provider', () => ({
            createLocalDataStoreProvider: vi.fn(),
        }));

        const { tryImportLocalProvider } = await import('./utils');
        const module = await tryImportLocalProvider();

        expect(module.createLocalDataStoreProvider).toBeTypeOf('function');
    });

    it('throws a helpful error when the local provider cannot be resolved', async () => {
        vi.doMock('@salesforce/storefront-next-dev/data-store/local-provider', () => {
            throw new Error('boom');
        });

        const { tryImportLocalProvider } = await import('./utils');

        await expect(tryImportLocalProvider()).rejects.toThrow(
            'Failed to load local data-store provider. Ensure @salesforce/storefront-next-dev is installed.'
        );
    });
});
