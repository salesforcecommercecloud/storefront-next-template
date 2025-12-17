import type { RouterContextProvider } from 'react-router';
import {
    createCommerceApiClients,
    SLAS_AUTH_ENDPOINTS,
    type Middleware,
} from '@salesforce/storefront-next-runtime/scapi';
import { authContext } from '@/middlewares/auth.utils';
import { getConfig } from '@/config';
import { getAppOrigin } from '@/lib/utils';
import { getTranslation } from '@/lib/i18next';

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
    const redirectUri = `${appOrigin}${callback}`;

    // Get current locale from i18next (already in SCAPI format like en-US, es-MX)
    const { i18next } = getTranslation(context);
    const locale = i18next.language ?? config.i18n.fallbackLng;

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
            request.headers.set('Authorization', `Bearer ${session.access_token}`);
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

    clients.use(authMiddleware);
    clients.use(identifyingHeadersMiddleware);

    return clients;
}
