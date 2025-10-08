import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ActionFunctionArgs, RouterContextProvider } from 'react-router';
import { action } from './resource.auth.$operation';
import { refreshAccessToken, loginGuestUser, loginRegisteredUser } from '@/middlewares/auth.server';
import { extractResponseError } from '@/lib/utils';

// Mock dependencies
vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/utils');

const mockRefreshAccessToken = vi.mocked(refreshAccessToken);
const mockLoginGuestUser = vi.mocked(loginGuestUser);
const mockLoginRegisteredUser = vi.mocked(loginRegisteredUser);
const mockExtractResponseError = vi.mocked(extractResponseError);

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

    describe('refresh-token operation', () => {
        it('should handle successful refresh token', async () => {
            const requestBody = { refreshToken: 'test-refresh-token' };
            mockRefreshAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await action(createActionArgs('refresh-token', requestBody));

            expect(mockRefreshAccessToken).toHaveBeenCalledWith(mockContextProvider, requestBody.refreshToken);
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

            const result = await action(createActionArgs('refresh-token', requestBody));

            expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });

    describe('login-guest operation', () => {
        it('should handle successful guest login without usid', async () => {
            const requestBody = {};
            mockLoginGuestUser.mockResolvedValue(mockTokenResponse);

            const result = await action(createActionArgs('login-guest', requestBody));

            expect(mockLoginGuestUser).toHaveBeenCalledWith(mockContextProvider, {
                usid: undefined,
            });
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle successful guest login with usid', async () => {
            const requestBody = { usid: 'test-usid' };
            mockLoginGuestUser.mockResolvedValue(mockTokenResponse);

            const result = await action(createActionArgs('login-guest', requestBody));

            expect(mockLoginGuestUser).toHaveBeenCalledWith(mockContextProvider, {
                usid: requestBody.usid,
            });
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

            const result = await action(createActionArgs('login-guest', requestBody));

            expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });

    describe('login-registered operation', () => {
        it('should handle successful registered user login without custom parameters', async () => {
            const requestBody = {
                email: 'test@example.com',
                password: 'password123',
            };
            mockLoginRegisteredUser.mockResolvedValue(mockTokenResponse);

            const result = await action(createActionArgs('login-registered', requestBody));

            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(
                mockContextProvider,
                requestBody.email,
                requestBody.password,
                {
                    customParameters: undefined,
                }
            );
            expect(result).toEqual({
                success: true,
                data: mockTokenResponse,
            });
        });

        it('should handle successful registered user login with custom parameters', async () => {
            const requestBody = {
                email: 'test@example.com',
                password: 'password123',
                customParameters: { rememberMe: true, locale: 'en-US' },
            };
            mockLoginRegisteredUser.mockResolvedValue(mockTokenResponse);

            const result = await action(createActionArgs('login-registered', requestBody));

            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(
                mockContextProvider,
                requestBody.email,
                requestBody.password,
                {
                    customParameters: requestBody.customParameters,
                }
            );
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

            const result = await action(createActionArgs('login-registered', requestBody));

            expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });

    describe('unknown operation', () => {
        it('should return error for unknown operation', async () => {
            const result = await action(createActionArgs('unknown-operation', {}));

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

            const result = await action(args);

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

            const result = await action(createActionArgs('refresh-token', requestBody));

            expect(mockExtractResponseError).toHaveBeenCalledWith(networkError);
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

            const result = await action(createActionArgs('refresh-token', requestBody));

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

            const result = await action(createActionArgs('login-registered', requestBody));

            expect(result).toEqual({
                success: false,
                error: extractedError.responseMessage,
            });
        });
    });
});
