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

/**
 * Hybrid Proxy Configuration
 *
 * ⚠️ IMPORTANT: This extension is for LOCAL DEVELOPMENT ONLY.
 * This extension should be REMOVED before deploying to production.
 *
 * To use for local testing:
 * 1. Set enabled = true (below)
 * 2. Set sfccOrigin to your SFRA instance URL (below)
 * 3. Restart your dev server
 * 4. Access routes like /cart or /checkout to test hybrid routing
 *
 * When done testing, set enabled = false.
 * Before production deployment, remove this extension entirely using the CLI:
 *   npx @salesforce/storefront-next-dev extensions remove -d . -e SFDC_EXT_HYBRID_PROXY
 */

export const HYBRID_PROXY_CONFIG = {
    /**
     * Enable/disable the hybrid proxy middleware
     * Set to true for local testing, false otherwise
     *
     * Default: false (disabled) - must be explicitly enabled for testing
     */
    enabled: false,

    /**
     * SFRA/SiteGenesis instance origin URL
     * Update this to your SFRA instance URL when testing
     * Example: https://your-instance.dx.commercecloud.salesforce.com
     */
    sfccOrigin: '',

    /**
     * Public domain for URL rewriting in SFRA responses
     *
     * Purpose: Rewrites absolute SFRA URLs in proxied responses to prevent CORS errors
     *
     * When to configure:
     * - Local development: Leave EMPTY (detects from request headers: localhost:5173)
     * - MRT deployment: REQUIRED - Set to your MRT domain
     *
     * How to get your MRT domain:
     * 1. Deploy to MRT: `npx @salesforce/storefront-next-dev push -d .`
     * 2. Copy the domain from deployment output
     * 3. Set it here without protocol
     *
     * Examples:
     * - Local: '' (empty, uses request headers)
     * - MRT: 'your-project-production.exp-delivery.com'
     */
    publicDomain: '',
    /**
     * Paths to proxy to SFRA.
     *
     * - Object `{ path: string, needsPrefix: true }` - requires `/s/{siteId}/{locale}` prefix (for SFRA pages)
     * - String `'/path'` - proxies as-is (for static assets and already-prefixed paths)
     *
     * When needsPrefix is true, the path will be rewritten before proxying.
     * Example: /cart → /s/RefArch/en-US/cart
     *
     * Note: Only proxy routes with matching URL structures between storefronts.
     * For routes with different URL patterns (e.g., product pages), use the
     * official plugin_redirect cartridge in SFRA instead.
     * See: https://github.com/SalesforceCommerceCloud/plugin_redirect
     */
    paths: [
        { path: '/cart', needsPrefix: true },
        { path: '/checkout', needsPrefix: true },
        '/on/demandware.store',
        '/on/demandware.static',
        '/s/', // Catches all /s/{siteId}/{locale}/* paths
    ],
    /**
     * Generates the URL prefix for paths that need it.
     *
     * Default: SFRA pattern `/s/{siteId}/{locale}`
     * Customize for SiteGenesis: `/on/demandware.store/Sites-${siteId}-Site/${locale}`
     */
    getRewritePrefix: (siteId: string, locale: string) => {
        return `/s/${siteId}/${locale}`;
    },
};

/**
 * Checks if a given path matches any of the configured proxy paths.
 * If it matches, the request should be proxied to SFRA.
 */
export function isProxyPath(path: string): boolean {
    if (!HYBRID_PROXY_CONFIG.enabled) return false;

    return HYBRID_PROXY_CONFIG.paths.some((item) => {
        const proxyPath = typeof item === 'string' ? item : item.path;
        return path.startsWith(proxyPath);
    });
}

/**
 * Gets the configuration object for a specific path, if it exists.
 */
export function getProxyPathConfig(path: string): { path: string; needsPrefix?: boolean } | undefined {
    const match = HYBRID_PROXY_CONFIG.paths.find((item) => {
        const proxyPath = typeof item === 'string' ? item : item.path;
        return path.startsWith(proxyPath);
    });

    if (!match) return undefined;

    return typeof match === 'string' ? { path: match } : match;
}
