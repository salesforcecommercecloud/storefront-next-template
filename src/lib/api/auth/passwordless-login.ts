import type { ActionFunctionArgs } from 'react-router';
import { helpers } from 'commerce-sdk-isomorphic';
import { flashAuth, getAuth } from '@/middlewares/auth.server';
import createClient from '@/lib/scapi';
import { extractResponseError, getAppOrigin } from '@/lib/utils';

// Passwordless requires slas to be private
export const authorizePasswordless = async (
    context: ActionFunctionArgs['context'],
    parameters: {
        userid: string;
        callbackURI?: string;
    }
): Promise<{
    success: boolean;
    error?: string;
}> => {
    try {
        const session = getAuth(context);
        const slasClient = await createClient(context).ShopperLogin.getInstance();
        const userid = parameters.userid;
        const callbackURI = parameters.callbackURI || `${getAppOrigin()}/passwordless-login-callback`;
        const usid = session.usid;
        const mode = callbackURI ? 'callback' : 'sms';

        const res = await helpers.authorizePasswordless({
            slasClient,
            credentials: {
                clientSecret: import.meta.env.VITE_COMMERCE_API_SLAS_SECRET,
            },
            parameters: {
                ...(callbackURI && { callbackURI }),
                ...(usid && { usid }),
                userid,
                mode,
            },
        });

        if (res && res.status !== 200) {
            const errorData = await res.json();
            throw new Error(`${res.status} ${String(errorData.message)}`);
        }

        return {
            success: true,
        };
    } catch (error) {
        const { responseMessage } = await extractResponseError(error);

        flashAuth(context, responseMessage);

        return {
            success: false,
            error: responseMessage,
        };
    }
};
