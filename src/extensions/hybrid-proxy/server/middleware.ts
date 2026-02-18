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
import { createProxyMiddleware, responseInterceptor, type RequestHandler } from 'http-proxy-middleware';
import type { Request, Response, NextFunction } from 'express';
import type { TLSSocket } from 'tls';
import { HYBRID_PROXY_CONFIG, getProxyPathConfig } from '../config';

/**
 * Escape HTML special characters to prevent XSS when injecting user-influenced
 * data (e.g. redirect URLs with query strings) into HTML and script contexts.
 * Escapes & < > " ' in that order (& first to avoid double-encoding).
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Creates a proxy middleware that forwards requests to an SFRA/SiteGenesis instance.
 *
 * This middleware rewrites paths that need prefixes (e.g., /cart → /s/{siteId}/{locale}/cart)
 * before proxying to SFRA. This allows users to access /cart and have it work seamlessly.
 */
export function createHybridProxyMiddleware(siteId: string, locale: string): RequestHandler {
    const { enabled, sfccOrigin, getRewritePrefix } = HYBRID_PROXY_CONFIG;
    const hybridPrefix = getRewritePrefix ? getRewritePrefix(siteId, locale) : `/s/${siteId}/${locale}`;

    if (!enabled || !sfccOrigin) {
        return (_req, _res, next) => next();
    }

    const proxy = createProxyMiddleware({
        target: sfccOrigin,
        changeOrigin: true,
        secure: false,
        autoRewrite: true, // Rewrites the Location header in redirects to match the proxy
        cookieDomainRewrite: { '*': '' }, // Rewrites cookie domain to match the proxy
        // Note: We don't use pathFilter here because we rewrite paths before proxying
        // All filtering is done in the wrapper middleware below
        selfHandleResponse: true, // Required for URL rewriting in responses
        on: {
            proxyReq: (proxyReq) => {
                // Set Origin header to SFCC origin to pass CORS checks on SFRA
                proxyReq.setHeader('origin', sfccOrigin);
                // Tell SFRA that the original request was HTTPS (prevents http->https redirect loops)
                proxyReq.setHeader('x-forwarded-proto', 'https');
            },
            /**
             * CORS Fix: Rewrite all SFCC URLs in responses to proxy URLs
             *
             * Problem: SFRA pages contain hardcoded absolute URLs (e.g., AJAX requests)
             *          pointing to the SFCC origin, causing CORS errors.
             *
             * Solution: Rewrite all SFCC URLs in HTML/JSON responses to the proxy origin.
             *
             * Example: When updating cart quantity, SFRA makes AJAX call to:
             *   https://zzrf-016.../Cart-UpdateQuantity
             *   → http://localhost:5173/on/demandware.store/.../Cart-UpdateQuantity
             */
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
            proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
                // Build the proxy origin URL
                // Priority:
                // 1. Use configured publicDomain (required for MRT)
                // 2. Fall back to x-forwarded-host header
                // 3. Fall back to direct connection details (for local)
                const xForwardedProto = req.headers['x-forwarded-proto'] as string;
                const xForwardedHost = req.headers['x-forwarded-host'] as string;
                const regularHost = req.headers.host;
                const isEncrypted = (req.socket as TLSSocket)?.encrypted;
                const { publicDomain } = HYBRID_PROXY_CONFIG;

                const protocol = xForwardedProto || (isEncrypted ? 'https' : 'http');
                const host = publicDomain || xForwardedHost || regularHost;
                const proxyOrigin = `${protocol}://${host}`;

                // Rewrite Location header redirects
                if (proxyRes.headers.location?.includes(sfccOrigin)) {
                    res.setHeader('location', proxyRes.headers.location.replace(sfccOrigin, proxyOrigin));
                }

                const contentType = proxyRes.headers['content-type'];
                if (!contentType) return responseBuffer;

                // Rewrite URLs in HTML, JSON, and JavaScript responses to prevent CORS
                // This includes inline scripts, external .js files, and JSON API responses
                if (
                    contentType.includes('text/html') ||
                    contentType.includes('application/json') ||
                    contentType.includes('application/javascript') ||
                    contentType.includes('text/javascript')
                ) {
                    const responseText = responseBuffer.toString('utf8');
                    const rewrittenText = responseText.replaceAll(sfccOrigin, proxyOrigin);
                    return Buffer.from(rewrittenText, 'utf8');
                }

                return responseBuffer;
            }),
        },
    });

    return (req, res, next) => {
        // Cast to Express types to access path, redirect, etc.
        const expressReq = req as Request;
        const expressRes = res as Response;
        const expressNext = next as NextFunction;

        // Skip React Router data loader requests (*.data suffix)
        // These are internal to React Router and should not be proxied to SFRA
        if (expressReq.path.endsWith('.data')) {
            return expressNext();
        }

        // Skip SCAPI proxy requests (/mobify/proxy/api/...)
        // These are Storefront Next's own API calls and should not be proxied to SFRA
        if (expressReq.path.startsWith('/mobify')) {
            return expressNext();
        }

        // Check if this path should be proxied (using original path)
        const config = getProxyPathConfig(expressReq.path);
        const shouldProxy = !!config;

        if (!shouldProxy) {
            // Path doesn't match any proxy rules, pass to next middleware
            return expressNext();
        }

        // If path needs prefix, redirect client-side to the full URL
        if (config.needsPrefix && !expressReq.path.startsWith(hybridPrefix)) {
            const originalPath = expressReq.path;
            const queryString = expressReq.url.includes('?')
                ? expressReq.url.substring(expressReq.url.indexOf('?'))
                : '';
            const redirectPath = `${hybridPrefix}${originalPath}${queryString}`;

            // Sanitize to prevent XSS: queryString is user input and must not be injected raw into HTML/JS
            const safeRedirectPath = escapeHtml(redirectPath);
            const safeRedirectPathForJs = safeRedirectPath.replace(/\\/g, '\\\\');

            // Return HTML with JavaScript redirect + meta refresh fallback
            expressRes.status(200).send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=${safeRedirectPath}">
    <title>Redirecting...</title>
</head>
<body>
    <script>window.location.href = '${safeRedirectPathForJs}';</script>
    <noscript>
        <p>Redirecting to <a href="${safeRedirectPath}">${safeRedirectPath}</a>...</p>
    </noscript>
</body>
</html>`);
            return;
        }

        return proxy(req, res, next);
    };
}
