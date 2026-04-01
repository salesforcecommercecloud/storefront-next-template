/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { data, type ActionFunction } from 'react-router';
import { updateCurrency } from '@/middlewares/currency.server';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { getLogger } from '@/lib/logger.server';

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
    const logger = getLogger(context);
    const formData = await request.formData();
    const currency = formData.get('currency') as string;

    logger.debug('SetCurrency: starting', { currency });

    if (!currency) {
        logger.warn('SetCurrency: currency parameter missing');
        throw new Response('Currency is required', { status: 400 });
    }

    const currentSite = (context.get(siteContext) as SiteContext).site;
    // Validate currency
    if (!currentSite.supportedCurrencies.includes(currency)) {
        logger.warn('SetCurrency: unsupported currency', {
            currency,
            supportedCurrencies: currentSite.supportedCurrencies,
        });
        throw new Response(`Currency "${currency}" is not supported`, { status: 400 });
    }

    // Update currency storage (like updateAuth pattern)
    updateCurrency(context, currency);

    logger.info('SetCurrency: succeeded', { currency });
    // Return simple success response
    return data({ success: true });
};
