import { createContext, type RouterContextProvider } from 'react-router';
import type { ShopperLoginTypes } from 'commerce-sdk-isomorphic';
import type { SessionData as AuthData } from '@/lib/api/types';
import {
    clearStorage,
    type StorageErrorData,
    type StorageMetaData,
    unpackStorage,
    updateStorageObject,
} from '@/lib/middleware';
import { getConfig, type AppConfig } from '@/config';

// Maximum allowed refresh token expiry times (in seconds) per Salesforce Commerce Cloud limits
export const MAX_GUEST_REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days
export const MAX_REGISTERED_REFRESH_TOKEN_EXPIRY = 90 * 24 * 60 * 60; // 90 days

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

/**
 * Shared utility to write Commerce API auth information from a given token response into the given storage container.
 */
export const updateAuthStorageDataByTokenResponse = (
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    tokenResponse: ShopperLoginTypes.TokenResponse,
    userType?: 'guest' | 'registered',
    appConfig?: AppConfig
): void => {
    const now = Date.now();

    storage.set('access_token', tokenResponse?.access_token);
    storage.set('refresh_token', tokenResponse?.refresh_token);
    storage.set('access_token_expiry', now + Number(tokenResponse?.expires_in) * 1_000);

    // Get final refresh token expiry (with environment override if configured)
    const apiResponseExpirySeconds = Number(tokenResponse?.refresh_token_expires_in);
    const refreshTokenExpirySeconds = getRefreshTokenExpiry(apiResponseExpirySeconds, userType, appConfig);
    storage.set('refresh_token_expiry', now + refreshTokenExpirySeconds * 1_000);

    // Store customer info if available (for registered users)
    if (tokenResponse?.customer_id) {
        storage.set('customer_id', tokenResponse.customer_id);
    }

    // Store user session identifier if available
    if (tokenResponse?.usid) {
        storage.set('usid', tokenResponse.usid);
    }

    if (tokenResponse?.idp_access_token) {
        storage.set('idp_access_token', tokenResponse.idp_access_token);
    }
    if (tokenResponse?.idp_refresh_token) {
        storage.set('idp_refresh_token', tokenResponse.idp_refresh_token);
    }
};

/**
 * Shared utility to update the internal auth storage.
 * TODO: Once we got rid of `SessionData` type in favor of using the `TokenResponse` directly, this method could
 *  mostly be replaced by `updateStorage` directly.
 */
export const updateAuthStorageData = (
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    updater: ShopperLoginTypes.TokenResponse | ((data: AuthData & StorageErrorData) => AuthData & StorageErrorData),
    appConfig?: AppConfig
) => {
    // Extract/store current storage data
    const publicData = unpackStorage(storage);

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
        // Update storage data using a `TokenResponse`
        updateAuthStorageDataByTokenResponse(storage, updater, undefined, appConfig);
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
    tokenResponse: ShopperLoginTypes.TokenResponse,
    userType: 'guest' | 'registered'
): Promise<void> => {
    const promiseCache = context.get(authContext);
    const appConfig = getConfig(context);
    promiseCache.ref = Promise.resolve(tokenResponse).then((response) => {
        updateAuthStorageDataByTokenResponse(storage, response, userType, appConfig);
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
