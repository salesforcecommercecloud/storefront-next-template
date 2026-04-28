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
import type { RouterContextProvider } from 'react-router';
import {
    createCommerceApiClients,
    createClient,
    createOpenApiFetchClient,
    defaultQuerySerializer,
    SLAS_AUTH_ENDPOINTS,
    type OperationMap,
    type Middleware,
} from '@salesforce/storefront-next-runtime/scapi';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import { AUTH_TOKEN_INVALID_ERROR, authContext, authStorageContext } from '@/middlewares/auth.utils';
import { correlationContext } from '@/lib/correlation';
import { getLogger } from '@/lib/logger.server';
import { maintenanceContext } from '@/lib/maintenance';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { getAppOrigin, getScapiBaseUrl, isAbsoluteURL } from '@/lib/utils';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { customClients, type AppClients } from '@/scapi/custom-clients';
import { scapiMiddlewareContext } from '@/lib/scapi-middleware';

type CustomClientConfigEntry = {
    key: string;
    basePath: string;
    ops: OperationMap;
    locale: boolean;
    orgPrefix: boolean;
};

/**
 * Header name for SFCC Session ID.
 */
const DWSID_HEADER = 'sfdc_dwsid';

/**
 * Get the SLAS client secret from environment variable.
 * Only returns the secret on the server - client secrets must never reach client code.
 */
const getSlasClientSecret = (): string | undefined => {
    // Only access process.env on the server to avoid "process is not defined" on client
    if (typeof window !== 'undefined') {
        return undefined;
    }
    return process.env.COMMERCE_API_SLAS_SECRET;
};

/**
 * Create Commerce API clients with authentication middleware.
 * API requests always target the B2C Commerce API endpoints directly (server-side).
 * All SCAPI calls flow through React Router loaders, actions, and resource routes.
 * @param context - React Router context provider
 * @returns Configured commerce API clients
 */
export function createApiClients(context: RouterContextProvider | Readonly<RouterContextProvider>): AppClients {
    const appOrigin = getAppOrigin();
    const config = getConfig<AppConfig>(context);
    const { shortCode, callback, organizationId, clientId } = config.commerce.api;

    // Site ID is always resolved by site context middleware
    const siteCtx = context.get(siteContext);
    if (!siteCtx?.site?.id) {
        throw new Error('Site context not initialized. Ensure site context middleware is configured.');
    }
    const siteId = siteCtx.site.id;
    const scapiProxyHost = typeof window === 'undefined' ? process.env.SCAPI_PROXY_HOST : undefined;

    const baseUrl = scapiProxyHost || getScapiBaseUrl(shortCode);
    // Use absolute URL if provided, otherwise construct from app origin
    const redirectUri = callback && isAbsoluteURL(callback) ? callback : `${appOrigin}${callback || ''}`;

    // Get current locale from i18next context
    const { i18next } = getTranslation(context);
    const locale = i18next.language ?? config.i18n.fallbackLng;

    const onAuthTokenInvalid = () => {
        try {
            const authStorage = context.get(authStorageContext);
            if (authStorage && !authStorage.has('error')) {
                authStorage.set('error', AUTH_TOKEN_INVALID_ERROR);
            }
        } catch {
            // Intentionally ignore if auth storage is unavailable (client-side)
        }
    };

    // Note: Currency is NOT passed as a global parameter because not all Shopper* APIs support it.
    // Each caller should read currency from context and pass it in their specific API calls.
    const clients = createCommerceApiClients({
        baseUrl,
        organizationId,
        siteId,
        locale,
        clientId,
        clientSecret: getSlasClientSecret(),
        redirectUri,
        onAuthTokenInvalid,
        proxyHost: scapiProxyHost, // SDK handles org ID rewriting and auth flow selection internally
    } as Parameters<typeof createCommerceApiClients>[0]);

    // Add authentication middleware - inject Bearer token and sfdc_dwsid from auth context
    const authMiddleware: Middleware = {
        async onRequest({ request }) {
            const url = new URL(request.url);
            const isSlasAuthEndpoint = SLAS_AUTH_ENDPOINTS.some((path) => url.pathname.includes(path));

            // Get the auth session from context
            const authPromise = context.get(authContext);
            const session = await authPromise.ref;

            // Inject sfdc_dwsid when available:
            // - For SCAPI endpoints: always send it (maintains app-server affinity)
            // - For SLAS refresh_token calls: send it (reuses existing bridged session)
            // - For other SLAS calls (login, guest, social, passwordless): skip it
            //   so SLAS issues a fresh session-bridged dwsid for the new auth state
            if (session?.dwsid) {
                if (!isSlasAuthEndpoint) {
                    request.headers.set(DWSID_HEADER, session.dwsid);
                } else {
                    // For SLAS token endpoint, only send dwsid for refresh_token grant
                    const clonedRequest = request.clone();
                    const bodyText = await clonedRequest.text();
                    const params = new URLSearchParams(bodyText);
                    if (params.get('grant_type') === 'refresh_token') {
                        request.headers.set(DWSID_HEADER, session.dwsid);
                    }
                }
            }

            // SLAS auth endpoints handle their own Authorization header (Basic auth or PKCE)
            if (!isSlasAuthEndpoint) {
                if (!session) {
                    throw new Error('No session found');
                }
                request.headers.set('Authorization', `Bearer ${session.accessToken}`);
            }

            return request;
        },
    };

    // Provide compatibility with (previously) proxied requests and identify the source of requests
    // to SCAPI
    const identifyingHeadersMiddleware: Middleware = {
        onRequest({ request }) {
            request.headers.set('x-mobify', 'true');
            return request;
        },
    };

    const correlationMiddleware: Middleware = {
        onRequest({ request }) {
            const correlationId = context.get(correlationContext);
            if (correlationId) {
                // see https://developer.salesforce.com/docs/commerce/commerce-api/guide/scapi-logs-request-tracking.html
                request.headers.set('correlation-id', correlationId);
            }
            return request;
        },
    };

    /**
     * Middleware to ensure that at least one SCAPI call per route request detects maintenance mode from API responses.
     * It keeps track of all SCAPI requests running until the first response is received.
     */
    const requestMap = new Map<Request, [(...args: unknown[]) => void, (reason?: unknown) => void]>();
    const maintenanceMiddleware: Middleware = {
        onRequest({ request }) {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            let requestResolver: (...args: unknown[]) => void = () => {};
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            let requestRejecter: (reason?: unknown) => void = () => {};
            const promise = new Promise((resolve, reject) => {
                requestResolver = resolve;
                requestRejecter = reject;
            });
            requestMap.set(request, [requestResolver, requestRejecter]);

            const maintenance = context.get(maintenanceContext);
            void maintenance.set(request, promise);
            return request;
        },
        onResponse({ request, response }) {
            const maintenanceHeader = response.headers.get('sfdc_maintenance');
            const maintenance = context.get(maintenanceContext);
            const [requestResolver, requestRejecter] = requestMap.get(request) ?? [];

            if (maintenance.gate(request) && (maintenanceHeader === 'system' || maintenanceHeader === 'site')) {
                // This will be handled by the middleware, which is waiting for the first promise to resolve
                requestRejecter?.(new Response('Maintenance', { status: 503 }));
            } else {
                requestResolver?.(response);
            }

            requestMap.delete(request);
            return response;
        },
    };

    /**
     * Logging middleware for SCAPI fetch requests.
     *
     * Logs all outgoing SCAPI requests on response with method, URL, status, and duration.
     * - Success responses (< 400): logged at `debug` level
     * - Error responses (>= 400): logged at `error` level
     * - Server-side only
     *
     * @example
     * ```
     * [13:21:24.337] DEBUG: fetch GET /search/shopper-search/v1/.../product-search?q=shoes
     *     status: 200
     *     duration: 1280
     * ```
     */
    const requestTimings = new WeakMap<Request, number>();
    const loggingMiddleware: Middleware = {
        onRequest({ request }) {
            requestTimings.set(request, performance.now());
            return request;
        },
        onResponse({ request, response }) {
            const logger = getLogger(context);
            const url = new URL(request.url);
            const startTime = requestTimings.get(request);
            const duration = startTime != null ? Math.round(performance.now() - startTime) : undefined;
            const metadata: Record<string, unknown> = {
                status: response.status,
                ...(duration != null && { duration }),
            };
            const message = `fetch ${request.method} ${url.pathname}`;
            if (response.status >= 400) {
                logger.error(message, metadata);
            } else {
                logger.debug(message, metadata);
            }
            return response;
        },
    };

    // Create custom clients from the declarative registry (see src/scapi/custom-clients.ts)
    const globalParams = { organizationId, siteId, locale };
    const globalParamsWithoutLocale = { organizationId, siteId };
    const clientOptions = { querySerializer: defaultQuerySerializer };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customClientEntries: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customClientList: any[] = [];
    for (const {
        key,
        basePath,
        ops,
        locale: supportsLocale,
        orgPrefix,
    } of customClients as CustomClientConfigEntry[]) {
        const orgPath = orgPrefix ? `/organizations/${organizationId}` : '';
        const c = createClient(
            createOpenApiFetchClient({ baseUrl: `${baseUrl}${basePath}${orgPath}`, ...clientOptions }),
            ops,
            supportsLocale ? globalParams : globalParamsWithoutLocale,
            { onAuthTokenInvalid }
        );
        customClientEntries[key] = c;
        customClientList.push(c);
    }

    // Apply middleware to all clients (base SDK clients + custom clients)
    const applyToAllClients = (mw: Middleware) => {
        clients.use(mw);
        customClientList.forEach((c) => c.use(mw));
    };

    // Middleware registration order matters: openapi-fetch runs onRequest in registration
    // order, but onResponse in reverse order. Logging is registered first so its onResponse
    // runs last, after all other middleware have processed the request/response.
    if (typeof window === 'undefined') {
        applyToAllClients(loggingMiddleware);
    }
    applyToAllClients(correlationMiddleware);
    applyToAllClients(authMiddleware);
    applyToAllClients(identifyingHeadersMiddleware);
    // We only detect the maintenance mode from the server, where we actually get data
    // We currently don't do it from client data access, which will require a client router middleware
    // Client calls to SCAPI should be rare (basket?), and often shadowed by server calls regarding maintenance
    if (typeof window === 'undefined') {
        applyToAllClients(maintenanceMiddleware);
    }

    const appClients = { ...clients, ...customClientEntries, use: applyToAllClients } as AppClients;

    // Apply context-registered SCAPI middleware factories
    const scapiMiddlewares = context.get(scapiMiddlewareContext);

    for (const entry of scapiMiddlewares) {
        const middleware = entry.factory(context, appClients);
        if (!middleware) continue;

        if (entry.clients) {
            for (const clientName of entry.clients) {
                clients[clientName].use(middleware);
            }
        } else {
            applyToAllClients(middleware);
        }
    }

    return appClients;
}
