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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ActionFunctionArgs, RouterContextProvider } from 'react-router';
import { action } from './resource.auth.$operation';
import {
    refreshAccessToken,
    loginGuestUser,
    loginRegisteredUser,
    updateAuth,
    getAuth,
} from '@/middlewares/auth.server';
import { extractResponseError } from '@/lib/utils';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { TrackingConsent } from '@/types/tracking-consent';

// Mock dependencies
vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/utils');
vi.mock('@/middlewares/auth.utils');

const mockRefreshAccessToken = vi.mocked(refreshAccessToken);
const mockLoginGuestUser = vi.mocked(loginGuestUser);
const mockLoginRegisteredUser = vi.mocked(loginRegisteredUser);
const mockUpdateAuth = vi.mocked(updateAuth);
const mockGetAuth = vi.mocked(getAuth);
const mockExtractResponseError = vi.mocked(extractResponseError);
const mockIsTrackingConsentEnabled = vi.mocked(isTrackingConsentEnabled);

describe('resource.auth.$operation action', () => {
    let mockContextProvider: RouterContextProvider;
    const mockTokenResponse = {
        access_token: 'test-access-token',
        id_token: 'test-id-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        refresh_token_expires_in: 7200,
        token_type: 'Bearer' as const,
        usid: 'test-usid',
        customer_id: 'test-customer-id',
        enc_user_id: 'test-enc-user-id',
        idp_access_token: 'test-idp-access-token',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockContextProvider = new RouterContextProvider();
        // Default mocks
        mockGetAuth.mockReturnValue({ userType: 'guest' } as never);
        mockIsTrackingConsentEnabled.mockReturnValue(false);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createActionArgs = (operation: string, body: unknown): ActionFunctionArgs => ({
        request: new Request('http://localhost/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }),
        params: { operation },
        context: mockContextProvider,
    });

    const parseResponse = async (response: Response) => {
        return response.json();
    };

    describe('refresh-token operation', () => {
        it('should handle successful refresh token without tracking consent', async () => {
            const requestBody = { refreshToken: 'test-refresh-token' };
            mockRefreshAccessToken.mockResolvedValue(mockTokenResponse);
            mockGetAuth.mockReturnValue({ userType: 'guest' } as never);

            const response = await action(createActionArgs('refresh-token', requestBody));
            const result = await parseResponse(response);

            expect(mockRefreshAccessToken).toHaveBeenCalledWith(mockContextProvider, requestBody.refreshToken, {});
            expect(mockGetAuth).toHaveBeenCalledWith(mockContextProvider);
            expect(mockUpdateAuth).toHaveBeenCalledTimes(2);
            expect(mockUpdateAuth).toHaveBeenNthCalledWith(1, mockContextProvider, mockTokenResponse);
            expect(mockUpdateAuth).toHaveBeenNthCalledWith(2, mockContextProvider, expect.any(Function));
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle successful refresh token with tracking consent when feature is enabled', async () => {
            const requestBody = { refreshToken: 'test-refresh-token', trackingConsent: TrackingConsent.Declined };
            mockRefreshAccessToken.mockResolvedValue(mockTokenResponse);
            mockGetAuth.mockReturnValue({ userType: 'registered' } as never);
            mockIsTrackingConsentEnabled.mockReturnValue(true);

            const response = await action(createActionArgs('refresh-token', requestBody));
            const result = await parseResponse(response);

            expect(mockRefreshAccessToken).toHaveBeenCalledWith(mockContextProvider, requestBody.refreshToken, {
                trackingConsent: TrackingConsent.Declined,
            });
            expect(mockGetAuth).toHaveBeenCalledWith(mockContextProvider);
            expect(mockIsTrackingConsentEnabled).toHaveBeenCalledWith(mockContextProvider);
            expect(mockUpdateAuth).toHaveBeenCalledTimes(2);
            expect(mockUpdateAuth).toHaveBeenNthCalledWith(2, mockContextProvider, expect.any(Function));
            // Verify tracking consent is passed to updater
            const updaterFn = mockUpdateAuth.mock.calls[1][1] as (session: unknown) => unknown;
            const updatedSession = updaterFn({});
            expect(updatedSession).toEqual({ userType: 'registered', trackingConsent: TrackingConsent.Declined });
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should ignore tracking consent when feature is disabled', async () => {
            const requestBody = { refreshToken: 'test-refresh-token', trackingConsent: TrackingConsent.Declined };
            mockRefreshAccessToken.mockResolvedValue(mockTokenResponse);
            mockGetAuth.mockReturnValue({ userType: 'guest' } as never);
            mockIsTrackingConsentEnabled.mockReturnValue(false);

            const response = await action(createActionArgs('refresh-token', requestBody));
            const result = await parseResponse(response);

            expect(mockRefreshAccessToken).toHaveBeenCalledWith(mockContextProvider, requestBody.refreshToken, {});
            expect(mockIsTrackingConsentEnabled).toHaveBeenCalledWith(mockContextProvider);
            // Verify tracking consent is not included in updater when feature is disabled
            const updaterFn = mockUpdateAuth.mock.calls[1][1] as (session: unknown) => unknown;
            const updatedSession = updaterFn({});
            expect(updatedSession).toEqual({ userType: 'guest' }); // No trackingConsent property
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle AuthService error during refresh token', async () => {
            const requestBody = { refreshToken: 'invalid-refresh-token' };
            const mockError = new Error('Invalid refresh token');
            const extractedError = { responseMessage: 'Invalid refresh token', status_code: '400' };

            mockRefreshAccessToken.mockRejectedValue(mockError);
            mockExtractResponseError.mockResolvedValue(extractedError);

            const response = await action(createActionArgs('refresh-token', requestBody));
            const result = await parseResponse(response);

            expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            expect(mockUpdateAuth).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });

    describe('login-guest operation', () => {
        it('should handle successful guest login', async () => {
            const requestBody = { usid: 'test-usid' };
            mockLoginGuestUser.mockResolvedValue(mockTokenResponse);

            const response = await action(createActionArgs('login-guest', requestBody));
            const result = await parseResponse(response);

            expect(mockLoginGuestUser).toHaveBeenCalledWith(mockContextProvider, {
                usid: requestBody.usid,
            });
            expect(mockUpdateAuth).toHaveBeenCalledTimes(2);
            expect(mockUpdateAuth).toHaveBeenNthCalledWith(1, mockContextProvider, mockTokenResponse);
            expect(mockUpdateAuth).toHaveBeenNthCalledWith(2, mockContextProvider, expect.any(Function));
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle successful guest login without usid', async () => {
            const requestBody = {};
            mockLoginGuestUser.mockResolvedValue(mockTokenResponse);

            const response = await action(createActionArgs('login-guest', requestBody));
            const result = await parseResponse(response);

            expect(mockLoginGuestUser).toHaveBeenCalledWith(mockContextProvider, {
                usid: undefined,
            });
            expect(mockUpdateAuth).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle AuthService error during guest login', async () => {
            const requestBody = { usid: 'test-usid' };
            const mockError = new Error('Guest login failed');
            const extractedError = { responseMessage: 'Guest login failed', status_code: '400' };

            mockLoginGuestUser.mockRejectedValue(mockError);
            mockExtractResponseError.mockResolvedValue(extractedError);

            const response = await action(createActionArgs('login-guest', requestBody));
            const result = await parseResponse(response);

            expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            expect(mockUpdateAuth).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });

    describe('login-registered operation', () => {
        it('should handle successful registered user login', async () => {
            const requestBody = {
                email: 'test@example.com',
                password: 'password123',
                customParameters: { rememberMe: true, locale: 'en-US' },
            };
            mockLoginRegisteredUser.mockResolvedValue(mockTokenResponse);

            const response = await action(createActionArgs('login-registered', requestBody));
            const result = await parseResponse(response);

            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(
                mockContextProvider,
                requestBody.email,
                requestBody.password,
                {
                    customParameters: requestBody.customParameters,
                }
            );
            expect(mockUpdateAuth).toHaveBeenCalledTimes(2);
            expect(mockUpdateAuth).toHaveBeenNthCalledWith(1, mockContextProvider, mockTokenResponse);
            expect(mockUpdateAuth).toHaveBeenNthCalledWith(2, mockContextProvider, expect.any(Function));
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle successful registered user login without custom parameters', async () => {
            const requestBody = {
                email: 'test@example.com',
                password: 'password123',
            };
            mockLoginRegisteredUser.mockResolvedValue(mockTokenResponse);

            const response = await action(createActionArgs('login-registered', requestBody));
            const result = await parseResponse(response);

            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(
                mockContextProvider,
                requestBody.email,
                requestBody.password,
                {
                    customParameters: undefined,
                }
            );
            expect(mockUpdateAuth).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle AuthService error during registered user login', async () => {
            const requestBody = {
                email: 'invalid@example.com',
                password: 'wrongpassword',
            };
            const mockError = new Error('Invalid credentials');
            const extractedError = { responseMessage: 'Invalid email or password', status_code: '401' };

            mockLoginRegisteredUser.mockRejectedValue(mockError);
            mockExtractResponseError.mockResolvedValue(extractedError);

            const response = await action(createActionArgs('login-registered', requestBody));
            const result = await parseResponse(response);

            expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            expect(mockUpdateAuth).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });

    describe('unknown operation', () => {
        it('should return error for unknown operation', async () => {
            const response = await action(createActionArgs('unknown-operation', {}));
            const result = await parseResponse(response);

            expect(result).toEqual({
                success: false,
                error: 'Unknown auth operation: unknown-operation',
            });
        });
    });

    describe('error handling', () => {
        it('should handle JSON parsing errors', async () => {
            const mockRequest = new Request('http://localhost/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid-json',
            });

            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: { operation: 'refresh-token' },
                context: mockContextProvider,
            };

            const extractedError = { responseMessage: 'Invalid JSON format', status_code: '400' };
            mockExtractResponseError.mockResolvedValue(extractedError);

            const response = await action(args);
            const result = await parseResponse(response);

            expect(mockExtractResponseError).toHaveBeenCalledWith(expect.any(SyntaxError));
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });

        it('should handle network errors', async () => {
            const requestBody = { refreshToken: 'test-refresh-token' };
            const networkError = new Error('Network connection failed');
            const extractedError = { responseMessage: 'Network error occurred', status_code: '500' };

            mockRefreshAccessToken.mockRejectedValue(networkError);
            mockExtractResponseError.mockResolvedValue(extractedError);

            const response = await action(createActionArgs('refresh-token', requestBody));
            const result = await parseResponse(response);

            expect(mockExtractResponseError).toHaveBeenCalledWith(networkError);
            expect(mockUpdateAuth).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });

        it('should handle extractResponseError failure by throwing the original error', async () => {
            const requestBody = { refreshToken: 'test-refresh-token' };
            const mockError = new Error('Service unavailable');

            mockRefreshAccessToken.mockRejectedValue(mockError);
            mockExtractResponseError.mockRejectedValue(mockError);

            await expect(action(createActionArgs('refresh-token', requestBody))).rejects.toThrow('Service unavailable');
        });
    });

    describe('request body validation', () => {
        it('should handle missing required fields for refresh-token', async () => {
            const requestBody = {}; // Missing refreshToken
            const mockError = new TypeError('Cannot read properties of undefined');
            const extractedError = { responseMessage: 'Missing required field: refreshToken', status_code: '400' };

            mockRefreshAccessToken.mockRejectedValue(mockError);
            mockExtractResponseError.mockResolvedValue(extractedError);

            const response = await action(createActionArgs('refresh-token', requestBody));
            const result = await parseResponse(response);

            expect(mockUpdateAuth).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });

        it('should handle missing required fields for login-registered', async () => {
            const requestBody = { email: 'test@example.com' }; // Missing password
            const mockError = new TypeError('Missing required authentication credentials');
            const extractedError = { responseMessage: 'Email and password are required', status_code: '400' };

            mockLoginRegisteredUser.mockRejectedValue(mockError);
            mockExtractResponseError.mockResolvedValue(extractedError);

            const response = await action(createActionArgs('login-registered', requestBody));
            const result = await parseResponse(response);

            expect(mockUpdateAuth).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });
});
