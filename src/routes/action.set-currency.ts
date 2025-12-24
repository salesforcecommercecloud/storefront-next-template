import { data, type ActionFunction } from 'react-router';
import { getConfig } from '@/config';
import { updateCurrency } from '@/middlewares/currency.server';

/**
 * Server action to set the currency cookie
 *
 * This action is called when the user manually selects a currency from the currency selector.
 * It validates the currency and sets it in a cookie, which will be read by the root loader.
 *
 * Note: This MUST be a server action (not clientAction) because we need to set
 * the Set-Cookie HTTP header, which can only be done server-side.
 */

export const action: ActionFunction = async ({ request, context }) => {
    const formData = await request.formData();
    const currency = formData.get('currency') as string;

    if (!currency) {
        throw new Response('Currency is required', { status: 400 });
    }

    const config = getConfig(context);

    // Validate currency
    if (!config.site.supportedCurrencies.includes(currency)) {
        throw new Response(`Currency "${currency}" is not supported`, { status: 400 });
    }

    // Update currency storage (like updateAuth pattern)
    updateCurrency(context, currency);

    // Return simple success response
    return data({ success: true });
};
