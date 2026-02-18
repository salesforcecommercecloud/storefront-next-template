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
    responseInterceptor: vi.fn((fn) => fn),
}));

/** Config shape passed to createProxyMiddleware; on.proxyRes has our 4-arg responseInterceptor signature. */
type ProxyTestConfig = {
    on: {
        proxyReq?: (pr: unknown, r: unknown, s: unknown) => void;
        proxyRes: (buf: Buffer, pr: unknown, r: unknown, s: unknown) => void | Buffer | Promise<Buffer>;
    };
};

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
            url: '/test-path',
            headers: {
                host: 'localhost:3000',
            },
            socket: {},
        };
        res = {
            redirect: vi.fn(),
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
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
                    selfHandleResponse: true,
                })
            );
        });

        it('should handle paths requiring prefix redirection', async () => {
            req.path = '/cart';
            req.url = '/cart';
            vi.mocked(getProxyPathConfig).mockReturnValue({ path: '/cart', needsPrefix: true });

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(getProxyPathConfig).toHaveBeenCalledWith('/cart');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalled();
            const sentHtml = vi.mocked(res.send).mock.calls[0][0];
            expect(sentHtml).toContain(`/s/${siteId}/${locale}/cart`);
            expect(sentHtml).toContain('window.location.href');
            expect(mockProxy).not.toHaveBeenCalled();
        });

        it('should escape redirect URL to prevent XSS when query string contains HTML/script', async () => {
            req.path = '/cart';
            req.url = '/cart?foo="></script><script>alert(document.cookie)</script>';
            vi.mocked(getProxyPathConfig).mockReturnValue({ path: '/cart', needsPrefix: true });

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            const sentHtml = vi.mocked(res.send).mock.calls[0][0] as string;
            // Must be escaped: no raw <script> or double-quote that could break attributes
            expect(sentHtml).toContain('&quot;');
            expect(sentHtml).toContain('&lt;');
            expect(sentHtml).toContain('&gt;');
            expect(sentHtml).not.toMatch(/<script>alert/);
        });

        it('should not redirect if path matches a proxy path that does not need prefix', async () => {
            req.path = `/s/${siteId}/${locale}/cart`;
            req.url = `/s/${siteId}/${locale}/cart`;
            // Mock returning a config that does NOT have needsPrefix (like '/s/')
            vi.mocked(getProxyPathConfig).mockReturnValue({ path: '/s/' });

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(res.status).not.toHaveBeenCalled();
            expect(mockProxy).toHaveBeenCalled();
        });

        it('should call next() if path does not match any proxy path', async () => {
            req.path = '/other';
            req.url = '/other';
            vi.mocked(getProxyPathConfig).mockReturnValue(undefined);

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(mockProxy).not.toHaveBeenCalled();
        });

        it('should skip .data requests (React Router internal)', async () => {
            req.path = '/cart.data';
            req.url = '/cart.data';

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(mockProxy).not.toHaveBeenCalled();
        });

        it('should skip /mobify paths (SCAPI requests)', async () => {
            req.path = '/mobify/proxy/api/experience/shopper-experience/v1/organizations/test/pages/homepage';
            req.url = '/mobify/proxy/api/experience/shopper-experience/v1/organizations/test/pages/homepage';

            const middleware = createHybridProxyMiddleware(siteId, locale);
            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(mockProxy).not.toHaveBeenCalled();
        });

        describe('proxy events', () => {
            it('should set headers in proxyReq', () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const proxyReq = {
                    setHeader: vi.fn(),
                };

                config.on.proxyReq?.(proxyReq, req, res);

                expect(proxyReq.setHeader).toHaveBeenCalledWith('origin', 'https://test-origin.com');
                expect(proxyReq.setHeader).toHaveBeenCalledWith('x-forwarded-proto', 'https');
            });

            it('should rewrite location header in proxyRes for localhost http', async () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const proxyRes = {
                    headers: {
                        location: 'https://test-origin.com/callback',
                    },
                };
                req.socket = { encrypted: false }; // http client

                await config.on.proxyRes(Buffer.from(''), proxyRes, req, res);

                expect(res.setHeader).toHaveBeenCalledWith('location', 'http://localhost:3000/callback');
            });

            it('should rewrite location header for https client', async () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const proxyRes = {
                    headers: {
                        location: 'https://test-origin.com/callback',
                    },
                };
                req.socket = { encrypted: true }; // https client

                await config.on.proxyRes(Buffer.from(''), proxyRes, req, res);

                expect(res.setHeader).toHaveBeenCalledWith('location', 'https://localhost:3000/callback');
            });

            it('should not rewrite location header if it does not contain sfccOrigin', async () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const proxyRes = {
                    headers: {
                        location: 'http://other.com/callback',
                    },
                };
                req.socket = { encrypted: false };

                await config.on.proxyRes(Buffer.from(''), proxyRes, req, res);

                expect(res.setHeader).not.toHaveBeenCalled();
            });

            it('should rewrite SFCC URLs in HTML responses', async () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const htmlContent = '<a href="https://test-origin.com/product">Product</a>';
                const proxyRes = {
                    headers: {
                        'content-type': 'text/html',
                    },
                };
                req.socket = { encrypted: false };

                const result = await config.on.proxyRes(Buffer.from(htmlContent), proxyRes, req, res);

                const rewrittenHtml = (result as Buffer).toString('utf8');
                expect(rewrittenHtml).toBe('<a href="http://localhost:3000/product">Product</a>');
            });

            it('should rewrite SFCC URLs in JSON responses', async () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const jsonContent = JSON.stringify({ url: 'https://test-origin.com/api/product' });
                const proxyRes = {
                    headers: {
                        'content-type': 'application/json',
                    },
                };
                req.socket = { encrypted: false };

                const result = await config.on.proxyRes(Buffer.from(jsonContent), proxyRes, req, res);

                const rewrittenJson = (result as Buffer).toString('utf8');
                expect(rewrittenJson).toBe(JSON.stringify({ url: 'http://localhost:3000/api/product' }));
            });

            it('should rewrite SFCC URLs in application/javascript responses', async () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const jsContent = "fetch('https://test-origin.com/analytics/track')";
                const proxyRes = {
                    headers: {
                        'content-type': 'application/javascript',
                    },
                };
                req.socket = { encrypted: false };

                const result = await config.on.proxyRes(Buffer.from(jsContent), proxyRes, req, res);

                const rewrittenJs = (result as Buffer).toString('utf8');
                expect(rewrittenJs).toBe("fetch('http://localhost:3000/analytics/track')");
            });

            it('should rewrite SFCC URLs in text/javascript responses', async () => {
                createHybridProxyMiddleware(siteId, locale);

                const config = vi.mocked(createProxyMiddleware).mock.calls[0][0] as ProxyTestConfig;
                const jsContent = "var apiUrl = 'https://test-origin.com/api/config';";
                const proxyRes = {
                    headers: {
                        'content-type': 'text/javascript',
                    },
                };
                req.socket = { encrypted: false };

                const result = await config.on.proxyRes(Buffer.from(jsContent), proxyRes, req, res);

                const rewrittenJs = (result as Buffer).toString('utf8');
                expect(rewrittenJs).toBe("var apiUrl = 'http://localhost:3000/api/config';");
            });
        });
    });
});
