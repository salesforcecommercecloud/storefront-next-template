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
import { authorizePasswordless } from '@/middlewares/auth.server';
import { getPasswordlessErrorMessageKey, extractErrorMessage } from '@/lib/auth-error-handler';
import { getTranslation } from '@/lib/i18next';
import { getLogger } from '@/lib/logger.server';

export type AuthorizePasswordlessEmailResponse = {
    success: boolean;
    error?: string;
    email?: string;
};

/**
 * Server action to send OTP for passwordless login (mode=email).
 * Called when the shopper tabs or clicks out of the email field at checkout contact step.
 * Uses passwordless authorize with mode from config (email); does not register a customer.
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<AuthorizePasswordlessEmailResponse> {
    const logger = getLogger(context);
    const { t } = getTranslation();

    if (request.method !== 'POST') {
        return { success: false, error: t('errors:api.methodNotAllowed') };
    }

    try {
        const formData = await request.formData();
        const email = formData.get('email')?.toString()?.trim();

        if (!email) {
            return {
                success: false,
                error: t('errors:customer.emailRequired'),
            };
        }

        await authorizePasswordless(context, { userid: email });

        logger.info('AuthorizePasswordlessEmail: OTP sent');
        return { success: true, email };
    } catch (error) {
        logger.error('AuthorizePasswordlessEmail: failed', { error });
        const errorMessage = extractErrorMessage(error);
        const errorKey = getPasswordlessErrorMessageKey(errorMessage);
        return {
            success: false,
            error: t(errorKey),
        };
    }
}
