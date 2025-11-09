import type { ActionFunctionArgs } from 'react-router';
import type { ShopperLoginTypes } from 'commerce-sdk-isomorphic';
import type { CustomQueryParameters } from '@/lib/api/types';
import { flashAuth, updateAuth, loginRegisteredUser as authLoginRegisteredUser } from '@/middlewares/auth.server';
import uiStrings from '@/temp-ui-string';

export const loginRegisteredUser = async (
    context: ActionFunctionArgs['context'],
    credentials: { email: string; password: string },
    customParameters?: CustomQueryParameters
): Promise<{
    success: boolean;
    error?: string;
}> => {
    try {
        const tokenResponse: ShopperLoginTypes.TokenResponse = await authLoginRegisteredUser(
            context,
            credentials.email,
            credentials.password,
            {
                customParameters,
            }
        );
        // Update session with user tokens and info
        updateAuth(context, tokenResponse);
        updateAuth(context, (session) => ({
            ...session,
            userType: 'registered',
        }));

        return {
            success: true,
        };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Standard Login] Login error:', error);

        // Capture more detailed error information for debugging
        const errorDetails = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.error('[Standard Login] Error details:', errorDetails);

        const errorMessage = uiStrings.errors.loginFailed;

        flashAuth(context, errorMessage);

        return {
            success: false,
            error: errorMessage,
            errorDetails, // Include detailed error for debugging
        };
    }
};
