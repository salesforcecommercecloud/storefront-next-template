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
    SLAS_AUTH_ENDPOINTS,
    type Middleware,
} from '@salesforce/storefront-next-runtime/scapi';
import { authContext } from '@/middlewares/auth.utils';
import { correlationContext } from '@/lib/correlation';
import { maintenanceContext } from '@/lib/maintenance';
import { getConfig } from '@/config';
import { getAppOrigin, isAbsoluteURL } from '@/lib/utils';
import { getTranslation } from '@/lib/i18next';

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
 * Identifier for a Maintenance error.
 */
export const MAINTENANCE_ERROR = 'MAINTENANCE_ERROR';

/**
 * Create Commerce API clients with authentication middleware.
 * On the server in production, API requests will directly target the B2C Commerce API endpoints to saves an extra hop.
 * On the server in development, and generally on the client, API requests will be proxied through the MRT proxy to
 * either become visible in the dev tooling or to prevent CORS issues.
 * @param context - React Router context provider
 * @returns Configured commerce API clients
 */
export function createApiClients(context: RouterContextProvider | Readonly<RouterContextProvider>) {
    const appOrigin = getAppOrigin();
    const config = getConfig(context);
    const { shortCode, proxy, callback, organizationId, siteId, clientId } = config.commerce.api;
    // @ts-expect-error: __DEV__ is a global variable existing to support dead code elimination
    const baseUrl = __DEV__
        ? `${appOrigin}${proxy}`
        : typeof window === 'undefined'
          ? `https://${shortCode}.api.commercecloud.salesforce.com`
          : `${appOrigin}${proxy}`;
    // Use absolute URL if provided, otherwise construct from app origin
    const redirectUri = callback && isAbsoluteURL(callback) ? callback : `${appOrigin}${callback || ''}`;

    // Get current locale from i18next context
    const { i18next } = getTranslation(context);
    const locale = i18next.language ?? config.i18n.fallbackLng;

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
    });

    // Add authentication middleware - inject Bearer token from auth context
    const authMiddleware: Middleware = {
        async onRequest({ request }) {
            // Skip auth header injection for SLAS auth endpoints
            // These endpoints handle their own auth (Basic auth or no auth for PKCE)
            const url = new URL(request.url);
            const isSlasAuthEndpoint = SLAS_AUTH_ENDPOINTS.some((path) => url.pathname.includes(path));
            if (isSlasAuthEndpoint) {
                return request;
            }

            // Get the auth session from context
            const authPromise = context.get(authContext);
            const session = await authPromise.ref;
            if (!session) {
                throw new Error('No session found');
            }
            request.headers.set('Authorization', `Bearer ${session.accessToken}`);
            if (session.dwsid) {
                request.headers.set(DWSID_HEADER, session.dwsid);
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

    clients.use(correlationMiddleware);
    clients.use(authMiddleware);
    clients.use(identifyingHeadersMiddleware);
    // We only detect the maintenance mode from the server, where we actually get data
    // We currently don't do it from client data access, which will require a client router middleware
    // Client calls to SCAPI should be rare (basket?), and often shadowed by server calls regarding maintenance
    if (typeof window === 'undefined') {
        clients.use(maintenanceMiddleware);
    }
    return clients;
}
