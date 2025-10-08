import type { ActionFunctionArgs } from 'react-router';
import { helpers } from 'commerce-sdk-isomorphic';
import { flashAuth, getAuth, updateAuth } from '@/middlewares/auth.server';
import { extractResponseError, isSlasPrivate } from '@/lib/utils';
import uiStrings from '@/temp-ui-string';
import createClient from '@/lib/scapi';

export interface AuthorizeIDPParams {
    hint: string;
    redirectURI?: string;
    usid?: string;
}

export interface LoginIDPUserParams {
    code: string;
    redirectURI: string;
    usid?: string;
}

export const authorizeIDP = async (
    context: ActionFunctionArgs['context'],
    parameters: AuthorizeIDPParams
): Promise<{
    success: boolean;
    error?: string;
    redirectUrl?: string;
}> => {
    try {
        const session = getAuth(context);
        const slasClient = await createClient(context).ShopperLogin.getInstance();
        // SLAS will redirect to this URL after processing the social login
        const redirectURI = parameters.redirectURI || slasClient.clientConfig.parameters.redirectURI;
        const usid = parameters.usid || session.usid;

        const { url, codeVerifier } = await helpers.authorizeIDP({
            slasClient,
            parameters: {
                redirectURI,
                hint: parameters.hint,
                ...(usid && { usid }),
            },
        });

        // Store the code verifier in the session for later use
        updateAuth(context, (current) => ({
            ...current,
            codeVerifier,
        }));

        return {
            success: true,
            redirectUrl: url,
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

export const loginIDPUser = async (
    context: ActionFunctionArgs['context'],
    parameters: LoginIDPUserParams
): Promise<{
    success: boolean;
    error?: string;
}> => {
    try {
        const session = getAuth(context);
        const slasClient = await createClient(context).ShopperLogin.getInstance();
        const codeVerifier = session.codeVerifier;
        const code = parameters.code;
        const usid = parameters.usid || session.usid;

        if (!codeVerifier) {
            throw new Error(uiStrings.errors.codeVerifierMissing);
        }

        const res = await helpers.loginIDPUser({
            slasClient,
            credentials: {
                codeVerifier,
                ...(isSlasPrivate && {
                    clientSecret: import.meta.env.VITE_COMMERCE_API_SLAS_SECRET,
                }),
            },
            parameters: {
                redirectURI: parameters.redirectURI,
                code,
                ...(usid && { usid: String(usid) }),
            },
        });

        // Update session with user tokens and info (similar to standard login)
        updateAuth(context, res);
        updateAuth(context, (current) => {
            // Delete the code verifier once the user has logged in
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { codeVerifier: _, ...rest } = current;
            return {
                ...rest,
                userType: 'registered',
            };
        });

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
