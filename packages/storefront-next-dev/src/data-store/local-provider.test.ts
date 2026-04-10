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

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalDataStoreProvider } from './local-provider';

describe('createLocalDataStoreProvider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns values from provided defaults', async () => {
        const provider = createLocalDataStoreProvider({
            defaults: {
                'custom-global-preferences': { featureFlag: true },
            },
        });

        await expect(provider.getEntry('custom-global-preferences')).resolves.toEqual({
            value: { featureFlag: true },
        });
    });

    it('reads defaults from SFNEXT_DATA_STORE_DEFAULTS', async () => {
        process.env.SFNEXT_DATA_STORE_DEFAULTS = JSON.stringify({
            'custom-site-preferences': { theme: 'dark' },
        });

        const provider = createLocalDataStoreProvider();

        await expect(provider.getEntry('custom-site-preferences')).resolves.toEqual({
            value: { theme: 'dark' },
        });
    });

    it('warns once when a key is missing', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const provider = createLocalDataStoreProvider();

        await provider.getEntry('missing-key');
        await provider.getEntry('missing-key');

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
            "Local data-store provider did not find 'missing-key'. Returning an empty object for development."
        );
    });

    it('silences missing-key warnings when SFNEXT_DATA_STORE_WARN_ON_MISSING=false', async () => {
        process.env.SFNEXT_DATA_STORE_WARN_ON_MISSING = 'false';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const provider = createLocalDataStoreProvider();
        await provider.getEntry('missing-key');

        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns and falls back when defaults JSON is invalid', async () => {
        process.env.SFNEXT_DATA_STORE_DEFAULTS = '{not:json}';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const provider = createLocalDataStoreProvider();
        await expect(provider.getEntry('custom-global-preferences')).resolves.toEqual({ value: {} });

        expect(warnSpy).toHaveBeenCalledWith('Failed to parse SFNEXT_DATA_STORE_DEFAULTS JSON.', expect.any(Error));
    });
});
