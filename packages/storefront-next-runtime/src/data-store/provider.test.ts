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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hasMrtEnvironment = vi.fn();
const isDevelopmentEnvironment = vi.fn();
const tryImportLocalProvider = vi.fn();
const getEntry = vi.fn();
const getDataStore = vi.fn(() => ({ getEntry }));

vi.mock('./utils', () => ({
    hasMrtEnvironment,
    isDevelopmentEnvironment,
    tryImportLocalProvider,
}));

vi.mock('@salesforce/mrt-utilities/middleware', () => ({
    DataStore: {
        getDataStore,
    },
}));

describe('getDefaultDataStoreProvider', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        getDataStore.mockReturnValue({ getEntry });
        delete process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL;
        delete process.env.CI;
    });

    afterEach(() => {
        for (const key of Object.keys(process.env)) {
            delete process.env[key];
        }
        Object.assign(process.env, originalEnv);
    });

    it('returns an MRT provider when MRT env is present', async () => {
        hasMrtEnvironment.mockReturnValue(true);

        const { getDefaultDataStoreProvider, resetDataStoreProviderCache } = await import('./provider');
        resetDataStoreProviderCache();
        const provider = await getDefaultDataStoreProvider();

        expect(provider.kind).toBe('mrt');
        await provider.getEntry('custom-global-preferences');
        expect(getDataStore).toHaveBeenCalledOnce();
        expect(getEntry).toHaveBeenCalledWith('custom-global-preferences');
    });

    it('returns a local provider when in development without MRT env', async () => {
        const localProvider = {
            kind: 'local' as const,
            getEntry: vi.fn().mockResolvedValue({ value: { enabled: false } }),
        };

        hasMrtEnvironment.mockReturnValue(false);
        isDevelopmentEnvironment.mockReturnValue(true);
        tryImportLocalProvider.mockResolvedValue({
            createLocalDataStoreProvider: vi.fn().mockReturnValue(localProvider),
        });

        const { getDefaultDataStoreProvider, resetDataStoreProviderCache } = await import('./provider');
        resetDataStoreProviderCache();
        const provider = await getDefaultDataStoreProvider();

        expect(provider).toBe(localProvider);
        expect(tryImportLocalProvider).toHaveBeenCalledOnce();
    });

    it('throws when MRT env is missing outside development', async () => {
        hasMrtEnvironment.mockReturnValue(false);
        isDevelopmentEnvironment.mockReturnValue(false);

        const { getDefaultDataStoreProvider, resetDataStoreProviderCache } = await import('./provider');
        resetDataStoreProviderCache();

        await expect(getDefaultDataStoreProvider()).rejects.toThrow(
            'Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.'
        );
    });

    it('returns a local provider when allowed outside development', async () => {
        const localProvider = {
            kind: 'local' as const,
            getEntry: vi.fn().mockResolvedValue({ value: { enabled: false } }),
        };

        hasMrtEnvironment.mockReturnValue(false);
        isDevelopmentEnvironment.mockReturnValue(false);
        process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL = 'true';
        tryImportLocalProvider.mockResolvedValue({
            createLocalDataStoreProvider: vi.fn().mockReturnValue(localProvider),
        });

        const { getDefaultDataStoreProvider, resetDataStoreProviderCache } = await import('./provider');
        resetDataStoreProviderCache();
        const provider = await getDefaultDataStoreProvider();

        expect(provider).toBe(localProvider);
        expect(tryImportLocalProvider).toHaveBeenCalledOnce();
    });

    it('caches the resolved provider', async () => {
        const localProvider = {
            kind: 'local' as const,
            getEntry: vi.fn().mockResolvedValue({ value: { enabled: false } }),
        };

        hasMrtEnvironment.mockReturnValue(false);
        isDevelopmentEnvironment.mockReturnValue(true);
        tryImportLocalProvider.mockResolvedValue({
            createLocalDataStoreProvider: vi.fn().mockReturnValue(localProvider),
        });

        const { getDefaultDataStoreProvider, resetDataStoreProviderCache } = await import('./provider');
        resetDataStoreProviderCache();

        const first = await getDefaultDataStoreProvider();
        const second = await getDefaultDataStoreProvider();

        expect(first).toBe(second);
        expect(tryImportLocalProvider).toHaveBeenCalledOnce();
    });
});
