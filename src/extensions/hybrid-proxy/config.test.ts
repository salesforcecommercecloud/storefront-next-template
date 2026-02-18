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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HYBRID_PROXY_CONFIG, isProxyPath, getProxyPathConfig } from './config';

describe('Hybrid Proxy Config', () => {
    let originalPaths: typeof HYBRID_PROXY_CONFIG.paths;
    let originalEnabled: boolean;

    beforeEach(() => {
        originalPaths = [...HYBRID_PROXY_CONFIG.paths];
        originalEnabled = HYBRID_PROXY_CONFIG.enabled;
    });

    afterEach(() => {
        HYBRID_PROXY_CONFIG.paths = originalPaths;
        HYBRID_PROXY_CONFIG.enabled = originalEnabled;
    });

    describe('enabled property', () => {
        it('should be a boolean value', () => {
            expect(typeof HYBRID_PROXY_CONFIG.enabled).toBe('boolean');
        });

        it('should default to false for safety (must be explicitly enabled)', () => {
            // Default value should be false for production safety
            // Users must explicitly set enabled: true to use the proxy
            expect(HYBRID_PROXY_CONFIG.enabled).toBe(false);
        });

        it('can be manually set to true for local testing', () => {
            HYBRID_PROXY_CONFIG.enabled = true;
            expect(HYBRID_PROXY_CONFIG.enabled).toBe(true);
        });
    });

    describe('isProxyPath', () => {
        it('should return false if proxy is disabled', () => {
            // Disable proxy
            HYBRID_PROXY_CONFIG.enabled = false;
            expect(isProxyPath('/cart')).toBe(false);
        });

        it('should return true for matching path when proxy is enabled', () => {
            HYBRID_PROXY_CONFIG.enabled = true;
            expect(isProxyPath('/cart')).toBe(true);
        });

        it('should return false for non-matching path', () => {
            HYBRID_PROXY_CONFIG.enabled = true;
            expect(isProxyPath('/non-existent-path')).toBe(false);
        });

        it('should return false for partial match that does not start with proxy path', () => {
            HYBRID_PROXY_CONFIG.enabled = true;
            // Assuming '/cart' is in config, 'my/cart' should not match
            expect(isProxyPath('/my/cart')).toBe(false);
        });
    });

    describe('getProxyPathConfig', () => {
        it('should return undefined for non-matching path', () => {
            expect(getProxyPathConfig('/non-existent')).toBeUndefined();
        });

        it('should return normalized object for string entry match', () => {
            const config = getProxyPathConfig('/on/demandware.store');
            expect(config).toEqual({ path: '/on/demandware.store' });
        });

        it('should return config object for object entry match', () => {
            const config = getProxyPathConfig('/cart');
            expect(config).toEqual({ path: '/cart', needsPrefix: true });
        });

        it('should find match for sub-paths', () => {
            const config = getProxyPathConfig('/checkout/shipping');
            expect(config).toEqual({ path: '/checkout', needsPrefix: true });
        });

        it('should return the first matching config', () => {
            HYBRID_PROXY_CONFIG.paths = ['/api', { path: '/api/special', needsPrefix: true }];

            // Since find returns first match, and /api matches /api/special, order matters in config.
            // But here we just test that it returns *a* match.
            const config = getProxyPathConfig('/api/special');
            expect(config).toBeDefined();
            expect(config?.path).toBe('/api'); // '/api' comes first and matches '/api/special'
        });
    });

    describe('getRewritePrefix', () => {
        it('should return standard SFRA pattern by default', () => {
            const prefix = HYBRID_PROXY_CONFIG.getRewritePrefix('RefArch', 'en_US');
            expect(prefix).toBe('/s/RefArch/en_US');
        });
    });
});
