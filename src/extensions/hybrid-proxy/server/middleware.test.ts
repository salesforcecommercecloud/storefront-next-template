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
import { createHybridProxyMiddleware } from '../server/middleware';
import { HYBRID_PROXY_CONFIG, getProxyPathConfig } from '../config';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Mock dependencies
vi.mock('http-proxy-middleware', () => ({
    createProxyMiddleware: vi.fn(),
}));

vi.mock('../config', () => ({
    HYBRID_PROXY_CONFIG: {
        enabled: true,
        sfccOrigin: 'https://test-origin.com',
        getRewritePrefix: vi.fn(),
        paths: [],
    },
    isProxyPath: vi.fn(),
    getProxyPathConfig: vi.fn(),
}));

describe('createHybridProxyMiddleware', () => {
    const siteId = 'RefArch';
    const locale = 'en_US';
    let req: any;
    let res: any;
    let next: any;
    let mockProxy: any;

    beforeEach(() => {
        req = {
            path: '/test-path',
            headers: {},
            socket: {},
        };
        res = {
            redirect: vi.fn(),
        };
        next = vi.fn();
        mockProxy = vi.fn();

        vi.mocked(createProxyMiddleware).mockReturnValue(mockProxy);
        vi.mocked(HYBRID_PROXY_CONFIG.getRewritePrefix).mockReturnValue(`/s/${siteId}/${locale}`);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('when disabled', () => {
        it('should call next() directly if enabled is false', async () => {
            HYBRID_PROXY_CONFIG.enabled = false;

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(createProxyMiddleware).not.toHaveBeenCalled();

            // Reset
            HYBRID_PROXY_CONFIG.enabled = true;
        });

        it('should call next() directly if sfccOrigin is missing', async () => {
            const originalOrigin = HYBRID_PROXY_CONFIG.sfccOrigin;

            HYBRID_PROXY_CONFIG.sfccOrigin = '';

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(createProxyMiddleware).not.toHaveBeenCalled();

            // Reset
            HYBRID_PROXY_CONFIG.sfccOrigin = originalOrigin;
        });
    });

    describe('when enabled', () => {
        it('should create proxy middleware with correct configuration', () => {
            createHybridProxyMiddleware(siteId, locale);

            expect(createProxyMiddleware).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: 'https://test-origin.com',
                    changeOrigin: true,
                    secure: false,
                    autoRewrite: true,
                    cookieDomainRewrite: { '*': '' },
                })
            );
        });

        it('should handle paths requiring prefix redirection', async () => {
            req.path = '/cart';
            vi.mocked(getProxyPathConfig).mockReturnValue({ path: '/cart', needsPrefix: true });

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(getProxyPathConfig).toHaveBeenCalledWith('/cart');
            expect(res.redirect).toHaveBeenCalledWith(`/s/${siteId}/${locale}/cart`);
            expect(mockProxy).not.toHaveBeenCalled();
        });

        it('should not redirect if path matches a proxy path that does not need prefix', async () => {
            req.path = `/s/${siteId}/${locale}/cart`;
            // Mock returning a config that does NOT have needsPrefix (like '/s/')
            vi.mocked(getProxyPathConfig).mockReturnValue({ path: '/s/' });

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(res.redirect).not.toHaveBeenCalled();
            expect(mockProxy).toHaveBeenCalled();
        });

        it('should forward to proxy if no prefix needed', async () => {
            req.path = '/other';
            vi.mocked(getProxyPathConfig).mockReturnValue(undefined);

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(mockProxy).toHaveBeenCalledWith(req, res, next);
        });

        describe('proxy events', () => {
            it('should set headers in proxyReq', () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0];
                const proxyReq = {
                    setHeader: vi.fn(),
                };

                config.on.proxyReq(proxyReq, req, res);

                expect(proxyReq.setHeader).toHaveBeenCalledWith('origin', 'https://test-origin.com');
                expect(proxyReq.setHeader).toHaveBeenCalledWith('x-forwarded-proto', 'https');
            });

            it('should rewrite location header in proxyRes for localhost http', () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0];
                const proxyRes = {
                    headers: {
                        location: 'https://localhost:3000/callback',
                    },
                };
                req.socket = { encrypted: false }; // http client

                config.on.proxyRes(proxyRes, req, res);

                expect(proxyRes.headers.location).toBe('http://localhost:3000/callback');
            });

            it('should not rewrite location header if client is https', () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0];
                const originalLocation = 'https://localhost:3000/callback';
                const proxyRes = {
                    headers: {
                        location: originalLocation,
                    },
                };
                req.socket = { encrypted: true }; // https client

                config.on.proxyRes(proxyRes, req, res);

                expect(proxyRes.headers.location).toBe(originalLocation);
            });

            it('should not rewrite location header if it does not start with https', () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0];
                const originalLocation = 'http://other.com';
                const proxyRes = {
                    headers: {
                        location: originalLocation,
                    },
                };
                req.socket = { encrypted: false };

                config.on.proxyRes(proxyRes, req, res);

                expect(proxyRes.headers.location).toBe(originalLocation);
            });
        });
    });
});
