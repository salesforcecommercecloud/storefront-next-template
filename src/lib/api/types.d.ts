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
import type { TrackingConsent } from '@/types/tracking-consent';

// TODO: (Re)move
export type SessionData = {
    access_token?: string;
    access_token_expiry?: number;
    refresh_token?: string;
    refresh_token_expiry?: number;

    customer_id?: string;
    userType?: 'guest' | 'registered';
    usid?: string;
    enc_user_id?: string;

    // social login - OAuth2 PKCE code verifier (server-side only, ephemeral)
    codeVerifier?: string;

    // IDP tokens (for social login)
    idp_access_token?: string;
    idp_access_token_expiry?: number;

    //hybrid
    dwsid?: string;

    /**
     * Tracking consent preference using TrackingConsent enum.
     * - TrackingConsent.Accepted ('0') = tracking allowed
     * - TrackingConsent.Declined ('1') = tracking declined
     * Optional - only present when tracking consent feature is enabled in config.
     * @optional
     */
    trackingConsent?: TrackingConsent;
};

/**
 * Public (non-sensitive) session data that can be safely exposed to the client.
 * This type is used for data that can be safely serialized and sent to the client.
 * It excludes sensitive fields like access_token, refresh_token, and codeVerifier.
 *
 * Derived from SessionData using Pick to ensure type safety - if the underlying
 * fields change in SessionData, PublicSessionData will automatically stay in sync.
 *
 * Used by:
 * - Root loader to return auth data to client components
 * - AuthProvider to provide user info context
 * - Components that need user info without access to tokens
 */
export type PublicSessionData = Pick<
    SessionData,
    'customer_id' | 'userType' | 'usid' | 'enc_user_id' | 'trackingConsent'
>;

export type CustomQueryParameters = {
    [key in `c_${string}`]: string | number | boolean | string[] | number[];
};
