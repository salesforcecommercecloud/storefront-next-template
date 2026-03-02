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
import { action } from './action.update-marketing-consent';
import { createTestContext } from '@/lib/test-utils';
import { createFormDataRequest } from '@/test-utils/request-helpers';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

const mockUpdateSubscription = vi.fn();
vi.mock('@/lib/api/consent', () => ({
    updateSubscription: (...args: unknown[]) => mockUpdateSubscription(...args),
}));

describe('action.update-marketing-consent', () => {
    const mockContext = createTestContext();

    const createRequest = (data: Record<string, string>, method: 'GET' | 'POST' = 'POST'): Request => {
        if (method === 'GET') {
            return new Request('http://localhost/action/update-marketing-consent', { method: 'GET' });
        }
        return createFormDataRequest('http://localhost/action/update-marketing-consent', 'POST', data);
    };

    const validBody = {
        subscriptionId: 'sub-123',
        channel: 'email',
        contactPointValue: 'user@example.com',
        status: 'opt_in',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateSubscription.mockResolvedValue({});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('method and validation', () => {
        it('returns 405 for non-POST requests', async () => {
            const request = createRequest({}, 'GET');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response).toBeInstanceOf(Response);
            expect(response.status).toBe(405);
            const json = await response.json();
            expect(json).toEqual({ success: false, error: 'Method not allowed' });
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });

        it('returns 400 when subscriptionId is missing', async () => {
            const request = createRequest({
                channel: validBody.channel,
                contactPointValue: validBody.contactPointValue,
                status: validBody.status,
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(400);
            const json = await response.json();
            expect(json).toEqual({ success: false, error: 'subscriptionId is required' });
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });

        it('returns 400 when subscriptionId is blank', async () => {
            const request = createRequest({
                subscriptionId: '   ',
                channel: validBody.channel,
                contactPointValue: validBody.contactPointValue,
                status: validBody.status,
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(400);
            const json = await response.json();
            expect(json).toEqual({ success: false, error: 'subscriptionId is required' });
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });

        it('returns 400 when channel is invalid', async () => {
            const request = createRequest({
                subscriptionId: validBody.subscriptionId,
                channel: 'invalid',
                contactPointValue: validBody.contactPointValue,
                status: validBody.status,
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(400);
            const json = await response.json();
            expect(json.success).toBe(false);
            expect(json.error).toContain('channel must be one of');
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });

        it('returns 400 when contactPointValue is missing', async () => {
            const request = createRequest({
                subscriptionId: validBody.subscriptionId,
                channel: validBody.channel,
                status: validBody.status,
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(400);
            const json = await response.json();
            expect(json).toEqual({ success: false, error: 'contactPointValue is required' });
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });

        it('returns 400 when contactPointValue is blank', async () => {
            const request = createRequest({
                subscriptionId: validBody.subscriptionId,
                channel: validBody.channel,
                contactPointValue: '   ',
                status: validBody.status,
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(400);
            const json = await response.json();
            expect(json).toEqual({ success: false, error: 'contactPointValue is required' });
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });

        it('returns 400 when status is invalid', async () => {
            const request = createRequest({
                subscriptionId: validBody.subscriptionId,
                channel: validBody.channel,
                contactPointValue: validBody.contactPointValue,
                status: 'invalid',
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(400);
            const json = await response.json();
            expect(json.success).toBe(false);
            expect(json.error).toContain('status must be one of');
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });
    });

    describe('success', () => {
        it('calls updateSubscription and returns 200 with success true', async () => {
            const request = createRequest(validBody);
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json).toEqual({ success: true });

            expect(mockUpdateSubscription).toHaveBeenCalledTimes(1);
            expect(mockUpdateSubscription).toHaveBeenCalledWith(mockContext, {
                subscriptionId: 'sub-123',
                channel: 'email',
                contactPointValue: 'user@example.com',
                status: 'opt_in',
            });
        });

        it('trims subscriptionId and contactPointValue', async () => {
            const request = createRequest({
                subscriptionId: '  sub-123  ',
                channel: 'sms',
                contactPointValue: '  +15551234567  ',
                status: 'opt_out',
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            await action(args);

            expect(mockUpdateSubscription).toHaveBeenCalledWith(mockContext, {
                subscriptionId: 'sub-123',
                channel: 'sms',
                contactPointValue: '+15551234567',
                status: 'opt_out',
            });
        });

        it('accepts whatsapp channel', async () => {
            const request = createRequest({
                ...validBody,
                channel: 'whatsapp',
                contactPointValue: '+15559876543',
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(200);
            expect(mockUpdateSubscription).toHaveBeenCalledWith(mockContext, {
                subscriptionId: validBody.subscriptionId,
                channel: 'whatsapp',
                contactPointValue: '+15559876543',
                status: 'opt_in',
            });
        });
    });

    describe('error handling', () => {
        it('returns ApiError status and message when updateSubscription throws ApiError', async () => {
            const apiError = new ApiError({ status: 403, body: { message: 'Forbidden' } });
            mockUpdateSubscription.mockRejectedValueOnce(apiError);

            const request = createRequest(validBody);
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(403);
            const json = await response.json();
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
        });

        it('returns 500 and message when updateSubscription throws generic Error', async () => {
            mockUpdateSubscription.mockRejectedValueOnce(new Error('Network error'));

            const request = createRequest(validBody);
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                unstable_pattern: '/action/update-marketing-consent',
            };

            const response = await action(args);
            expect(response.status).toBe(500);
            const json = await response.json();
            expect(json.success).toBe(false);
            expect(json.error).toBe('Network error');
        });
    });
});
