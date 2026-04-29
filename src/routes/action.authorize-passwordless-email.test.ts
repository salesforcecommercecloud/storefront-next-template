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
import { action } from './action.authorize-passwordless-email';
import type { ActionFunctionArgs } from 'react-router';

vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/auth-error-handler');
vi.mock('@salesforce/storefront-next-runtime/i18n');
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
vi.mock('@/lib/cookie-utils.server', () => ({
    createCookie: vi.fn(() => ({
        parse: vi.fn().mockResolvedValue(null),
        serialize: vi.fn().mockResolvedValue('cc-tv=1'),
    })),
    getCookieConfig: vi.fn((overrides = {}) => ({
        httpOnly: false,
        secure: true,
        sameSite: 'lax' as const,
        path: '/',
        ...overrides,
    })),
}));

describe('action.authorize-passwordless-email', () => {
    let mockContext: ActionFunctionArgs['context'];
    let mockAuthorizePasswordless: ReturnType<typeof vi.fn>;
    let mockEnforceTurnstile: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockAuthorizePasswordless = vi.fn().mockResolvedValue(undefined);
        const { authorizePasswordless } = await import('@/middlewares/auth.server');
        vi.mocked(authorizePasswordless).mockImplementation(mockAuthorizePasswordless as typeof authorizePasswordless);

        const { extractErrorMessage, getPasswordlessErrorMessageKey } = await import('@/lib/auth-error-handler');
        vi.mocked(extractErrorMessage).mockReturnValue('error');
        vi.mocked(getPasswordlessErrorMessageKey).mockReturnValue('errors:genericTryAgain');

        mockEnforceTurnstile = vi.mocked((await import('@/lib/turnstile-enforce.server')).enforceTurnstile);
        mockEnforceTurnstile.mockResolvedValue(true);

        mockContext = {} as ActionFunctionArgs['context'];
    });

    it('rejects non-POST requests', async () => {
        const request = new Request('http://localhost/action/authorize-passwordless-email', { method: 'GET' });
        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        expect(result.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('rejects request when email is missing', async () => {
        const formData = new FormData();
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        expect(result.error.code).toBe('REQUIRED_FIELD');
        expect(mockAuthorizePasswordless).not.toHaveBeenCalled();
    });

    it('blocks request when enforceTurnstile returns false', async () => {
        mockEnforceTurnstile.mockResolvedValue(false);

        const formData = new FormData();
        formData.append('email', 'user@example.com');
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        expect(result.error.code).toBe('NOT_AUTHORIZED');
        expect(mockAuthorizePasswordless).not.toHaveBeenCalled();
    });

    it('succeeds when enforceTurnstile allows and email is valid', async () => {
        mockEnforceTurnstile.mockResolvedValue(true);

        const formData = new FormData();
        formData.append('email', 'user@example.com');
        formData.append('turnstileToken', 'valid-token');
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(result).toEqual({ success: true, email: 'user@example.com' });
        expect(mockAuthorizePasswordless).toHaveBeenCalledWith(mockContext, { userid: 'user@example.com' });
    });

    it('passes turnstileToken to enforceTurnstile', async () => {
        const formData = new FormData();
        formData.append('email', 'user@example.com');
        formData.append('turnstileToken', 'my-token');
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        await action({ request, context: mockContext } as ActionFunctionArgs);

        expect(mockEnforceTurnstile).toHaveBeenCalledWith(
            expect.objectContaining({
                turnstileToken: 'my-token',
                actionName: 'authorize-passwordless-email',
                email: 'user@example.com',
            })
        );
    });

    it('handles authorizePasswordless failure gracefully', async () => {
        mockAuthorizePasswordless.mockRejectedValue(new Error('SLAS error'));

        const formData = new FormData();
        formData.append('email', 'user@example.com');
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    it('returns requiresLogin when SLAS responds with 400 email not verified', async () => {
        const { ApiError } = await import('@salesforce/storefront-next-runtime/scapi');
        const apiError = new ApiError({
            status: 400,
            statusText: 'Bad Request',
            headers: new Headers(),
            body: { type: 'error', title: 'Bad Request', detail: 'Email not verified' },
            rawBody: '{"message":"Email not verified"}',
            url: 'https://api.example.com/authorize-passwordless',
            method: 'POST',
        });
        mockAuthorizePasswordless.mockRejectedValue(apiError);
        const { extractErrorMessage } = await import('@/lib/auth-error-handler');
        vi.mocked(extractErrorMessage).mockReturnValue('Email not verified');

        const formData = new FormData();
        formData.append('email', 'user@example.com');
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(false);
        expect(result.requiresLogin).toBe(true);
        expect(result.email).toBe('user@example.com');
        expect(result.error).toBeUndefined();
    });

    it('does not return requiresLogin for 400 with a different error message', async () => {
        const { ApiError } = await import('@salesforce/storefront-next-runtime/scapi');
        const apiError = new ApiError({
            status: 400,
            statusText: 'Bad Request',
            headers: new Headers(),
            body: { type: 'error', title: 'Bad Request', detail: 'Invalid request parameters' },
            rawBody: '{"message":"Invalid request parameters"}',
            url: 'https://api.example.com/authorize-passwordless',
            method: 'POST',
        });
        mockAuthorizePasswordless.mockRejectedValue(apiError);

        const formData = new FormData();
        formData.append('email', 'user@example.com');
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.requiresLogin).toBeUndefined();
        expect(result.error).toBeTruthy();
    });

    it('does not return requiresLogin for non-400 ApiErrors', async () => {
        const { ApiError } = await import('@salesforce/storefront-next-runtime/scapi');
        const apiError = new ApiError({
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Headers(),
            body: { type: 'error', title: 'Server Error', detail: 'Something went wrong' },
            rawBody: '{"type":"error","title":"Server Error","detail":"Something went wrong"}',
            url: 'https://api.example.com/authorize-passwordless',
            method: 'POST',
        });
        mockAuthorizePasswordless.mockRejectedValue(apiError);

        const formData = new FormData();
        formData.append('email', 'user@example.com');
        const request = new Request('http://localhost/action/authorize-passwordless-email', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext } as ActionFunctionArgs);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.success).toBe(false);
        expect(result.requiresLogin).toBeUndefined();
        expect(result.error).toBeTruthy();
    });
});
