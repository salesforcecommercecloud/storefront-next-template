import type { RouterContextProvider } from 'react-router';
import {
    createCommerceApiClients,
    SLAS_AUTH_ENDPOINTS,
    type Middleware,
} from '@salesforce/storefront-next-runtime/scapi';
import { authContext } from '@/middlewares/auth.utils';
import { getConfig } from '@/config';
import { getAppOrigin } from '@/lib/utils';

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
 * Create Commerce API clients with authentication middleware
 *
 * @param context - React Router context provider
 * @returns Configured commerce API clients
 */
export function createApiClients(context: RouterContextProvider | Readonly<RouterContextProvider>) {
    const config = getConfig(context);
    const baseUrl = `${getAppOrigin()}${config.commerce.api.proxy}`;
    const redirectUri = `${getAppOrigin()}${config.commerce.api.callback}`;

    const clients = createCommerceApiClients({
        baseUrl,
        organizationId: config.commerce.api.organizationId,
        siteId: config.commerce.api.siteId,
        clientId: config.commerce.api.clientId,
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

    clients.use(authMiddleware);

    return clients;
}
