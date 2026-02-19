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
    getAuthDataFromCookies,
    clearInvalidSessionAndRestoreGuest,
    populateAuthStorage,
    handleRefreshToken,
} from '@/middlewares/auth.client';
import { getAllCookies } from '@/lib/cookies.client';
import { appConfigContext } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { TrackingConsent } from '@/types/tracking-consent';

function expectStorage(data: AuthStorageData = {}): {
    provider: RouterContextProvider;
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>;
} {
    const provider = new RouterContextProvider();
    const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(data) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );

    // Create cache objects that match what the middleware expects
    const authData = Object.keys(data).length > 0 ? Object.fromEntries(storage) : undefined;
    const cache = { ref: authData };
    const promiseCache = { ref: Promise.resolve(authData) };

    // Store the contexts in a Map so we can return the right one
    const contexts = new Map();
    // Pre-populate with appConfig
    contexts.set(appConfigContext, mockConfig);

    // Mock context.get() and context.set() to handle different contexts appropriately
    vi.spyOn(provider, 'set').mockImplementation((contextKey: any, value: any) => {
        contexts.set(contextKey, value);
        return provider;
    });

    vi.spyOn(provider, 'get').mockImplementation((contextKey: any) => {
        // If this context was already set, return what was set
        if (contexts.has(contextKey)) {
            return contexts.get(contextKey);
        }

        // Otherwise, try to return appropriate defaults
        // Check if it's a context that expects a promise cache structure
        if (contextKey?.displayName === 'authContext' || String(contextKey).includes('Promise')) {
            return promiseCache;
        }

        // Check if it's a context that expects a cache structure
        if (contextKey?.displayName === 'authCacheContext' || String(contextKey).includes('Cache')) {
            return cache;
        }

        // Default to storage Map
        return storage;
    });

    return {
        provider,
        storage,
    };
}

function getAuthData(): AuthData {
    return {
        accessToken: 'access_token',
        accessTokenExpiry: Date.now() + 1_000,
        refreshToken: 'refresh_token',
        refreshTokenExpiry: Date.now() + 10_000,
        userType: 'guest',
        usid: 'usid',
        customerId: 'customer_id',
        codeVerifier: 'codeVerifier',
        dwsid: 'dwsid',
        idpAccessToken: 'idp_access_token',
        idpAccessTokenExpiry: Date.now() + 1_000,
        trackingConsent: TrackingConsent.Declined,
    };
}

// Mock cookies.client module
vi.mock('@/lib/cookies.client', () => ({
    removeCookie: vi.fn(),
    getAllCookies: vi.fn(),
    setNamespacedCookie: vi.fn(),
}));

// Mock cookie-utils module
vi.mock('@/lib/cookie-utils', async () => {
    const actual = await vi.importActual('@/lib/cookie-utils');
    return {
        ...actual,
        getCookieNameWithSiteId: vi.fn((name: string) => `${name}_test-site`),
    };
});

// Mock fetch for token refresh and guest login API calls
global.fetch = vi.fn();

describe('auth middleware (client)', () => {
    beforeEach(() => {
        vi.mocked(getAllCookies).mockReturnValue({
            'cc-nx-g_test-site': '',
            'cc-nx_test-site': '',
            'cc-at_test-site': '',
            'usid_test-site': '',
            'customerId_test-site': '',
            'encUserId_test-site': '',
            'cc-idp-at_test-site': '',
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('middleware integration', () => {
        test('should read cookies using getAuthDataFromCookies via readClientAuthCookies', async () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'guest_access_token',
                'usid_test-site': 'guest_usid',
                'customerId_test-site': 'guest_customer',
                'cc-idp-at_test-site': '',
            });

            const mockContext = new RouterContextProvider();
            const mockNext = vi.fn().mockResolvedValue(undefined);

            await authMiddleware({ context: mockContext } as any, mockNext);

            // Verify getAllCookies was called to read all cookies at once for optimal performance
            expect(getAllCookies).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should handle empty cookies and still execute next', async () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '',
                'cc-nx_test-site': '',
                'cc-at_test-site': '',
                'usid_test-site': '',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const mockContext = new RouterContextProvider();
            const mockNext = vi.fn().mockResolvedValue(undefined);

            await authMiddleware({ context: mockContext } as any, mockNext);

            expect(getAllCookies).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
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
                accessToken: 'updated_access_token',
                refreshToken: 'updated_refresh_token',
            });
            updateAuth(provider, mockUpdater);

            expect(mockUpdater).toBeCalledTimes(1);
            expect(mockUpdater).toBeCalledWith(data);
            // trackingConsent is preserved from existing storage (updateAuthStorageData preserves trackingConsent)
            expect(storage.size).toBe(4);
            expect(Object.fromEntries(storage)).toStrictEqual({
                accessToken: 'updated_access_token',
                refreshToken: 'updated_refresh_token',
                trackingConsent: TrackingConsent.Declined, // Preserved from original data
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
            // trackingConsent is preserved from existing storage even when updater returns void
            expect(storage.size).toBe(2);
            expect(storage.get('isUpdated')).toBe(true);
            expect(storage.get('trackingConsent')).toBe(TrackingConsent.Declined); // Preserved from original data
        });
    });

    describe('destroyAuth()', () => {
        test('should mark storage as destroyed', () => {
            const data = getAuthData();
            const { provider, storage } = expectStorage(data);

            destroyAuth(provider);

            expect(storage.get('isDestroyed')).toBe(true);
        });

        test('should throw error when called without proper middleware context', () => {
            const provider = new RouterContextProvider();
            vi.spyOn(provider, 'get').mockReturnValue(undefined);

            expect(() => destroyAuth(provider)).toThrow('destroyAuth must be used within the Commerce API middleware');
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

        test('should throw error when called without proper middleware context', () => {
            const provider = new RouterContextProvider();
            vi.spyOn(provider, 'get').mockReturnValue(undefined);

            expect(() => flashAuth(provider)).toThrow('flashAuth must be used within the Commerce API middleware');
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

            // Mock getCookies to return current data values
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g': data.refreshToken || '',
                'cc-nx_test-site': '',
                'cc-at': data.accessToken || '',
                usid: data.usid || '',
                customerId: data.customerId || '',
                'cc-idp-at_test-site': '',
            });

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(false);
        });

        test('should return true and update storage when cookie has different access token', () => {
            const currentData = getAuthData();
            const { provider, storage } = expectStorage({
                accessToken: 'old_token',
                accessTokenExpiry: currentData.accessTokenExpiry,
                refreshToken: 'old_refresh_token',
                refreshTokenExpiry: currentData.refreshTokenExpiry,
                userType: 'guest',
            });

            // Mock getCookies to return new cookie values
            // cc-nx (registered user cookie) exists, so userType should be 'registered'
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '', // Guest cookie doesn't exist
                'cc-nx_test-site': 'new_refresh_token', // Registered cookie exists
                'cc-at_test-site': 'new_token',
                'usid_test-site': '',
                'customerId_test-site': 'customer_123',
                'cc-idp-at_test-site': '',
            });

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(true);
            expect(storage.get('accessToken')).toBe('new_token');
            expect(storage.get('refreshToken')).toBe('new_refresh_token');
            expect(storage.get('userType')).toBe('registered');
            expect(storage.get('customerId')).toBe('customer_123');
            expect(storage.get('isUpdated')).toBe(true);
        });

        test('should not update metadata fields (isDestroyed, error, isUpdated)', () => {
            const currentData = getAuthData();
            const { provider, storage } = expectStorage({
                accessToken: 'old_token',
                accessTokenExpiry: currentData.accessTokenExpiry,
                refreshToken: currentData.refreshToken,
                refreshTokenExpiry: currentData.refreshTokenExpiry,
                userType: 'guest',
            });

            // Mock getCookies to return new cookie values (guest user)
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g': currentData.refreshToken || '',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'new_token',
                'usid_test-site': '',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
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

            // Mock getCookies to return empty values
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '',
                'cc-nx_test-site': '',
                'cc-at_test-site': '',
                'usid_test-site': '',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(false);
        });

        test('should return false when current storage and cache have no access token', () => {
            const { provider } = expectStorage({});

            // Mock getCookies to return new cookie values
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'new_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'new_token',
                'usid_test-site': '',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const result = refreshAuthFromCookie(provider);

            expect(result).toBe(false);
        });

        test('should handle cookie update with additional fields', () => {
            const currentData = getAuthData();
            const { provider, storage } = expectStorage({
                accessToken: 'old_token',
                accessTokenExpiry: currentData.accessTokenExpiry,
            });

            // Mock getCookies to return new cookie values with additional fields
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'new_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'new_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            refreshAuthFromCookie(provider);

            expect(storage.get('accessToken')).toBe('new_token');
            expect(storage.get('usid')).toBe('test_usid');
            expect(storage.get('userType')).toBe('guest'); // cc-nx-g exists
        });
    });

    describe('getAuthDataFromCookies()', () => {
        test('should return undefined when no auth cookies exist', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '',
                'cc-nx_test-site': '',
                'cc-at_test-site': '',
                'usid_test-site': '',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeUndefined();
        });

        test('should return auth data for guest user with all fields', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'access_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': 'guest_customer_id',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.accessToken).toBe('access_token');
            expect(result?.refreshToken).toBe('guest_refresh_token');
            expect(result?.usid).toBe('test_usid');
            expect(result?.customerId).toBe('guest_customer_id');
            expect(result?.userType).toBe('guest');
        });

        test('should return auth data for registered user with all fields', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '',
                'cc-nx_test-site': 'registered_refresh_token',
                'cc-at_test-site': 'access_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': 'registered_customer_id',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.accessToken).toBe('access_token');
            expect(result?.refreshToken).toBe('registered_refresh_token');
            expect(result?.usid).toBe('test_usid');
            expect(result?.customerId).toBe('registered_customer_id');
            expect(result?.userType).toBe('registered');
        });

        test('should prioritize registered user over guest when both cookies exist', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': 'registered_refresh_token',
                'cc-at_test-site': 'access_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': 'test_customer_id',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.refreshToken).toBe('registered_refresh_token');
            expect(result?.userType).toBe('registered');
        });

        test('should return auth data with only access token', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'access_token_only',
                'usid_test-site': '',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.accessToken).toBe('access_token_only');
            expect(result?.refreshToken).toBeUndefined();
            expect(result?.userType).toBe('guest');
        });

        test.each([
            {
                name: 'guest',
                cookies: {
                    'cc-nx-g_test-site': 'guest_refresh_only',
                    'cc-nx_test-site': '',
                    'cc-at_test-site': '',
                    'usid_test-site': '',
                    'customerId_test-site': '',
                    'cc-idp-at_test-site': '',
                },
                expectedUserType: 'guest' as const,
            },
            {
                name: 'registered',
                cookies: {
                    'cc-nx-g_test-site': '',
                    'cc-nx_test-site': 'registered_refresh_only',
                    'cc-at_test-site': '',
                    'usid_test-site': '',
                    'customerId_test-site': '',
                    'cc-idp-at_test-site': '',
                },
                expectedUserType: 'registered' as const,
            },
        ])('should return auth data with only refresh token ($name)', ({ cookies, expectedUserType }) => {
            vi.mocked(getAllCookies).mockReturnValue(cookies);

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.accessToken).toBeUndefined();
            expect(result?.refreshToken).toBe(
                expectedUserType === 'guest' ? 'guest_refresh_only' : 'registered_refresh_only'
            );
            expect(result?.userType).toBe(expectedUserType);
        });

        test('should handle partial cookie data with usid but no customerId', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'access_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.usid).toBe('test_usid');
            expect(result?.customerId).toBeUndefined();
        });

        test('should handle partial cookie data with customerId but no usid', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '',
                'cc-nx_test-site': 'registered_refresh_token',
                'cc-at_test-site': 'access_token',
                'usid_test-site': '',
                'customerId_test-site': 'test_customer_id',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.usid).toBeUndefined();
            expect(result?.customerId).toBe('test_customer_id');
        });

        test('should return undefined when only usid/customerId exist without tokens', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': '',
                'cc-nx_test-site': '',
                'cc-at_test-site': '',
                'usid_test-site': 'test_usid',
                'customerId_test-site': 'test_customer_id',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeUndefined();
        });

        test('should extract accessTokenExpiry from JWT when access token exists', () => {
            // Create a mock JWT with an expiry (simplified for testing)
            // Real JWT structure: header.payload.signature
            const futureExpiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now
            const mockPayload = btoa(JSON.stringify({ exp: futureExpiry }));
            const mockToken = `header.${mockPayload}.signature`;

            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': mockToken,
                'usid_test-site': 'test_usid',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.accessToken).toBe(mockToken);
            expect(result?.accessTokenExpiry).toBeDefined();
            expect(typeof result?.accessTokenExpiry).toBe('number');
            // Expiry should be in milliseconds
            expect(result?.accessTokenExpiry).toBeGreaterThan(Date.now());
        });

        test('should handle IDP access token', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'access_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': 'guest_customer_id',
                'cc-idp-at_test-site': 'idp_access_token_value',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.idpAccessToken).toBe('idp_access_token_value');
        });

        test('should handle tracking consent cookie value', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'access_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
                'dw_dnt_test-site': TrackingConsent.Declined,
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            // TrackingConsent is stored as enum directly
            expect(result?.trackingConsent).toBe(TrackingConsent.Declined);
        });

        test('should handle missing tracking consent cookie', () => {
            vi.mocked(getAllCookies).mockReturnValue({
                'cc-nx-g_test-site': 'guest_refresh_token',
                'cc-nx_test-site': '',
                'cc-at_test-site': 'access_token',
                'usid_test-site': 'test_usid',
                'customerId_test-site': '',
                'cc-idp-at_test-site': '',
            });

            const result = getAuthDataFromCookies();

            expect(result).toBeDefined();
            expect(result?.trackingConsent).toBeUndefined();
        });
    });

    describe('populateAuthStorage()', () => {
        test('should populate storage with all auth data fields', () => {
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            const authData: Partial<AuthStorageData> = {
                accessToken: 'test_token',
                refreshToken: 'test_refresh',
                accessTokenExpiry: Date.now() + 1000,
                usid: 'test_usid',
                customerId: 'test_customer',
                encUserId: 'test_enc_user_id',
                idpAccessToken: 'test_idp',
                userType: 'guest',
                trackingConsent: TrackingConsent.Declined,
            };

            populateAuthStorage(storage, authData);

            expect(storage.get('accessToken')).toBe('test_token');
            expect(storage.get('refreshToken')).toBe('test_refresh');
            expect(storage.get('accessTokenExpiry')).toBe(authData.accessTokenExpiry);
            expect(storage.get('usid')).toBe('test_usid');
            expect(storage.get('customerId')).toBe('test_customer');
            expect(storage.get('encUserId')).toBe('test_enc_user_id');
            expect(storage.get('idpAccessToken')).toBe('test_idp');
            expect(storage.get('userType')).toBe('guest');
            expect(storage.get('trackingConsent')).toBe(TrackingConsent.Declined);
        });

        test('should only populate defined fields', () => {
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            const authData: Partial<AuthStorageData> = {
                accessToken: 'test_token',
                userType: 'registered',
            };

            populateAuthStorage(storage, authData);

            expect(storage.get('accessToken')).toBe('test_token');
            expect(storage.get('userType')).toBe('registered');
            expect(storage.get('refreshToken')).toBeUndefined();
            expect(storage.get('usid')).toBeUndefined();
        });

        test('should delete trackingConsent when undefined', () => {
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            storage.set('trackingConsent', TrackingConsent.Declined);
            const authData: Partial<AuthStorageData> = {
                accessToken: 'test_token',
                trackingConsent: undefined,
            };

            populateAuthStorage(storage, authData);

            expect(storage.has('trackingConsent')).toBe(false);
        });

        test('should set trackingConsent when provided', () => {
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            const authData: Partial<AuthStorageData> = {
                accessToken: 'test_token',
                trackingConsent: TrackingConsent.Accepted,
            };

            populateAuthStorage(storage, authData);

            expect(storage.get('trackingConsent')).toBe(TrackingConsent.Accepted);
        });
    });

    describe('handleRefreshToken()', () => {
        test('should successfully refresh token', async () => {
            // SLAS API returns snake_case
            const mockTokenResponse = {
                access_token: 'new_access_token',
                refresh_token: 'new_refresh_token',
                token_type: 'Bearer',
                expires_in: 1800,
                refresh_token_expires_in: 2592000,
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        success: true,
                        data: mockTokenResponse,
                    }),
            } as Response);

            const result = await handleRefreshToken('refresh_token');

            expect(fetch).toHaveBeenCalledWith('/resource/auth/refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refreshToken: 'refresh_token',
                }),
            });
            expect(result).toEqual(mockTokenResponse);
        });

        test('should include trackingConsent when provided', async () => {
            // SLAS API returns snake_case
            const mockTokenResponse = {
                access_token: 'new_access_token',
                refresh_token: 'new_refresh_token',
                token_type: 'Bearer',
                expires_in: 1800,
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        success: true,
                        data: mockTokenResponse,
                    }),
            } as Response);

            await handleRefreshToken('refresh_token', TrackingConsent.Declined);

            expect(fetch).toHaveBeenCalledWith('/resource/auth/refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refreshToken: 'refresh_token',
                    trackingConsent: TrackingConsent.Declined,
                }),
            });
        });

        test('should throw error when response is not ok', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
            } as Response);

            await expect(handleRefreshToken('invalid_token')).rejects.toThrow('HTTP 401: Unauthorized');
        });

        test('should throw error when response indicates failure', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        success: false,
                        error: 'Invalid refresh token',
                    }),
            } as Response);

            await expect(handleRefreshToken('invalid_token')).rejects.toThrow('Invalid refresh token');
        });

        test('should throw error when response data is missing', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        success: true,
                    }),
            } as Response);

            await expect(handleRefreshToken('token')).rejects.toThrow('Failed to refresh token');
        });
    });

    describe('clearInvalidSessionAndRestoreGuest()', () => {
        test('should throw error when called without proper middleware context', async () => {
            const provider = new RouterContextProvider();
            vi.spyOn(provider, 'get').mockReturnValue(undefined);

            await expect(clearInvalidSessionAndRestoreGuest(provider)).rejects.toThrow(
                'clearInvalidSessionAndRestoreGuest must be used within the Commerce API middleware'
            );
        });

        test('should clear cookies, storage, call guest login, and update with new session', async () => {
            const { removeCookie } = await import('@/lib/cookies.client');
            const data = getAuthData();
            const provider = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
                Object.entries(data) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
            );
            const cache = { ref: data };
            const promiseCache = { ref: Promise.resolve(data) };

            // Mock context.get() and set() to handle all contexts
            const contexts = new Map();
            contexts.set(appConfigContext, mockConfig);

            vi.spyOn(provider, 'set').mockImplementation((contextKey: any, value: any) => {
                contexts.set(contextKey, value);
                return provider;
            });

            // Track which values to return for unknown contexts
            // Order: storage, cache, promiseCache for clearInvalidSessionAndRestoreGuest calls
            let callIndex = 0;
            const contextValues = [storage, cache, promiseCache];

            const mockGet = vi.spyOn(provider, 'get');
            mockGet.mockImplementation((contextKey: any) => {
                // If it's appConfig, always return mockConfig
                if (contextKey === appConfigContext) {
                    return mockConfig;
                }
                // If the context was explicitly set, return it
                if (contexts.has(contextKey)) {
                    return contexts.get(contextKey);
                }
                // For unknown contexts, return in order: storage, cache, promiseCache
                const value = contextValues[callIndex % contextValues.length];
                callIndex++;
                return value;
            });

            // Mock successful guest login - SLAS API returns snake_case
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        success: true,
                        data: {
                            access_token: 'new_guest_token',
                            refresh_token: 'new_guest_refresh',
                            token_type: 'Bearer',
                            expires_in: 1800,
                            refresh_token_expires_in: 2592000,
                            usid: 'new_usid',
                        },
                    }),
            } as Response);

            expect(storage.size).toBeGreaterThan(0);
            expect(cache.ref).toBeDefined();

            await clearInvalidSessionAndRestoreGuest(provider);

            // Verify all auth cookies were removed (including tracking consent)
            expect(removeCookie).toHaveBeenCalledWith('cc-nx-g');
            expect(removeCookie).toHaveBeenCalledWith('cc-nx');
            expect(removeCookie).toHaveBeenCalledWith('cc-at');
            expect(removeCookie).toHaveBeenCalledWith('usid');
            expect(removeCookie).toHaveBeenCalledWith('customerId');
            expect(removeCookie).toHaveBeenCalledWith('encUserId');
            expect(removeCookie).toHaveBeenCalledWith('cc-idp-at');
            expect(removeCookie).toHaveBeenCalledWith('dw_dnt');
            expect(removeCookie).toHaveBeenCalledWith('dwsid');
            expect(removeCookie).toHaveBeenCalledTimes(9);

            // Verify guest login API was called correctly
            expect(fetch).toHaveBeenCalledWith('/resource/auth/login-guest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usid: undefined,
                }),
            });

            // Verify storage was updated with new guest session
            expect(storage.get('accessToken')).toBe('new_guest_token');
            expect(storage.get('refreshToken')).toBe('new_guest_refresh');
            expect(storage.get('usid')).toBe('new_usid');
            expect(cache.ref).toBeDefined();
        });

        test('should set error in storage and throw when guest login fails', async () => {
            const data = getAuthData();
            const provider = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
                Object.entries(data) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
            );
            const cache = { ref: data };
            const promiseCache = { ref: Promise.resolve(data) };

            // Mock context.get() and set() similar to the previous test
            const contexts = new Map();
            contexts.set(appConfigContext, mockConfig);

            vi.spyOn(provider, 'set').mockImplementation((contextKey: any, value: any) => {
                contexts.set(contextKey, value);
                return provider;
            });

            let callIndex = 0;
            const contextValues = [storage, cache, promiseCache];

            vi.spyOn(provider, 'get').mockImplementation((contextKey: any) => {
                if (contextKey === appConfigContext) {
                    return mockConfig;
                }
                if (contexts.has(contextKey)) {
                    return contexts.get(contextKey);
                }
                const value = contextValues[callIndex % contextValues.length];
                callIndex++;
                return value;
            });

            // Mock failed guest login (HTTP error)
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            } as Response);

            await expect(clearInvalidSessionAndRestoreGuest(provider)).rejects.toThrow();
            expect(storage.get('error')).toBeDefined();
        });

        test('should clear cache even when guest login fails', async () => {
            const data = getAuthData();
            const provider = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
                Object.entries(data) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
            );
            const cache = { ref: data };
            const promiseCache = { ref: Promise.resolve(data) };

            // Mock context.get() and set() similar to the previous tests
            const contexts = new Map();
            contexts.set(appConfigContext, mockConfig);

            vi.spyOn(provider, 'set').mockImplementation((contextKey: any, value: any) => {
                contexts.set(contextKey, value);
                return provider;
            });

            let callIndex = 0;
            const contextValues = [storage, cache, promiseCache];

            vi.spyOn(provider, 'get').mockImplementation((contextKey: any) => {
                if (contextKey === appConfigContext) {
                    return mockConfig;
                }
                if (contexts.has(contextKey)) {
                    return contexts.get(contextKey);
                }
                const value = contextValues[callIndex % contextValues.length];
                callIndex++;
                return value;
            });

            expect(cache.ref).toBeDefined();

            // Mock failed guest login
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

            await expect(clearInvalidSessionAndRestoreGuest(provider)).rejects.toThrow();

            // Cache should be cleared even if guest login fails
            expect(cache.ref).toBeUndefined();
        });
    });
});
