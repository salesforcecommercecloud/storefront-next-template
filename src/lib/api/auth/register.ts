import type { ActionFunctionArgs } from 'react-router';
import type { ShopperCustomersTypes } from 'commerce-sdk-isomorphic';
import type { CustomQueryParameters } from '@/lib/api/types';
import { createApiClients } from '@/lib/api-clients';
import { loginRegisteredUser } from './standard-login';
import { getTranslation } from '@/lib/i18next';

// Helper to extract custom parameters (keys starting with c_ with allowed value types)
const extractCustomParameters = (parameters: {
    [key: string]: string | number | boolean | string[] | number[];
}): CustomQueryParameters => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { customer, password, ...customParams } = parameters;
    return customParams;
};

export const registerCustomer = async (
    context: ActionFunctionArgs['context'],
    registrationData: ShopperCustomersTypes.CustomerRegistration
): Promise<{
    success: boolean;
    error?: string;
}> => {
    const { t } = getTranslation(context);

    try {
        const { customer, password, ...parameters } = registrationData;
        const { login, firstName, lastName } = customer;
        const customParameters = extractCustomParameters(parameters);

        if (!login || !firstName || !lastName) {
            throw new Error(t('errors:missingRegistrationField'));
        }

        // The registerCustomer endpoint currently does not support custom parameters
        // so we make sure not to send any custom params here
        const clients = createApiClients(context);
        await clients.shopperCustomers.registerCustomer({
            params: {},
            body: {
                customer,
                password,
            },
        });

        // After registration, log the user in automatically
        const loginResult = await loginRegisteredUser(
            context,
            {
                email: login,
                password,
            },
            customParameters
        );

        if (loginResult.success) {
            return {
                success: true,
            };
        } else {
            // Login after registration failed
            throw new Error(t('errors:autoLoginAfterRegistrationFailed'));
        }
    } catch {
        const errorMessage = t('errors:genericTryAgain');

        return {
            success: false,
            error: errorMessage,
        };
    }
};
