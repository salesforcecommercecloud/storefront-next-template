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
import type { ActionFunctionArgs } from 'react-router';

import { action } from './action.verify-otp';
import { createApiClients } from '@/lib/api-clients.server';
import { getAuth, updateAuth } from '@/middlewares/auth.server';
import { calculateBasket, getBasketCurrency, mergeBasket } from '@/lib/api/basket.server';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';

vi.mock('@/lib/api-clients.server');
vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/api/basket.server');
vi.mock('@/middlewares/basket.server');
vi.mock('@salesforce/storefront-next-runtime/i18n');
vi.mock('@/middlewares/auth.utils');
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

const mockCreateApiClients = vi.mocked(createApiClients);
const mockGetAuth = vi.mocked(getAuth);
const mockUpdateAuth = vi.mocked(updateAuth);
const mockMergeBasket = vi.mocked(mergeBasket);
const mockCalculateBasket = vi.mocked(calculateBasket);
const mockGetBasketCurrency = vi.mocked(getBasketCurrency);
const mockGetBasket = vi.mocked(getBasket);
const mockUpdateBasketResource = vi.mocked(updateBasketResource);
const mockGetTranslation = vi.mocked(getTranslation);
const mockIsTrackingConsentEnabled = vi.mocked(isTrackingConsentEnabled);

describe('action.verify-otp', () => {
    let mockContext: ActionFunctionArgs['context'];
    let mockExchangeToken: ReturnType<typeof vi.fn>;

    const createActionArgs = (otpCode?: string, email?: string): ActionFunctionArgs => {
        const formData = new FormData();
        if (otpCode !== undefined) {
            formData.append('otpCode', otpCode);
        }
        if (email !== undefined) {
            formData.append('email', email);
        }

        return {
            request: new Request('http://localhost/action/verify-otp', {
                method: 'POST',
                body: formData,
            }),
            params: {},
            context: mockContext,
            unstable_pattern: '/action/verify-otp',
        } as ActionFunctionArgs;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockContext = {} as ActionFunctionArgs['context'];
        mockExchangeToken = vi.fn();

        mockCreateApiClients.mockReturnValue({
            auth: {
                passwordless: {
                    exchangeToken: mockExchangeToken,
                },
            },
        } as any);

        // Return translation key as-is so tests can assert exact keys
        mockGetTranslation.mockReturnValue({
            t: ((key: string) => key) as any,
        } as any);

        // By default, tracking consent is treated as disabled in tests
        mockIsTrackingConsentEnabled.mockReturnValue(false);

        mockGetAuth.mockReturnValue({ usid: 'test-usid' } as any);
        mockMergeBasket.mockResolvedValue(undefined as any);
        mockGetBasket.mockResolvedValue({
            current: { basketId: 'basket-1', currency: 'USD' },
        } as any);
        mockGetBasketCurrency.mockReturnValue('USD');
        mockCalculateBasket.mockResolvedValue({ basketId: 'basket-1', currency: 'USD' } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when otpCode is missing', async () => {
        const response = await action(createActionArgs(undefined, 'test@example.com'));

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result).toEqual({
            success: false,
            error: { code: 'REQUIRED_FIELD', message: 'OTP code is required' },
        });
        expect(mockExchangeToken).not.toHaveBeenCalled();
    });

    it('returns error when email is missing', async () => {
        const response = await action(createActionArgs('12345678', undefined));

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result).toEqual({
            success: false,
            error: { code: 'REQUIRED_FIELD', message: 'Email is required' },
        });
        expect(mockExchangeToken).not.toHaveBeenCalled();
    });

    it('returns success, updates auth, and merges basket on valid OTP', async () => {
        const mockTokenResponse = {
            access_token: 'access-token',
            id_token: 'id-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            refresh_token_expires_in: 7200,
            token_type: 'Bearer' as const,
            usid: 'test-usid',
            customer_id: 'customer-id',
            enc_user_id: 'enc-user-id',
            idp_access_token: 'idp-token',
            dwsid: 'dwsid',
        } as any;

        mockExchangeToken.mockResolvedValue(mockTokenResponse);

        const response = await action(createActionArgs('12345678', 'test@example.com'));

        expect(mockExchangeToken).toHaveBeenCalledTimes(1);
        expect(mockExchangeToken).toHaveBeenCalledWith({
            pwdlessLoginToken: '12345678',
            usid: 'test-usid',
        });

        expect(mockUpdateAuth).toHaveBeenCalledTimes(2);
        expect(mockUpdateAuth).toHaveBeenNthCalledWith(1, mockContext, mockTokenResponse);

        const updater = mockUpdateAuth.mock.calls[1][1] as (session: unknown) => unknown;
        expect(updater({})).toEqual({ userType: 'registered' });

        expect(mockMergeBasket).toHaveBeenCalledWith(mockContext);

        expect(mockGetBasket).toHaveBeenCalledWith(mockContext);
        expect(mockGetBasketCurrency).toHaveBeenCalledWith(mockContext, { basketId: 'basket-1', currency: 'USD' });
        expect(mockCalculateBasket).toHaveBeenCalledWith(mockContext, 'basket-1', 'USD');
        expect(mockUpdateBasketResource).toHaveBeenCalledWith(mockContext, { basketId: 'basket-1', currency: 'USD' });

        const result = await response.json();
        expect(result).toEqual({
            success: true,
            message: 'Login successful',
            tokenResponse: mockTokenResponse,
        });
    });

    it('updates basket from merge then recalculates when merge returns a basket', async () => {
        const mockTokenResponse = {
            access_token: 'access-token',
            id_token: 'id-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            refresh_token_expires_in: 7200,
            token_type: 'Bearer' as const,
            usid: 'test-usid',
            customer_id: 'customer-id',
            enc_user_id: 'enc-user-id',
            idp_access_token: 'idp-token',
            dwsid: 'dwsid',
        } as any;

        const merged = { basketId: 'merged-basket', currency: 'USD' } as any;
        const recalculated = { basketId: 'merged-basket', currency: 'USD', orderTotal: 99 } as any;

        mockExchangeToken.mockResolvedValue(mockTokenResponse);
        mockMergeBasket.mockResolvedValue(merged);
        mockGetBasket.mockResolvedValue({
            current: merged,
        } as any);
        mockCalculateBasket.mockResolvedValue(recalculated);

        await action(createActionArgs('12345678', 'test@example.com'));

        expect(mockUpdateBasketResource).toHaveBeenNthCalledWith(1, mockContext, merged);
        expect(mockUpdateBasketResource).toHaveBeenNthCalledWith(2, mockContext, recalculated);
    });

    it('extracts error message from ApiError.rawBody JSON', async () => {
        const apiError = {
            rawBody: JSON.stringify({ message: 'Invalid or expired OTP code' }),
        } as any;

        mockExchangeToken.mockRejectedValue(apiError);

        const response = await action(createActionArgs('12345678', 'test@example.com'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('Invalid or expired OTP code');
    });

    it('falls back to error.message when rawBody is not present', async () => {
        const apiError = {
            message: 'Some plain error from backend',
        } as any;

        mockExchangeToken.mockRejectedValue(apiError);

        const response = await action(createActionArgs('12345678', 'test@example.com'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('Some plain error from backend');
    });

    it('uses default error message when rawBody is not valid JSON', async () => {
        const apiError = {
            rawBody: 'not-json',
        } as any;

        mockExchangeToken.mockRejectedValue(apiError);

        const response = await action(createActionArgs('12345678', 'test@example.com'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('Unknown error');
    });

    it('uses error.message as-is when it contains JSON', async () => {
        const apiError = {
            message: JSON.stringify({ message: 'OTP service temporarily unavailable' }),
        } as any;

        mockExchangeToken.mockRejectedValue(apiError);

        const response = await action(createActionArgs('12345678', 'test@example.com'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('{"message":"OTP service temporarily unavailable"}');
    });
});
