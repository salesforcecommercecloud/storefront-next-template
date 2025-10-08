import type { ActionFunctionArgs, RouterContextProvider } from 'react-router';
import { extractResponseError } from '@/lib/utils';
import { refreshAccessToken, loginGuestUser, loginRegisteredUser } from '@/middlewares/auth.server';

interface RefreshTokenRequest {
    refreshToken: string;
}

interface LoginGuestRequest {
    usid?: string;
}

interface LoginRegisteredRequest {
    email: string;
    password: string;
    customParameters?: Record<string, unknown>;
}

type AuthHandler = (request: Request, context: Readonly<RouterContextProvider>) => Promise<unknown>;

/**
 * Map of auth operations to their handlers
 */
const authHandlers: Record<string, AuthHandler> = {
    'refresh-token': handleRefreshToken,
    'login-guest': handleLoginGuest,
    'login-registered': handleLoginRegistered,
} as const;

/**
 * Server-side auth resource action that handles individual SLAS operations requiring client secret
 * Supports operations via URL parameter: /resource/auth/login-guest, /resource/auth/refresh-token, etc.
 */
// eslint-disable-next-line custom/no-server-actions -- Resource routes are designed for server-side operations like authentication
export async function action({ request, params, context }: ActionFunctionArgs) {
    const operation = params.operation as string;

    try {
        const handler = authHandlers[operation];

        if (!handler) {
            return {
                success: false,
                error: `Unknown auth operation: ${operation}`,
            };
        }

        const data = await handler(request, context);
        return { success: true, data };
    } catch (error) {
        const { responseMessage } = await extractResponseError(error);
        return {
            success: false,
            error: responseMessage,
        };
    }
}

/**
 * Handle refresh token operation using auth functions
 */
async function handleRefreshToken(request: Request, context: Readonly<RouterContextProvider>) {
    const body: RefreshTokenRequest = await request.json();
    return await refreshAccessToken(context, body.refreshToken);
}

/**
 * Handle guest login operation using auth functions
 */
async function handleLoginGuest(request: Request, context: Readonly<RouterContextProvider>) {
    const body: LoginGuestRequest = await request.json();

    return await loginGuestUser(context, {
        usid: body.usid,
    });
}

/**
 * Handle registered user login operation using auth functions
 */
async function handleLoginRegistered(request: Request, context: Readonly<RouterContextProvider>) {
    const body: LoginRegisteredRequest = await request.json();

    return await loginRegisteredUser(context, body.email, body.password, {
        customParameters: body.customParameters,
    });
}
