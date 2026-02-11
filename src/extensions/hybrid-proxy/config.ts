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
export const HYBRID_PROXY_CONFIG = {
    // Set this to true to enable the proxy
    enabled: false,
    // The URL of your SFRA/SiteGenesis instance (ODS)
    sfccOrigin: '',
    // List of paths to proxy. Can be a string (direct proxy) or an object (with options).
    // For example, if you want to proxy the /cart path, you can add it here:
    // { path: '/cart', needsPrefix: true }
    // If you want to proxy the /checkout path, you can add it here:
    // { path: '/checkout', needsPrefix: true }
    paths: [
        { path: '/cart', needsPrefix: true },
        { path: '/checkout', needsPrefix: true },
        '/on/demandware.store',
        '/on/demandware.static',
        '/s/',
    ],
    /**
     * Function to generate the URL prefix for rewritten paths.
     * Default follows SFRA pattern: /s/{siteId}/{locale}
     * For SiteGenesis or other structures, modify this to return the correct prefix.
     */
    getRewritePrefix: (siteId: string, locale: string) => `/s/${siteId}/${locale}`,
};

/**
 * Checks if a given path matches any of the configured proxy paths
 */
export function isProxyPath(path: string): boolean {
    if (!HYBRID_PROXY_CONFIG.enabled) return false;

    return HYBRID_PROXY_CONFIG.paths.some((item) => {
        const proxyPath = typeof item === 'string' ? item : item.path;
        return path.startsWith(proxyPath);
    });
}

/**
 * Gets the configuration object for a specific path, if it exists
 */
export function getProxyPathConfig(path: string): { path: string; needsPrefix?: boolean } | undefined {
    const match = HYBRID_PROXY_CONFIG.paths.find((item) => {
        const proxyPath = typeof item === 'string' ? item : item.path;
        return path.startsWith(proxyPath);
    });

    if (!match) return undefined;

    return typeof match === 'string' ? { path: match } : match;
}
