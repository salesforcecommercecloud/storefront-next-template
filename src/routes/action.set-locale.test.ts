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
import { describe, test, expect, vi } from 'vitest';
import { action } from './action.set-locale';
import type { ActionFunctionArgs } from 'react-router';
import { createFormDataRequest } from '@/test-utils/request-helpers';

vi.mock('@/middlewares/i18next.server', () => ({
    localeCookie: {
        serialize: vi.fn((locale: string) => Promise.resolve(`lng=${locale}; Path=/`)),
    },
}));

vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        data: (body: any, init?: ResponseInit) => ({ data: body, init }),
    };
});

describe('action.set-locale', () => {
    test('should return success response with locale cookie when given valid locale', async () => {
        const locale = 'es';
        const mockRequest = createFormDataRequest('http://localhost/action/set-locale', 'POST', {
            locale,
        });

        const args: ActionFunctionArgs = {
            request: mockRequest,
            params: {},
            context: {} as any,
            unstable_pattern: 'action/set-locale',
        };

        const result: any = await action(args);

        // Verify the response contains success data
        expect(result.data).toEqual({ success: true });

        // Verify a Set-Cookie header is present (the actual cookie format is implementation detail)
        expect(result.init.headers['Set-Cookie']).toBeDefined();
        expect(result.init.headers['Set-Cookie']).toContain('lng=');
    });

    test('should handle different valid locale values', async () => {
        const testCases = ['en-US', 'es-MX', 'fr-FR', 'de-DE'];

        for (const locale of testCases) {
            const mockRequest = createFormDataRequest('http://localhost/action/set-locale', 'POST', {
                locale,
            });

            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {} as any,
                unstable_pattern: 'action/set-locale',
            };

            const result: any = await action(args);

            expect(result.data).toEqual({ success: true });
            expect(result.init.headers['Set-Cookie']).toBeDefined();
        }
    });

    test('should reject request when locale is missing', async () => {
        const mockRequest = createFormDataRequest('http://localhost/action/set-locale', 'POST', {});

        const args: ActionFunctionArgs = {
            request: mockRequest,
            params: {},
            context: {} as any,
            unstable_pattern: 'action/set-locale',
        };

        try {
            await action(args);
            expect.fail('Expected action to throw a Response');
        } catch (error) {
            expect(error).toBeInstanceOf(Response);
            if (error instanceof Response) {
                expect(error.status).toBe(400);
                const text = await error.text();
                expect(text).toBe('Locale is required');
            }
        }
    });

    test('should reject request when locale is empty string', async () => {
        const mockRequest = createFormDataRequest('http://localhost/action/set-locale', 'POST', {
            locale: '',
        });

        const args: ActionFunctionArgs = {
            request: mockRequest,
            params: {},
            context: {} as any,
            unstable_pattern: 'action/set-locale',
        };

        try {
            await action(args);
            expect.fail('Expected action to throw a Response');
        } catch (error) {
            expect(error).toBeInstanceOf(Response);
            if (error instanceof Response) {
                expect(error.status).toBe(400);
                const text = await error.text();
                expect(text).toBe('Locale is required');
            }
        }
    });
});
