import { type ActionFunctionArgs, type ClientActionFunctionArgs, redirect } from 'react-router';
import { destroyAuth as destroyAuthServer, getAuth } from '@/middlewares/auth.server';
import { destroyAuth as destroyAuthClient } from '@/middlewares/auth.client';
import { destroyBasket } from '@/middlewares/basket.client';
import createClient from '@/lib/scapi';

/**
 * This server action is required for authentication, because logout must be handled server-side to properly invalidate
 * server-side sessions and integrate with Salesforce Commerce Cloud's authentication system. It operates together with
 * the client action to ensure a smooth logout process.
 */
// eslint-disable-next-line custom/no-server-actions
export async function action({ context }: ActionFunctionArgs) {
    const session = getAuth(context);
    const { access_token, refresh_token } = session;
    if (access_token && refresh_token) {
        try {
            const { helpers } = await import('commerce-sdk-isomorphic');
            const slasClient = await createClient(context).ShopperLogin.getInstance();
            await helpers.logout({
                slasClient,
                parameters: { accessToken: access_token, refreshToken: refresh_token },
            });
        } catch {
            // SLAS logout failed, but continue with redirect
        }
    }
    destroyAuthServer(context);
}

/**
 * This client action operates together with the server action to ensure a smooth logout process. It ensures that the
 * session gets destroyed on both server and client side, clears the basket to prevent customer mismatch errors,
 * and redirects the user to the home page afterward.
 */
export async function clientAction({ context, serverAction }: ClientActionFunctionArgs) {
    await serverAction();
    destroyAuthClient(context);
    destroyBasket(context);

    return redirect('/');
}

clientAction.hydrate = true as const;
