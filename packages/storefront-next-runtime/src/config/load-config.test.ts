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

import fs from 'node:fs';
import { describe, expect, test, vi, beforeEach } from 'vitest';

let mockConfigModule: Record<string, any> = {};

vi.mock('node:fs', () => ({
    default: { existsSync: vi.fn() },
}));

vi.mock('node:url', () => {
    const pathToFileURL = vi.fn(() => ({ href: '/mock-config-server' }));
    return { pathToFileURL, default: { pathToFileURL } };
});

// Use a getter so the `default` export is always read fresh from mockConfigModule,
// preventing cached stale values from leaking between tests.
vi.mock('/mock-config-server', () => ({
    get default() {
        return mockConfigModule.default;
    },
}));

describe('loadConfig', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.mocked(fs.existsSync).mockReturnValue(false);
        mockConfigModule = {};
    });

    test('should warn and return empty config when config file does not exist', async () => {
        const { loadConfig } = await import('./load-config');
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        try {
            const result = await loadConfig();

            expect(result).toEqual({});
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('config.server.ts not found'));
        } finally {
            warnSpy.mockRestore();
        }
    });

    test('should return the full app config object', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        const appConfig = {
            url: {
                prefix: '/:siteId/:localeId',
                excludeRoutes: ['/resource/**'],
            },
            someOtherSetting: 'value',
        };

        mockConfigModule = { default: { app: appConfig } };

        const { loadConfig } = await import('./load-config');
        const result = await loadConfig();

        expect(result).toEqual(appConfig);
    });

    test('should return empty config when config exists but has no app key', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        mockConfigModule = { default: {} };

        const { loadConfig } = await import('./load-config');
        const result = await loadConfig();

        expect(result).toEqual({});
    });
});
