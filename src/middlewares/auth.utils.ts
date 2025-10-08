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

export type AuthStorageData = AuthData & StorageMetaData & StorageErrorData;
export const authContext = createContext<{ ref: Promise<AuthData | undefined> }>();

/**
 * Shared utility to write Commerce API auth information from a given token response into the given storage container.
 */
export const updateAuthStorageDataByTokenResponse = (
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    tokenResponse: ShopperLoginTypes.TokenResponse
): void => {
    const now = Date.now();
    storage.set('access_token', tokenResponse?.access_token);
    storage.set('refresh_token', tokenResponse?.refresh_token);
    storage.set('access_token_expiry', now + Number(tokenResponse?.expires_in) * 1_000);
    storage.set('refresh_token_expiry', now + Number(tokenResponse?.refresh_token_expires_in) * 1_000);

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
    updater: ShopperLoginTypes.TokenResponse | ((data: AuthData & StorageErrorData) => AuthData & StorageErrorData)
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
        updateAuthStorageDataByTokenResponse(storage, updater);
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
    promiseCache.ref = Promise.resolve(tokenResponse).then((response) => {
        updateAuthStorageDataByTokenResponse(storage, response);
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
