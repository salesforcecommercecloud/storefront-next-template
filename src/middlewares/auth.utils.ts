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
import { createContext, type RouterContextProvider } from 'react-router';
import type { ShopperLogin } from '@salesforce/storefront-next-runtime/scapi';
import type { SessionData as AuthData, PublicSessionData } from '@/lib/api/types';
import {
    clearStorage,
    type StorageErrorData,
    type StorageMetaData,
    unpackStorage,
    updateStorageObject,
} from '@/lib/middleware';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { TrackingConsent, booleanToTrackingConsent } from '@/types/tracking-consent';

// Maximum allowed refresh token expiry times (in seconds) per Salesforce Commerce Cloud limits
export const MAX_GUEST_REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days
export const MAX_REGISTERED_REFRESH_TOKEN_EXPIRY = 90 * 24 * 60 * 60; // 90 days

// Cookie names for split auth storage
// These are used on both server and client for auth token management
export const COOKIE_REFRESH_TOKEN_GUEST = 'cc-nx-g'; // Guest user refresh token
export const COOKIE_REFRESH_TOKEN_REGISTERED = 'cc-nx'; // Registered user refresh token
export const COOKIE_ACCESS_TOKEN = 'cc-at'; // Access token
export const COOKIE_USID = 'usid'; // User session ID
export const COOKIE_CUSTOMER_ID = 'customerId'; // Customer ID
export const COOKIE_ENC_USER_ID = 'encUserId'; // Encoded user ID
export const COOKIE_IDP_ACCESS_TOKEN = 'cc-idp-at'; // IDP access token (for social login)
export const COOKIE_CODE_VERIFIER = 'cc-cv'; // OAuth2 PKCE code verifier (server-only, short-lived)
export const COOKIE_TRACKING_CONSENT = 'dw_dnt'; // Tracking consent preference (cookie value matches TrackingConsent enum)
export const COOKIE_DWSID = 'dwsid'; // Hybrid storefront session ID (for session bridge)
export const COOKIE_AUTH_RECOVERY_GUARD = 'cc-auth-recover'; // Auth recovery loop guard
export const AUTH_TOKEN_INVALID_ERROR = 'AUTH_TOKEN_INVALID';

/**
 * Check if tracking consent feature is enabled in the app configuration.
 * Reads config from context (server-side) or uses getConfig() (client-side).
 *
 * @param context - Optional router context (server loaders/actions only, omit for client-side)
 * @returns true if tracking consent is enabled, false otherwise
 *
 * @example
 * // Server-side with context
 * if (isTrackingConsentEnabled(context)) {
 *   // Handle tracking consent logic
 * }
 *
 * @example
 * // Client-side without context
 * if (isTrackingConsentEnabled()) {
 *   // Handle tracking consent logic
 * }
 */
export function isTrackingConsentEnabled(context?: Readonly<RouterContextProvider>): boolean {
    const appConfig = getConfig<AppConfig>(context);
    return appConfig.engagement?.analytics?.trackingConsent?.enabled ?? false;
}

/**
 * Extract public (non-sensitive) session data from full session data.
 *
 * This is the SINGLE AUDITED PLACE where the public auth shape is defined.
 * All code that needs to expose session data to the client should use this function
 * to ensure only non-sensitive fields are included.
 *
 * @param session - Full session data from server auth context
 * @returns PublicSessionData containing only non-sensitive fields safe for client exposure
 */
export function getPublicSessionData(session: AuthData): PublicSessionData {
    return {
        userType: session.userType,
        customerId: session.customerId,
        usid: session.usid,
        encUserId: session.encUserId,
        trackingConsent: session.trackingConsent,
    };
}

/**
 * Get refresh token expiry configuration for a specific user type.
 * Returns the final expiry time in seconds, either from environment variables or API response fallback.
 * If userType is not provided, returns the API response value.
 * Validates that overrides don't exceed Commerce Cloud maximum limits:
 * - Guest tokens: 30 days maximum
 * - Registered tokens: 90 days maximum
 *
 * @param apiResponseExpirySeconds - Refresh token expiry in seconds from the Commerce Cloud API response
 * @param userType - Optional user type ('guest' or 'registered') to determine which environment override to use
 * @param appConfig - Optional app config containing refresh token expiry overrides (server-side only)
 * @returns Final refresh token expiry time in seconds
 *
 * @example
 * // No userType provided - uses API response value
 * const expiry = getRefreshTokenExpiry(7776000);
 * // Result: 7776000 (90 days from API)
 *
 * @example
 * // Guest user with no environment override - uses API response
 * const expiry = getRefreshTokenExpiry(7776000, 'guest', appConfig);
 * // Result: 7776000 (from API, no PUBLIC_COMMERCE_API_GUEST_REFRESH_TOKEN_EXPIRY_SECONDS set)
 *
 * @example
 * // Registered user with environment override
 * // PUBLIC_COMMERCE_API_REGISTERED_REFRESH_TOKEN_EXPIRY_SECONDS=2592000
 * const expiry = getRefreshTokenExpiry(7776000, 'registered', appConfig);
 * // Result: 2592000 (30 days from environment override, ignoring API's 90 days)
 *
 * @example
 * // Override exceeding maximum is capped to maximum
 * // PUBLIC_COMMERCE_API_GUEST_REFRESH_TOKEN_EXPIRY_SECONDS=5184000 (60 days)
 * const expiry = getRefreshTokenExpiry(7776000, 'guest', appConfig);
 * // Result: 2592000 (capped to 30 days maximum for guest tokens)
 */
export const getRefreshTokenExpiry = (
    apiResponseExpirySeconds: number,
    userType?: 'guest' | 'registered',
    appConfig?: AppConfig
): number => {
    // If no userType provided, use API response
    if (!userType) {
        return apiResponseExpirySeconds;
    }

    const maxExpiry = userType === 'registered' ? MAX_REGISTERED_REFRESH_TOKEN_EXPIRY : MAX_GUEST_REFRESH_TOKEN_EXPIRY;

    const refreshTokenExpiryOverride = appConfig
        ? userType === 'registered'
            ? appConfig.commerce.api.registeredRefreshTokenExpirySeconds
            : appConfig.commerce.api.guestRefreshTokenExpirySeconds
        : undefined;

    // If config override is set, use it but cap at maximum allowed
    if (refreshTokenExpiryOverride !== undefined) {
        return Math.min(refreshTokenExpiryOverride, maxExpiry);
    }

    // Otherwise, use API response but cap at maximum allowed
    return Math.min(apiResponseExpirySeconds, maxExpiry);
};

export type AuthStorageData = AuthData & StorageMetaData & StorageErrorData;
export const authContext = createContext<{ ref: Promise<AuthData | undefined> }>();
export const authStorageContext = createContext<Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>>();

/**
 * Shared utility to write Commerce API auth information from a given token response into the given storage container.
 */
export const updateAuthStorageDataByTokenResponse = (
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    tokenResponse: ShopperLogin.schemas['TokenResponse'],
    userType?: 'guest' | 'registered',
    appConfig?: AppConfig,
    dwsid?: string
): void => {
    const now = Date.now();

    // Transform SLAS API response (snake_case) to internal storage (camelCase)
    storage.set('accessToken', tokenResponse?.access_token);
    storage.set('refreshToken', tokenResponse?.refresh_token);

    // Decode access token once for expiry and customer ID extraction
    const claims = tokenResponse?.access_token ? getSLASAccessTokenClaims(tokenResponse.access_token) : null;

    // Get expiry from JWT token itself (source of truth) rather than calculating from expires_in
    storage.set('accessTokenExpiry', claims?.expiry ?? now + Number(tokenResponse?.expires_in) * 1_000);

    // Get final refresh token expiry (with environment override if configured)
    const apiResponseExpirySeconds = Number(tokenResponse?.refresh_token_expires_in);
    const refreshTokenExpirySeconds = getRefreshTokenExpiry(apiResponseExpirySeconds, userType, appConfig);
    storage.set('refreshTokenExpiry', now + refreshTokenExpirySeconds * 1_000);

    // Extract customer ID from access token isb claim (source of truth for hybrid storefronts)
    const customerId = claims ? getCustomerIdFromClaims(claims, userType ?? 'guest') : null;
    if (customerId) {
        storage.set('customerId', customerId);
    } else if (tokenResponse?.customer_id) {
        storage.set('customerId', tokenResponse.customer_id);
    }

    // Store customer encoded user id if available (for registered users)
    if (tokenResponse?.enc_user_id) {
        storage.set('encUserId', tokenResponse.enc_user_id);
    }

    // Store user session identifier if available
    if (tokenResponse?.usid) {
        storage.set('usid', tokenResponse.usid);
    }

    // Store IDP access token if available (for social login)
    // IDP token doesn't come with its own expiry, so we use the SLAS access token expiry as a reasonable proxy
    // If the SLAS session expires, the IDP token becomes less useful anyway
    if (tokenResponse?.idp_access_token) {
        storage.set('idpAccessToken', tokenResponse.idp_access_token);
        // Use same expiry as SLAS access token for IDP access token
        const idpAccessTokenExpiryValue = storage.get('accessTokenExpiry');
        if (idpAccessTokenExpiryValue && typeof idpAccessTokenExpiryValue === 'number') {
            storage.set('idpAccessTokenExpiry', idpAccessTokenExpiryValue);
        }
    }

    // Store dwsid if available (from Set-Cookie response header, for hybrid storefronts)
    if (dwsid) {
        storage.set('dwsid', dwsid);
    }
};

/**
 * Shared utility to update the internal auth storage.
 * TODO: Once we got rid of `SessionData` type in favor of using the `TokenResponse` directly, this method could
 *  mostly be replaced by `updateStorage` directly.
 */
export const updateAuthStorageData = (
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    updater:
        | (ShopperLogin.schemas['TokenResponse'] & { dwsid?: string })
        | ((data: AuthData & StorageErrorData) => AuthData & StorageErrorData),
    appConfig?: AppConfig
) => {
    // Extract/store current storage data
    const publicData = unpackStorage(storage);

    // Preserve tracking consent from cookie (source of truth) before clearing storage
    // Tracking consent cookie must be preserved across token updates to maintain user preference
    const existingTrackingConsent = storage.get('trackingConsent');

    // Unset storage data
    clearStorage(storage, false);

    if (typeof updater === 'function') {
        // Retrieve updated data
        const updated = updater(publicData);

        // Update storage data using an updater method
        if (typeof updated === 'object' && updated !== null) {
            updateStorageObject(storage, updated);
        }
    } else {
        // Update storage data using a `TokenResponse` (may include dwsid from response headers)
        const { dwsid, ...tokenResponse } = updater;
        updateAuthStorageDataByTokenResponse(storage, tokenResponse, undefined, appConfig, dwsid);
    }

    // Restore tracking consent from cookie if it existed (cookie is source of truth, not token)
    // This ensures tracking consent cookie persists across token refreshes and login flows
    if (existingTrackingConsent === TrackingConsent.Accepted || existingTrackingConsent === TrackingConsent.Declined) {
        storage.set('trackingConsent', existingTrackingConsent);
    }

    // Mark storage as updated
    storage.set('isUpdated', true);
};

/**
 * Shared helper to update storage and cache with token response
 * Used by both server and client auth logic
 */
export const updateStorageAndCache = async (
    context: Readonly<RouterContextProvider>,
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    cache: { ref: AuthData | undefined },
    tokenResponse: ShopperLogin.schemas['TokenResponse'] & { dwsid?: string },
    userType: 'guest' | 'registered'
): Promise<void> => {
    const promiseCache = context.get(authContext);
    const appConfig = getConfig<AppConfig>(context);
    promiseCache.ref = Promise.resolve(tokenResponse).then((response) => {
        const { dwsid, ...tokenData } = response;
        updateAuthStorageDataByTokenResponse(storage, tokenData, userType, appConfig, dwsid);
        cache.ref = unpackStorage<AuthData>(storage);
        storage.set('userType', userType);
        storage.set('isUpdated', true);
        return cache.ref;
    });

    await promiseCache.ref;
};

/**
 * Shared utility to make sure that in case the current auth promise reference gets updated while running, the latest
 * promise reference is always resolved/returned.
 */
export const createAuthPromise = (
    context: Readonly<RouterContextProvider>,
    data: AuthData | undefined
): Promise<AuthData | undefined> => {
    const promise = Promise.resolve(data).then(
        (result: AuthData | undefined): AuthData | undefined | Promise<AuthData | undefined> => {
            const currentPromise = context.get(authContext).ref;
            if (promise !== currentPromise) {
                return currentPromise;
            }
            return result;
        }
    );
    return promise;
};

/**
 * Decoded payload from SLAS access token
 */
export interface SLASAccessTokenPayload {
    /** Expiration time (Unix timestamp in seconds) */
    exp: number;
    /** Issued at time (Unix timestamp in seconds) */
    iat?: number;
    /** Issuer */
    iss?: string;
    /** Subject (user ID) */
    sub?: string;
    /** Custom claims */
    [key: string]: unknown;
}

/**
 * Decode a SLAS access token payload without verifying the signature
 *
 * SECURITY NOTE: This only decodes the payload, it does NOT verify the signature.
 * Only use this for reading non-sensitive claims like expiry time from SLAS access tokens.
 * Never use decoded data for authorization decisions without proper verification.
 *
 * For external JWT tokens (passwordless login, reset password), use `jose.decodeJwt` with verification.
 *
 * @param token - SLAS access token string
 * @returns Decoded SLAS access token payload
 * @throws Error if token is invalid or cannot be decoded
 */
export function decodeSLASAccessToken(token: string): SLASAccessTokenPayload {
    if (!token || typeof token !== 'string') {
        throw new Error('Invalid token: must be a non-empty string');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT: must have 3 parts (header.payload.signature)');
    }

    try {
        // Decode the payload (second part)
        const payload = parts[1];
        if (!payload) {
            throw new Error('Invalid JWT: missing payload');
        }

        // JWT uses base64url encoding, need to convert to standard base64
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

        // Decode based on environment
        const decoded =
            typeof window === 'undefined'
                ? Buffer.from(base64, 'base64').toString('utf-8') // Node.js
                : atob(base64); // Browser

        return JSON.parse(decoded) as SLASAccessTokenPayload;
    } catch (error) {
        throw new Error(`Failed to decode JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Extracted claims from a SLAS access token payload
 */
export interface SLASAccessTokenClaims {
    /** Expiry timestamp in milliseconds, or null if token has no exp claim */
    expiry: number | null;
    /** Tracking consent value as TrackingConsent enum, or null if token has no dnt claim */
    trackingConsent: TrackingConsent | null;
    /** Guest customer ID extracted from the isb claim, or null if not present */
    gcid: string | null;
    /** Registered customer ID extracted from the isb claim, or null if not present */
    rcid: string | null;
}

/**
 * Parse the `isb` (identity subject) claim from a SLAS access token payload.
 * The isb claim is a `::` delimited string of key:value pairs containing customer identity info.
 *
 * Guest format:    `uido:slas::upn:Guest::uidn:Guest User::gcid:<id>::chid:<channel>`
 * Registered format: `uido:ecom::upn:<email>::uidn:<name>::gcid:<id>::rcid:<id>::chid:<channel>`
 *
 * @param isb - Raw isb claim string from the token payload
 * @returns Object with gcid and rcid values, or null for each if not found
 */
function parseIsbClaim(isb: unknown): { gcid: string | null; rcid: string | null } {
    if (typeof isb !== 'string' || !isb) {
        return { gcid: null, rcid: null };
    }

    let gcid: string | null = null;
    let rcid: string | null = null;

    const parts = isb.split('::');
    for (const part of parts) {
        if (part.startsWith('gcid:')) {
            gcid = part.slice(5);
        } else if (part.startsWith('rcid:')) {
            rcid = part.slice(5);
        }
    }

    return { gcid, rcid };
}

/**
 * Extract claims from a SLAS access token payload.
 * Decodes the token once and returns multiple claims for efficiency.
 *
 * @param token - SLAS access token string
 * @returns Object containing extracted claims (expiry, trackingConsent, gcid, rcid)
 */
export function getSLASAccessTokenClaims(token: string): SLASAccessTokenClaims {
    try {
        const payload: SLASAccessTokenPayload = decodeSLASAccessToken(token);
        const expiry = payload.exp !== undefined ? payload.exp * 1000 : null;

        let trackingConsent: TrackingConsent | null = null;
        const dntValue = payload.dnt;
        if (typeof dntValue === 'boolean') {
            trackingConsent = booleanToTrackingConsent(dntValue);
        } else if (typeof dntValue === 'string') {
            const boolValue = dntValue === 'true' || dntValue === '1';
            trackingConsent = booleanToTrackingConsent(boolValue);
        }

        const { gcid, rcid } = parseIsbClaim(payload.isb);

        return { expiry, trackingConsent, gcid, rcid };
    } catch {
        return { expiry: null, trackingConsent: null, gcid: null, rcid: null };
    }
}

/**
 * Select the correct customer ID from decoded token claims based on user type.
 *
 * - Guest users: use gcid (guest customer ID)
 * - Registered users: prefer rcid (registered customer ID), fall back to gcid
 *
 * @param claims - Decoded SLAS access token claims containing gcid and rcid
 * @param userType - Whether the shopper is a guest or registered user
 * @returns The appropriate customer ID, or null if not available
 */
export function getCustomerIdFromClaims(
    claims: SLASAccessTokenClaims,
    userType: 'guest' | 'registered'
): string | null {
    return userType === 'registered' ? (claims.rcid ?? claims.gcid) : claims.gcid;
}
