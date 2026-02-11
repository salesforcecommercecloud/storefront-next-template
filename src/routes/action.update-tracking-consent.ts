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
import { refreshAccessToken, getAuth, updateAuth } from '@/middlewares/auth.server';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { TrackingConsent } from '@/types/tracking-consent';

/**
 * Server action to update tracking consent (DNT - Do Not Track) preference.
 *
 * This action refreshes the SLAS access token with the new tracking consent value,
 * which embeds the DNT preference in the token. The auth middleware then sets
 * the updated cookies via Set-Cookie headers.
 *
 * Note: This MUST be a server action (not clientAction) because:
 * 1. We need access to the refresh token from server-side auth context
 * 2. We need to set Set-Cookie HTTP headers, which can only be done server-side
 */
export const action: ActionFunction = async ({ request, context }) => {
    // Verify tracking consent feature is enabled
    if (!isTrackingConsentEnabled(context)) {
        throw new Response('Tracking consent feature is not enabled', { status: 400 });
    }

    const formData = await request.formData();
    const trackingConsentValue = formData.get('trackingConsent');

    // Validate tracking consent value is a valid enum value
    if (!trackingConsentValue || !Object.values(TrackingConsent).includes(trackingConsentValue as TrackingConsent)) {
        throw new Response('Invalid tracking consent value. Must be "0" (accepted) or "1" (declined)', { status: 400 });
    }

    const trackingConsent = trackingConsentValue as TrackingConsent;

    // Get current auth to retrieve refresh token
    const currentAuth = getAuth(context);
    const refreshToken = currentAuth.refreshToken;

    if (!refreshToken) {
        throw new Response('No refresh token available. User must be authenticated.', { status: 401 });
    }

    const userType: 'guest' | 'registered' = currentAuth.userType || 'guest';

    // Refresh token with the new tracking consent value
    const tokenResponse = await refreshAccessToken(context, refreshToken, {
        trackingConsent,
    });

    // Update the auth context with the new token response
    updateAuth(context, tokenResponse);

    // Restore userType and set the new tracking consent value
    updateAuth(context, (session) => ({
        ...session,
        userType,
        trackingConsent,
    }));

    return data({ success: true, trackingConsent });
};
