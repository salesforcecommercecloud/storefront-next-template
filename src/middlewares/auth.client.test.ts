import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RouterContextProvider } from 'react-router';
import type { SessionData as AuthData } from '@/lib/api/types';
import type { AuthStorageData } from '@/middlewares/auth.utils';
import authMiddleware, { getAuth, updateAuth, destroyAuth, flashAuth } from '@/middlewares/auth.client';
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
});
