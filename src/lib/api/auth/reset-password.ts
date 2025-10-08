import type { ActionFunctionArgs } from 'react-router';
import { flashAuth } from '@/middlewares/auth.server';
import { extractResponseError, stringToBase64, getAppOrigin } from '@/lib/utils';
import createClient from '@/lib/scapi';

export const getPasswordResetToken = async (
    context: ActionFunctionArgs['context'],
    parameters: {
        email: string;
    }
): Promise<{
    success: boolean;
    error?: string;
}> => {
    try {
        const slasClient = await createClient(context).ShopperLogin.getInstance();
        const callbackURI = `${getAppOrigin()}/reset-password-callback`;
        const options = {
            headers: {
                Authorization: '',
            },
            body: {
                user_id: parameters.email,
                mode: 'callback',
                channel_id: slasClient.clientConfig.parameters.siteId,
                client_id: slasClient.clientConfig.parameters.clientId,
                callback_uri: callbackURI,
                hint: 'cross_device',
            },
        };

        // Only set authorization header if using private client
        const clientSecret = import.meta.env.VITE_COMMERCE_API_SLAS_SECRET;
        if (clientSecret) {
            options.headers.Authorization = `Basic ${stringToBase64(
                `${slasClient.clientConfig.parameters.clientId}:${clientSecret}`
            )}`;
        }

        await slasClient.getPasswordResetToken(options);

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
