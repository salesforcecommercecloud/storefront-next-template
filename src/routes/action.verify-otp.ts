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
import { createApiClients } from '@/lib/api-clients.server';
import { getAuth, updateAuth } from '@/middlewares/auth.server';
import { calculateBasket, getBasketCurrency, mergeBasket } from '@/lib/api/basket.server';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { trackingConsentToBoolean } from '@/types/tracking-consent';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { extractErrorMessage } from '@/lib/auth-error-handler';
import { getLogger } from '@/lib/logger.server';

/**
 * Server action to verify OTP code and authenticate the user
 * This is called when the user submits the OTP code from the modal
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);

    try {
        const formData = await request.formData();
        const otpCode = formData.get('otpCode')?.toString();
        const email = formData.get('email')?.toString();

        if (!otpCode) {
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'OTP code is required' }),
                },
                { status: 400 }
            );
        }

        if (!email) {
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'Email is required' }),
                },
                { status: 400 }
            );
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

        // Merge basket after authentication, then recalculate so registered-only promotions
        // and totals match the authenticated shopper (avoids checkout vs order mismatch).
        let mergedBasket: Awaited<ReturnType<typeof mergeBasket>> | undefined;
        try {
            mergedBasket = await mergeBasket(context);
        } catch (error) {
            mergedBasket = undefined;
            logger.error('VerifyOtp: basket merge failed', { error });
        }

        if (mergedBasket) {
            updateBasketResource(context, mergedBasket);
        }

        try {
            const { current } = await getBasket(context);
            if (current?.basketId) {
                const currency = getBasketCurrency(context, current);
                const recalculatedBasket = await calculateBasket(context, current.basketId, currency);
                updateBasketResource(context, recalculatedBasket);
            }
        } catch (error) {
            logger.error('VerifyOtp: basket recalculation after authentication failed', { error });
        }

        logger.info('VerifyOtp: succeeded');
        return Response.json({
            success: true,
            message: 'Login successful',
            tokenResponse,
        });
    } catch (error: unknown) {
        logger.error('VerifyOtp: failed', { error });
        const errorMessage = extractErrorMessage(error);
        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.OPERATION_FAILED, message: errorMessage }),
            },
            { status: 500 }
        );
    }
}
