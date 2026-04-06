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

const mockLocaleCookieSerialize = vi.fn((locale: string) => Promise.resolve(`lng=${locale}; Path=/`));

vi.mock('@salesforce/storefront-next-runtime/site-context', () => ({
    getSiteContextCookies: vi.fn(() => ({
        siteCookie: {
            serialize: vi.fn(),
        },
        localeCookie: {
            serialize: mockLocaleCookieSerialize,
        },
    })),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

describe('action.set-locale', () => {
    test('should return redirect response with locale cookie when given valid locale', async () => {
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

        const result = (await action(args)) as Response;

        // Verify the response is a redirect
        expect(result.status).toBe(302);
        expect(result.headers.get('Location')).toBe('/');

        // Verify a Set-Cookie header is present
        expect(result.headers.get('Set-Cookie')).toContain('lng=');
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

            const result = (await action(args)) as Response;

            expect(result.status).toBe(302);
            expect(result.headers.get('Set-Cookie')).toContain('lng=');
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
