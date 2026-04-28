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
import type { ActionFunctionArgs } from 'react-router';
import type { ShopperLogin } from '@salesforce/storefront-next-runtime/scapi';
import type { CustomQueryParameters } from '@/lib/api/types';
import { updateAuth, loginRegisteredUser as authLoginRegisteredUser } from '@/middlewares/auth.server';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { getLogger } from '@/lib/logger.server';

export const loginRegisteredUser = async (
    context: ActionFunctionArgs['context'],
    credentials: { email: string; password: string },
    customParameters?: CustomQueryParameters
): Promise<{
    success: boolean;
    error?: string;
    errorDetails?: string;
}> => {
    const logger = getLogger(context);
    const { t } = getTranslation(context);

    try {
        const tokenResponse: ShopperLogin.schemas['TokenResponse'] = await authLoginRegisteredUser(
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

        logger.info('StandardLogin: succeeded');
        return {
            success: true,
        };
    } catch (error) {
        const errorDetails = error instanceof Error ? error.message : String(error);
        logger.error('StandardLogin: failed', { error });

        const errorMessage = t('errors:loginFailed');
        return {
            success: false,
            error: errorMessage,
            errorDetails, // Include detailed error for debugging
        };
    }
};
