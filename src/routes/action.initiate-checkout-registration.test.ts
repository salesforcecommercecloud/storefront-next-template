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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from './action.initiate-checkout-registration';
import type { ActionFunctionArgs } from 'react-router';

// Mock dependencies
vi.mock('@/lib/api-clients');
vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/i18next');
vi.mock('@/middlewares/auth.utils');
vi.mock('@/types/tracking-consent');
vi.mock('@/middlewares/basket.server');
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));
vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    getConfig: vi.fn(() => ({})),
}));
vi.mock('@/lib/turnstile-enforce.server', () => ({
    enforceTurnstile: vi.fn(),
}));

const mockCreateApiClients = vi.fn();
const mockGetAuth = vi.fn();
const mockGetTranslation = vi.fn();
const mockIsTrackingConsentEnabled = vi.fn();
const mockTrackingConsentToBoolean = vi.fn();
const mockGetBasket = vi.fn();

describe('action.initiate-checkout-registration', () => {
    let mockRequest: Request;
    let mockContext: ActionFunctionArgs['context'];
    let mockPasswordlessAuthorize: ReturnType<typeof vi.fn>;
    let mockEnforceTurnstile: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        const { enforceTurnstile } = await import('@/lib/turnstile-enforce.server');
        mockEnforceTurnstile = vi.mocked(enforceTurnstile);
        mockEnforceTurnstile.mockResolvedValue(true);

        // Setup default mocks
        mockPasswordlessAuthorize = vi.fn().mockResolvedValue({});

        mockCreateApiClients.mockReturnValue({
            auth: {
                passwordless: {
                    authorize: mockPasswordlessAuthorize,
                },
            },
        });

        mockGetAuth.mockReturnValue({
            usid: 'test-usid',
            trackingConsent: null,
        });

        mockGetTranslation.mockReturnValue({
            t: (key: string) => key,
        });

        mockIsTrackingConsentEnabled.mockReturnValue(false);

        mockGetBasket.mockResolvedValue({
            current: {
                customerInfo: {
                    email: 'test@example.com',
                },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                        },
                    },
                ],
            },
        });

        const { createApiClients } = await import('@/lib/api-clients');
        vi.mocked(createApiClients).mockImplementation(mockCreateApiClients);

        const { getAuth } = await import('@/middlewares/auth.server');
        vi.mocked(getAuth).mockImplementation(mockGetAuth);

        const { getTranslation } = await import('@/lib/i18next');
        vi.mocked(getTranslation).mockImplementation(mockGetTranslation);

        const { isTrackingConsentEnabled } = await import('@/middlewares/auth.utils');
        vi.mocked(isTrackingConsentEnabled).mockImplementation(mockIsTrackingConsentEnabled);

        const { getBasket } = await import('@/middlewares/basket.server');
        vi.mocked(getBasket).mockImplementation(mockGetBasket);

        mockContext = {
            get: vi.fn(() => ({ getLocale: () => 'en-US' })),
        } as unknown as ActionFunctionArgs['context'];
    });

    it('should successfully initiate registration with email from form data', async () => {
        const formData = new FormData();
        formData.append('email', 'user@example.com');

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result).toEqual({
            success: true,
            email: 'user@example.com',
        });

        expect(mockPasswordlessAuthorize).toHaveBeenCalledWith({
            userId: 'user@example.com',
            mode: 'email',
            locale: 'en-US',
            usid: 'test-usid',
            registerCustomer: true,
            firstName: 'John',
            lastName: 'Doe',
            email: 'user@example.com',
        });
    });

    it('should successfully initiate registration with email from basket', async () => {
        const formData = new FormData();

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result).toEqual({
            success: true,
            email: 'test@example.com',
        });

        expect(mockPasswordlessAuthorize).toHaveBeenCalledWith({
            userId: 'test@example.com',
            mode: 'email',
            locale: 'en-US',
            usid: 'test-usid',
            registerCustomer: true,
            firstName: 'John',
            lastName: 'Doe',
            email: 'test@example.com',
        });
    });

    it('should return error when email is not found in form data or basket', async () => {
        mockGetBasket.mockResolvedValue({
            current: {
                customerInfo: {},
            },
        });

        const formData = new FormData();

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result).toEqual({
            success: false,
            error: 'errors:customer.emailRequired',
        });

        expect(mockPasswordlessAuthorize).not.toHaveBeenCalled();
    });

    it('should include dnt parameter when tracking consent is enabled', async () => {
        mockIsTrackingConsentEnabled.mockReturnValue(true);
        mockGetAuth.mockReturnValue({
            usid: 'test-usid',
            trackingConsent: 'optedOut',
        });
        mockTrackingConsentToBoolean.mockReturnValue(true);

        const { trackingConsentToBoolean } = await import('@/types/tracking-consent');
        vi.mocked(trackingConsentToBoolean).mockImplementation(mockTrackingConsentToBoolean);

        const formData = new FormData();
        formData.append('email', 'user@example.com');

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result.success).toBe(true);

        expect(mockPasswordlessAuthorize).toHaveBeenCalledWith({
            userId: 'user@example.com',
            mode: 'email',
            locale: 'en-US',
            usid: 'test-usid',
            registerCustomer: true,
            firstName: 'John',
            lastName: 'Doe',
            email: 'user@example.com',
            dnt: true,
        });
    });

    it('should handle API errors gracefully', async () => {
        mockPasswordlessAuthorize.mockRejectedValue(new Error('API Error'));

        const formData = new FormData();
        formData.append('email', 'user@example.com');

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    it('should parse error message from API response rawBody', async () => {
        const apiError = {
            rawBody: JSON.stringify({ message: 'Email already registered' }),
        };
        mockPasswordlessAuthorize.mockRejectedValue(apiError);

        const formData = new FormData();
        formData.append('email', 'user@example.com');

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result).toEqual({
            success: false,
            error: 'Email already registered',
        });
    });

    it('should include customer info from basket when available', async () => {
        mockGetBasket.mockResolvedValue({
            current: {
                customerInfo: {
                    email: 'john@example.com',
                },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                        },
                    },
                ],
            },
        });

        const formData = new FormData();

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result.success).toBe(true);

        expect(mockPasswordlessAuthorize).toHaveBeenCalledWith(
            expect.objectContaining({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
            })
        );
    });

    it('should block request when enforceTurnstile returns false', async () => {
        mockEnforceTurnstile.mockResolvedValue(false);

        const formData = new FormData();
        formData.append('email', 'user@example.com');

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        const result = await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(result).toEqual({ success: false, error: 'errors:api.forbidden' });
        expect(mockPasswordlessAuthorize).not.toHaveBeenCalled();
    });

    it('should pass turnstileToken to enforceTurnstile', async () => {
        const formData = new FormData();
        formData.append('email', 'user@example.com');
        formData.append('turnstileToken', 'test-token');

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(mockEnforceTurnstile).toHaveBeenCalledWith(
            expect.objectContaining({
                turnstileToken: 'test-token',
                actionName: 'initiate-checkout-registration',
                email: 'user@example.com',
            })
        );
    });

    it('should not call SCAPI when Turnstile blocks the request', async () => {
        mockEnforceTurnstile.mockResolvedValue(false);

        const formData = new FormData();
        formData.append('email', 'user@example.com');

        mockRequest = new Request('http://localhost/action/initiate-checkout-registration', {
            method: 'POST',
            body: formData,
        });

        await action({ request: mockRequest, context: mockContext } as ActionFunctionArgs);

        expect(mockPasswordlessAuthorize).not.toHaveBeenCalled();
        expect(mockGetBasket).not.toHaveBeenCalled();
    });
});
