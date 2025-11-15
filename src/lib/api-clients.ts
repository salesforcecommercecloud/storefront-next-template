import type { RouterContextProvider } from 'react-router';
import { createCommerceApiClients, type Middleware } from '@salesforce/storefront-next-runtime/scapi';
import { authContext } from '@/middlewares/auth.utils';
import { getConfig } from '@/config';
import { getAppOrigin } from '@/lib/utils';

/**
 * Create Commerce API clients with authentication middleware
 *
 * @param context - React Router context provider
 * @returns Configured commerce API clients
 */
export function createApiClients(context: RouterContextProvider | Readonly<RouterContextProvider>) {
    const config = getConfig(context);
    const baseUrl = `${getAppOrigin()}${config.commerce.api.proxy}`;

    const clients = createCommerceApiClients({
        baseUrl,
    });

    // Add authentication middleware - inject Bearer token from auth context
    const authMiddleware: Middleware = {
        async onRequest({ request }) {
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
