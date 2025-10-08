import { afterEach, describe, expect, test, vi } from 'vitest';
import { RouterContextProvider } from 'react-router';
import type { SessionData as AuthData } from '@/lib/api/types';
import type { AuthStorageData } from '@/middlewares/auth.utils';
import { getAuth, updateAuth } from '@/middlewares/auth.client';

function expectStorage(data: AuthStorageData = {}): {
    provider: RouterContextProvider;
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>;
} {
    const provider = new RouterContextProvider();
    const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(data) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );
    vi.spyOn(provider, 'get').mockReturnValue(storage);

    return {
        provider,
        storage,
    };
}

function getAuthData(): AuthData {
    return {
        access_token: 'access_token',
        access_token_expiry: Date.now() + 1_000,
        refresh_token: 'refresh_token',
        refresh_token_expiry: Date.now() + 10_000,
        userType: 'guest',
        usid: 'usid',
        customer_id: 'customer_id',
        codeVerifier: 'codeVerifier',
        dwsid: 'dwsid',
        idp_access_token: 'idp_access_token',
        idp_refresh_token: 'idp_refresh_token',
        dnt: 'true',
    };
}

describe('auth middleware (client)', () => {
    afterEach(() => {
        vi.resetModules();
    });

    describe('getAuth()', () => {
        test('should get an empty storage', () => {
            const { provider, storage } = expectStorage();
            expect(storage.size).toBe(0);
            expect(getAuth(provider)).toStrictEqual({});
        });

        test('should get the public-facing portion of a storage', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage(data);
            expect(storage.size).toBe(Object.keys(data).length);
            expect(getAuth(provider)).toStrictEqual(data);
        });

        test('should get the public-facing portion of an updated storage', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage({
                ...data,
                isUpdated: true,
            });
            expect(storage.size).toBe(Object.keys(data).length + 1);
            expect(getAuth(provider)).toStrictEqual(data);
        });

        test('should get the public-facing portion of an erroneous storage', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage({
                ...data,
                error: 'error message',
            });
            expect(storage.size).toBe(Object.keys(data).length + 1);
            expect(getAuth(provider)).toStrictEqual({ error: 'error message' });
        });

        test('should get the public-facing portion of a destroyed storage', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage({
                ...data,
                isDestroyed: true,
            });
            expect(storage.size).toBe(Object.keys(data).length + 1);
            expect(getAuth(provider)).toStrictEqual({});
        });
    });

    describe('updateAuth()', () => {
        test("should update an empty storage based on the updater's response", () => {
            const { provider, storage } = expectStorage();
            const data = getAuthData();
            const mockUpdater = vi.fn().mockReturnValue(data);
            updateAuth(provider, mockUpdater);

            expect(mockUpdater).toBeCalledTimes(1);
            expect(mockUpdater).toBeCalledWith({});
            expect(storage.size).toBe(Object.keys(data).length + 1);
            expect(Object.fromEntries(storage)).toStrictEqual({
                ...data,
                isUpdated: true,
            });
        });

        test("should update an existing storage based on the updater's response", () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage(data);
            const mockUpdater = vi.fn().mockReturnValue({
                access_token: 'updated_access_token',
                refresh_token: 'updated_refresh_token',
            });
            updateAuth(provider, mockUpdater);

            expect(mockUpdater).toBeCalledTimes(1);
            expect(mockUpdater).toBeCalledWith(data);
            expect(storage.size).toBe(3);
            expect(Object.fromEntries(storage)).toStrictEqual({
                access_token: 'updated_access_token',
                refresh_token: 'updated_refresh_token',
                isUpdated: true,
            });
        });

        test('should not fail if the updater returns void', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage(data);
            const mockUpdater = vi.fn();
            updateAuth(provider, mockUpdater);

            expect(mockUpdater).toBeCalledTimes(1);
            expect(mockUpdater).toBeCalledWith(data);
            expect(storage.size).toBe(1);
            expect(storage.get('isUpdated')).toBe(true);
        });
    });
});
