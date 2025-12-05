/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Path patterns for SLAS authentication endpoints.
 * These endpoints handle their own authentication (Basic auth, PKCE, etc.)
 * and should NOT have Bearer tokens auto-injected by middleware.
 *
 * Use with URL.pathname.includes() to check if a request targets a SLAS auth endpoint.
 *
 * @example
 * ```typescript
 * const isSlasAuthEndpoint = SLAS_AUTH_ENDPOINTS.some(path => url.pathname.includes(path));
 * if (isSlasAuthEndpoint) {
 *     // Skip Bearer token injection - endpoint handles its own auth
 *     return request;
 * }
 * ```
 */
export const SLAS_AUTH_ENDPOINTS = [
    '/oauth2/token',
    '/oauth2/authorize',
    '/oauth2/logout',
    '/oauth2/login',
    '/oauth2/passwordless',
    '/oauth2/password',
    '/oauth2/session-bridge',
    '/oauth2/trusted-agent',
    '/oauth2/trusted-system',
    '/oauth2/revoke',
    '/oauth2/introspect',
] as const;
