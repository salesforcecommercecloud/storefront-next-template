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
import { createApiClients } from '@/lib/api-clients';
import { getAuth, updateAuth } from '@/middlewares/auth.server';
import { mergeBasket } from '@/lib/api/basket';
import { getTranslation } from '@/lib/i18next';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { trackingConsentToBoolean } from '@/types/tracking-consent';
import type { ShopperLogin } from '@salesforce/storefront-next-runtime/scapi';

type VerifyOtpResponse = {
    success: boolean;
    message?: string;
    error?: string;
    tokenResponse?: ShopperLogin.schemas['TokenResponse'];
};

/**
 * Server action to verify OTP code and authenticate the user
 * This is called when the user submits the OTP code from the modal
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<VerifyOtpResponse> {
    const { t } = getTranslation();

    try {
        const formData = await request.formData();
        const otpCode = formData.get('otpCode')?.toString();
        const email = formData.get('email')?.toString();

        if (!otpCode) {
            return {
                success: false,
                error: t('checkout:passwordlessLogin.otpRequired'),
            };
        }

        if (!email) {
            return {
                success: false,
                error: t('errors:customer.emailRequired'),
            };
        }

        const clients = createApiClients(context);
        const session = getAuth(context);
        const usid = session.usid;

        let dnt: boolean | undefined;
        if (isTrackingConsentEnabled(context) && session.trackingConsent) {
            dnt = trackingConsentToBoolean(session.trackingConsent);
        }

        const tokenResponse = await clients.auth.passwordless.exchangeToken({
            pwdlessLoginToken: otpCode,
            usid: usid ? String(usid) : undefined,
            ...(dnt !== undefined && { dnt }),
        });

        // Update auth with token response directly
        updateAuth(context, tokenResponse);

        // Update userType separately - expiry times are preserved by updateAuthStorageData
        // The refresh token expiry was already calculated, so we just need to set userType
        updateAuth(context, (authSession) => ({
            ...authSession,
            userType: 'registered',
        }));

        // Merge basket after authentication
        // Note: mergeBasket already updates the basket on the server via API
        // The client-side basket will be refreshed when the page reloads
        try {
            await mergeBasket(context);
        } catch (error) {
            // user can still access their registered basket
            // eslint-disable-next-line no-console
            console.error('[OTP Login] Failed to merge basket:', error);
        }

        return {
            success: true,
            message: t('checkout:passwordlessLogin.loginSuccess'),
            tokenResponse,
        };
    } catch (error) {
        let errorMessage = t('checkout:passwordlessLogin.invalidOtp');

        // Try to extract the actual error message from the API response
        if (error && typeof error === 'object') {
            // Check if it's an ApiError with rawBody (priority check)
            if ('rawBody' in error && typeof error.rawBody === 'string') {
                try {
                    const parsed = JSON.parse(error.rawBody);
                    if (parsed.message && typeof parsed.message === 'string') {
                        errorMessage = parsed.message;
                    }
                } catch (parseError) {
                    // eslint-disable-next-line no-console
                    console.error('[OTP Verification] Failed to parse rawBody:', parseError);
                }
            }
            // Only check message if we didn't find rawBody
            else if ('message' in error && typeof error.message === 'string') {
                const msg = error.message;

                // Try to parse message as JSON
                try {
                    const parsed = JSON.parse(msg);
                    if (parsed.message && typeof parsed.message === 'string') {
                        errorMessage = parsed.message;
                    }
                } catch {
                    // Not JSON, use the message as-is
                    errorMessage = msg;
                }
            }
        }

        return {
            success: false,
            error: errorMessage,
        };
    }
}
