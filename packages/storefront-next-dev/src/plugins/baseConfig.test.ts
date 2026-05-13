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
import type { UserConfig, ConfigEnv } from 'vite';
import { baseConfigPlugin } from './baseConfig';

function invokeConfigHook(plugin: ReturnType<typeof baseConfigPlugin>): UserConfig {
    const configHook = plugin.config;
    if (typeof configHook !== 'function') {
        throw new Error('baseConfigPlugin().config is expected to be a function');
    }
    const result = configHook.call(
        {} as never,
        {} as UserConfig,
        { command: 'serve', mode: 'development' } as ConfigEnv
    );
    if (!result || result instanceof Promise) {
        throw new Error('baseConfigPlugin().config is expected to return a config object synchronously');
    }
    return result as UserConfig;
}

describe('baseConfigPlugin', () => {
    it('returns a plugin with the expected name', () => {
        const plugin = baseConfigPlugin();
        expect(plugin.name).toBe('storefront-next:base-config');
    });

    it('dedupes React and React Router to prevent duplicate instances', () => {
        const config = invokeConfigHook(baseConfigPlugin());
        expect(config.resolve?.dedupe).toEqual(['react', 'react-dom', 'react-router']);
    });

    it('pre-bundles React Router entries via optimizeDeps.include', () => {
        const config = invokeConfigHook(baseConfigPlugin());
        expect(config.optimizeDeps?.include).toEqual(['react-router', 'react-router/internal/react-server-client']);
    });

    it('forces the SDK through Vite SSR transform via ssr.noExternal to keep module identity stable in dev', () => {
        const config = invokeConfigHook(baseConfigPlugin());
        expect(config.ssr?.noExternal).toEqual(['@salesforce/storefront-next-runtime']);
    });
});
