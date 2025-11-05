import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RouterContextProvider } from 'react-router';
import type { SessionData as AuthData } from '@/lib/api/types';
import type { AuthStorageData } from '@/middlewares/auth.utils';
import authMiddleware, {
    getAuth,
    updateAuth,
    destroyAuth,
    flashAuth,
    refreshAuthFromCookie,
} from '@/middlewares/auth.client';
import { getCookie, getCookieConfig } from '@/lib/cookies.client';

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

// Mock cookies.client module
vi.mock('@/lib/cookies.client', () => ({
    getCookie: vi.fn(),
    setCookie: vi.fn(),
    removeCookie: vi.fn(),
    getCookieConfig: vi.fn(),
}));

describe('auth middleware (client)', () => {
    beforeEach(() => {
        vi.mocked(getCookie).mockReturnValue({});
        vi.mocked(getCookieConfig).mockReturnValue({
            path: '/',
            sameSite: 'lax',
            secure: true,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('middleware cookie configuration', () => {
        test('should use cookie utilities from cookies.client module', async () => {
            // This test verifies the middleware uses the centralized cookie utilities
            // which internally use getCookieConfig for proper configuration
            vi.mocked(getCookie).mockReturnValue({});

            const mockContext = new RouterContextProvider();
            const mockNext = vi.fn().mockResolvedValue(undefined);

            await authMiddleware({ context: mockContext } as any, mockNext);

            // Verify the middleware reads cookies on initialization
            expect(getCookie).toHaveBeenCalled();
        });
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

    describe('destroyAuth()', () => {
        test('should mark storage as destroyed', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage(data);

            destroyAuth(provider);

            expect(storage.get('isDestroyed')).toBe(true);
        });
    });

    describe('flashAuth()', () => {
        test('should set error message in storage', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage(data);

            flashAuth(provider, 'Authentication failed');

            expect(storage.get('error')).toBe('Authentication failed');
        });

        test('should use empty string when no message provided', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage(data);

            flashAuth(provider);

            expect(storage.get('error')).toBe('');
        });
    });

    describe('refreshAuthFromCookie()', () => {
        test('should return false when contexts are missing', () => {
            const provider = new RouterContextProvider();
            vi.spyOn(provider, 'get').mockReturnValue(undefined);

            expect(() => refreshAuthFromCookie(provider)).toThrow(
                'refreshAuthFromCookie must be used within the Commerce API middleware'
            );
        });

        test('should return false when cookie access token matches current token', () => {
            const data = getAuthData();
            const { provider } = expectStorage(data);
            vi.mocked(getCookie).mockReturnValue({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                access_token_expiry: data.access_token_expiry,
                refresh_token_expiry: data.refresh_token_expiry,
                userType: 'guest',
            });

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(false);
        });

        test('should return true and update storage when cookie has different access token', () => {
            const currentData = getAuthData();
            const { provider, storage } = expectStorage({
                access_token: 'old_token',
                access_token_expiry: currentData.access_token_expiry,
                refresh_token: 'old_refresh_token',
                refresh_token_expiry: currentData.refresh_token_expiry,
                userType: 'guest',
            });

            const newCookieData = {
                access_token: 'new_token',
                refresh_token: 'new_refresh_token',
                access_token_expiry: Date.now() + 5000,
                refresh_token_expiry: Date.now() + 10000,
                userType: 'registered',
                customer_id: 'customer_123',
            };

            vi.mocked(getCookie).mockReturnValue(newCookieData);

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(true);
            expect(storage.get('access_token')).toBe('new_token');
            expect(storage.get('refresh_token')).toBe('new_refresh_token');
            expect(storage.get('userType')).toBe('registered');
            expect(storage.get('customer_id')).toBe('customer_123');
            expect(storage.get('isUpdated')).toBe(true);
        });

        test('should not update metadata fields (isDestroyed, error, isUpdated)', () => {
            const currentData = getAuthData();
            const { provider, storage } = expectStorage({
                access_token: 'old_token',
                access_token_expiry: currentData.access_token_expiry,
                refresh_token: currentData.refresh_token,
                refresh_token_expiry: currentData.refresh_token_expiry,
                userType: 'guest',
            });

            vi.mocked(getCookie).mockReturnValue({
                access_token: 'new_token',
                access_token_expiry: currentData.access_token_expiry,
                refresh_token: currentData.refresh_token,
                refresh_token_expiry: currentData.refresh_token_expiry,
                userType: 'guest',
                isDestroyed: true,
                error: 'some error',
                isUpdated: true,
            });

            refreshAuthFromCookie(provider);

            // Metadata fields should not be copied from cookie
            expect(storage.get('isDestroyed')).toBeUndefined();
            expect(storage.get('error')).toBeUndefined();
            // isUpdated is set by the function itself, not copied from cookie
            expect(storage.get('isUpdated')).toBe(true);
        });

        test('should return false when cookie has no access token', () => {
            const currentData = getAuthData();
            const { provider } = expectStorage(currentData);

            vi.mocked(getCookie).mockReturnValue({});

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(false);
        });

        test('should return false when current storage and cache have no access token', () => {
            const { provider } = expectStorage({});

            vi.mocked(getCookie).mockReturnValue({
                access_token: 'new_token',
                refresh_token: 'new_refresh_token',
            });

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(false);
        });

        test('should handle cookie update with additional fields', () => {
            const currentData = getAuthData();
            const { provider, storage } = expectStorage({
                access_token: 'old_token',
                access_token_expiry: currentData.access_token_expiry,
            });

            vi.mocked(getCookie).mockReturnValue({
                access_token: 'new_token',
                access_token_expiry: Date.now() + 5000,
                usid: 'test_usid',
                dwsid: 'test_dwsid',
                idp_access_token: 'idp_token',
            });

            refreshAuthFromCookie(provider);

            expect(storage.get('access_token')).toBe('new_token');
            expect(storage.get('usid')).toBe('test_usid');
            expect(storage.get('dwsid')).toBe('test_dwsid');
            expect(storage.get('idp_access_token')).toBe('idp_token');
        });
    });
});
