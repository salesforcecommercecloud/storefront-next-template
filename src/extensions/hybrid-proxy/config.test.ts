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
    let originalEnabled: boolean;
    let originalPaths: typeof HYBRID_PROXY_CONFIG.paths;

    beforeEach(() => {
        originalEnabled = HYBRID_PROXY_CONFIG.enabled;
        originalPaths = [...HYBRID_PROXY_CONFIG.paths];
        // Ensure proxy is enabled for tests unless specified otherwise
        HYBRID_PROXY_CONFIG.enabled = true;
    });

    afterEach(() => {
        HYBRID_PROXY_CONFIG.enabled = originalEnabled;
        HYBRID_PROXY_CONFIG.paths = originalPaths;
    });

    describe('isProxyPath', () => {
        it('should return false if proxy is disabled', () => {
            HYBRID_PROXY_CONFIG.enabled = false;
            expect(isProxyPath('/cart')).toBe(false);
        });

        it('should return false for non-matching path', () => {
            expect(isProxyPath('/non-existent-path')).toBe(false);
        });

        it('should return false for partial match that does not start with proxy path', () => {
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
