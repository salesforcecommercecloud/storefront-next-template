/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { data, type ActionFunction } from 'react-router';
import { localeCookie } from '@/middlewares/i18next.server';

/**
 * Server action to set the locale cookie
 * This ensures the cookie is properly serialized using the same cookie object
 * that the server middleware uses to parse it
 *
 * Note: This MUST be a server action (not clientAction) because we need to set
 * the Set-Cookie HTTP header, which can only be done server-side.
 */
// eslint-disable-next-line custom/no-server-actions
export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();
    const locale = formData.get('locale') as string;

    if (!locale) {
        throw new Response('Locale is required', { status: 400 });
    }

    // Set the cookie using the same cookie object that the middleware uses
    const cookieHeader = await localeCookie.serialize(locale);

    // Return success without redirecting (useFetcher expects a response)
    return data(
        { success: true },
        {
            headers: {
                'Set-Cookie': cookieHeader,
            },
        }
    );
};
