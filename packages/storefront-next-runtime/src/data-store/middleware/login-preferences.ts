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

import type { RouterContextProvider } from 'react-router';
import { createDataStoreContext, createDataStoreMiddleware, prefixWithSiteId } from '../utils';

export type LoginPreferences = {
    emailVerificationEnabled?: boolean;
};

export const loginPreferencesContext = createDataStoreContext<LoginPreferences>();
const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;

/**
 * Read login preferences from router context.
 *
 * @param context - Router context provider
 * @returns Login preferences data stored by data-store middleware
 */
export function getLoginPreferences(context: Readonly<RouterContextProvider>): LoginPreferences {
    const data = context.get(loginPreferencesContext);
    if (!data) {
        // eslint-disable-next-line no-console
        console.warn(
            'Login preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.'
        );
        return {};
    }
    return data;
}

export const loginPreferencesMiddleware = createDataStoreMiddleware<LoginPreferences>({
    entryKey: prefixWithSiteId('login-preferences'),
    context: loginPreferencesContext,
    onUnavailable: DATA_STORE_UNAVAILABLE_MODE === 'fallback' ? 'fallback' : 'throw',
    fallbackValue: { emailVerificationEnabled: false },
    transform: (value) => value.data as LoginPreferences,
});
