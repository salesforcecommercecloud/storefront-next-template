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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveAssetUrl, isAbsoluteURL, getErrorMessage, parseJsonToStringRecord } from './utils';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

describe('isAbsoluteURL', () => {
    it('should return true for http URLs', () => {
        expect(isAbsoluteURL('http://example.com/image.jpg')).toBe(true);
    });

    it('should return true for https URLs', () => {
        expect(isAbsoluteURL('https://example.com/image.jpg')).toBe(true);
    });

    it('should return true for protocol-relative URLs', () => {
        expect(isAbsoluteURL('//example.com/image.jpg')).toBe(true);
    });

    it('should return false for relative URLs', () => {
        expect(isAbsoluteURL('/images/hero.png')).toBe(false);
        expect(isAbsoluteURL('images/hero.png')).toBe(false);
    });
});

describe('resolveAssetUrl', () => {
    describe('with absolute URLs', () => {
        it('should return http URLs unchanged', () => {
            const url = 'http://example.com/image.jpg';
            expect(resolveAssetUrl(url)).toBe(url);
        });

        it('should return https URLs unchanged', () => {
            const url = 'https://example.com/image.jpg';
            expect(resolveAssetUrl(url)).toBe(url);
        });

        it('should return protocol-relative URLs unchanged', () => {
            const url = '//example.com/image.jpg';
            expect(resolveAssetUrl(url)).toBe(url);
        });

        it('should return data URLs unchanged', () => {
            const url =
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            expect(resolveAssetUrl(url)).toBe(url);
        });
    });

    describe('with URLs already containing bundle path', () => {
        it('should return URLs with bundle path unchanged', () => {
            const url = '/mobify/bundle/60/client/images/hero.png';
            expect(resolveAssetUrl(url)).toBe(url);
        });

        it('should handle bundle path in the middle of URL', () => {
            const url = 'https://cdn.example.com/mobify/bundle/60/client/images/hero.png';
            expect(resolveAssetUrl(url)).toBe(url);
        });

        it('should not double-transform static imports', () => {
            const staticImportUrl = '/mobify/bundle/local/client/images/hero-abc123.png';
            expect(resolveAssetUrl(staticImportUrl)).toBe(staticImportUrl);
        });
    });

    describe('in local development environment (BUNDLE_ID=local)', () => {
        beforeEach(() => {
            // Mock browser environment with local bundle ID
            (window as { _BUNDLE_ID: string })._BUNDLE_ID = 'local';
        });

        afterEach(() => {
            delete (window as { _BUNDLE_ID?: string })._BUNDLE_ID;
        });

        it('should return absolute paths as-is', () => {
            expect(resolveAssetUrl('/images/hero.png')).toBe('/images/hero.png');
        });

        it('should prepend slash to relative paths', () => {
            expect(resolveAssetUrl('images/hero.png')).toBe('/images/hero.png');
        });

        it('should handle nested paths', () => {
            expect(resolveAssetUrl('/assets/images/products/hero.png')).toBe('/assets/images/products/hero.png');
        });

        it('should handle paths with query parameters', () => {
            expect(resolveAssetUrl('/images/hero.png?w=100')).toBe('/images/hero.png?w=100');
        });
    });

    describe('in MRT environment (BUNDLE_ID=60)', () => {
        beforeEach(() => {
            // Mock browser environment with MRT bundle ID
            (window as { _BUNDLE_ID: string })._BUNDLE_ID = '60';
        });

        afterEach(() => {
            delete (window as { _BUNDLE_ID?: string })._BUNDLE_ID;
        });

        it('should prepend bundle path to absolute local paths', () => {
            expect(resolveAssetUrl('/images/hero.png')).toBe('/mobify/bundle/60/client/images/hero.png');
        });

        it('should prepend bundle path to relative local paths', () => {
            expect(resolveAssetUrl('images/hero.png')).toBe('/mobify/bundle/60/client/images/hero.png');
        });

        it('should handle nested directory paths', () => {
            expect(resolveAssetUrl('/assets/images/products/hero.png')).toBe(
                '/mobify/bundle/60/client/assets/images/products/hero.png'
            );
        });

        it('should handle paths with special characters', () => {
            expect(resolveAssetUrl('/images/hero-image_v2.png')).toBe(
                '/mobify/bundle/60/client/images/hero-image_v2.png'
            );
        });

        it('should handle paths with query parameters', () => {
            expect(resolveAssetUrl('/images/hero.png?w=100&h=200')).toBe(
                '/mobify/bundle/60/client/images/hero.png?w=100&h=200'
            );
        });

        it('should handle paths with hash fragments', () => {
            expect(resolveAssetUrl('/images/hero.png#section')).toBe(
                '/mobify/bundle/60/client/images/hero.png#section'
            );
        });
    });

    describe('on server side', () => {
        let originalWindow: typeof globalThis.window;

        beforeEach(() => {
            // Save original window and mock Node.js environment
            originalWindow = globalThis.window;
            vi.stubGlobal('window', undefined);
        });

        afterEach(() => {
            // Restore window and clean up env
            vi.stubGlobal('window', originalWindow);
            delete process.env.BUNDLE_ID;
        });

        it('should use process.env.BUNDLE_ID in MRT', () => {
            process.env.BUNDLE_ID = '140';
            expect(resolveAssetUrl('/images/hero.png')).toBe('/mobify/bundle/140/client/images/hero.png');
        });

        it('should default to "local" when BUNDLE_ID is not set', () => {
            delete process.env.BUNDLE_ID;
            expect(resolveAssetUrl('/images/hero.png')).toBe('/images/hero.png');
        });

        it('should treat BUNDLE_ID=local as local development', () => {
            process.env.BUNDLE_ID = 'local';
            expect(resolveAssetUrl('/images/hero.png')).toBe('/images/hero.png');
            expect(resolveAssetUrl('images/hero.png')).toBe('/images/hero.png');
        });

        it('should handle relative paths on server', () => {
            process.env.BUNDLE_ID = '200';
            expect(resolveAssetUrl('images/hero.png')).toBe('/mobify/bundle/200/client/images/hero.png');
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            (window as { _BUNDLE_ID: string })._BUNDLE_ID = '60';
        });

        afterEach(() => {
            delete (window as { _BUNDLE_ID?: string })._BUNDLE_ID;
        });

        it('should handle empty string', () => {
            expect(resolveAssetUrl('')).toBe('/mobify/bundle/60/client/');
        });

        it('should handle paths with multiple slashes', () => {
            expect(resolveAssetUrl('//images//hero.png')).toBe('//images//hero.png');
        });

        it('should handle paths with dots', () => {
            expect(resolveAssetUrl('/images/../assets/hero.png')).toBe(
                '/mobify/bundle/60/client/images/../assets/hero.png'
            );
        });

        it('should handle paths starting with dot', () => {
            expect(resolveAssetUrl('./images/hero.png')).toBe('/mobify/bundle/60/client/./images/hero.png');
        });
    });

    describe('compatibility with ContentCard usage', () => {
        beforeEach(() => {
            (window as { _BUNDLE_ID: string })._BUNDLE_ID = '60';
        });

        afterEach(() => {
            delete (window as { _BUNDLE_ID?: string })._BUNDLE_ID;
        });

        it('should handle dynamic Page Designer image URLs', () => {
            const pageDesignerUrl = 'https://cdn.commercecloud.salesforce.com/on/demandware.static/images/product.jpg';
            expect(resolveAssetUrl(pageDesignerUrl)).toBe(pageDesignerUrl);
        });

        it('should handle static import fallbacks', () => {
            const staticImport = '/mobify/bundle/60/client/images/hero-abc123.png';
            expect(resolveAssetUrl(staticImport)).toBe(staticImport);
        });

        it('should handle local asset paths from Page Designer', () => {
            expect(resolveAssetUrl('images/hero-cube.webp')).toBe('/mobify/bundle/60/client/images/hero-cube.webp');
        });
    });
});

describe('getErrorMessage', () => {
    describe('with ApiError', () => {
        it('should extract message from rawBody JSON when available', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'POST',
                status: 400,
                statusText: 'Bad Request',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/bad-request',
                    title: 'Bad Request',
                    detail: 'Error detail',
                },
                rawBody: JSON.stringify({ message: 'Invalid email format' }),
            });

            expect(getErrorMessage(error)).toBe('Invalid email format');
        });

        it('should fall back to body.detail when rawBody has no message', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'POST',
                status: 400,
                statusText: 'Bad Request',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/bad-request',
                    title: 'Bad Request',
                    detail: 'Detailed error description',
                },
                rawBody: JSON.stringify({ error: 'some error' }),
            });

            expect(getErrorMessage(error)).toBe('Detailed error description');
        });

        it('should fall back to statusText when rawBody has no message and body.detail is missing', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'GET',
                status: 401,
                statusText: 'Unauthorized',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/unauthorized',
                    title: 'Unauthorized',
                    detail: 'Unauthorized',
                },
                rawBody: JSON.stringify({ error: 'some error' }),
            });

            expect(getErrorMessage(error)).toBe('Unauthorized');
        });

        it('should return default message when all fallbacks fail', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'GET',
                status: 500,
                statusText: '',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/server-error',
                    title: 'Server Error',
                    detail: '',
                },
                rawBody: JSON.stringify({ error: 'some error' }),
            });

            expect(getErrorMessage(error)).toBe('An error occurred');
        });

        it('should handle invalid JSON in rawBody and fall back to body.detail', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'POST',
                status: 400,
                statusText: 'Bad Request',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/bad-request',
                    title: 'Bad Request',
                    detail: 'Detailed error from body',
                },
                rawBody: 'invalid json {',
            });

            expect(getErrorMessage(error)).toBe('Detailed error from body');
        });

        it('should handle invalid JSON in rawBody and fall back to statusText', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'POST',
                status: 400,
                statusText: 'Bad Request',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/bad-request',
                    title: 'Bad Request',
                    detail: '',
                },
                rawBody: 'invalid json {',
            });

            expect(getErrorMessage(error)).toBe('Bad Request');
        });

        it('should handle empty rawBody', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'GET',
                status: 404,
                statusText: 'Not Found',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/not-found',
                    title: 'Not Found',
                    detail: 'Resource not found',
                },
                rawBody: '',
            });

            expect(getErrorMessage(error)).toBe('Resource not found');
        });

        it('should handle rawBody with message as empty string', () => {
            const error = new ApiError({
                url: 'https://api.example.com/test',
                method: 'POST',
                status: 400,
                statusText: 'Bad Request',
                headers: new Headers(),
                body: {
                    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/bad-request',
                    title: 'Bad Request',
                    detail: 'Fallback detail',
                },
                rawBody: JSON.stringify({ message: '' }),
            });

            expect(getErrorMessage(error)).toBe('Fallback detail');
        });
        it('should extract message from standard Error instance', () => {
            const error = new Error('Something went wrong');
            expect(getErrorMessage(error)).toBe('Something went wrong');
        });
        it('should return default message for unknown error type', () => {
            expect(getErrorMessage(404)).toBe('An error occurred');
        });
    });
});

describe('parseJsonToStringRecord', () => {
    it('should return {} for null or undefined', () => {
        expect(parseJsonToStringRecord(null)).toEqual({});
        expect(parseJsonToStringRecord(undefined)).toEqual({});
    });

    it('should return {} for empty string', () => {
        expect(parseJsonToStringRecord('')).toEqual({});
    });

    it('should return {} for invalid JSON', () => {
        expect(parseJsonToStringRecord('not json')).toEqual({});
        expect(parseJsonToStringRecord('{')).toEqual({});
        expect(parseJsonToStringRecord('}')).toEqual({});
        expect(parseJsonToStringRecord('undefined')).toEqual({});
    });

    it('should return {} for non-object JSON (array, number, string, boolean)', () => {
        expect(parseJsonToStringRecord('[]')).toEqual({});
        expect(parseJsonToStringRecord('[1,2]')).toEqual({});
        expect(parseJsonToStringRecord('123')).toEqual({});
        expect(parseJsonToStringRecord('"hello"')).toEqual({});
        expect(parseJsonToStringRecord('true')).toEqual({});
    });

    it('should return empty object for empty object JSON', () => {
        expect(parseJsonToStringRecord('{}')).toEqual({});
    });

    it('should include entries with string values', () => {
        expect(parseJsonToStringRecord('{"device":"mobile","src":"124"}')).toEqual({
            device: 'mobile',
            src: '124',
        });
        expect(parseJsonToStringRecord('{"src":"email"}')).toEqual({ src: 'email' });
    });

    it('should coerce null values to string "null"', () => {
        expect(parseJsonToStringRecord('{"a":null}')).toEqual({ a: 'null' });
        expect(parseJsonToStringRecord('{"x":null,"y":"ok"}')).toEqual({ x: 'null', y: 'ok' });
    });

    it('should omit number, boolean, object, and array values', () => {
        expect(parseJsonToStringRecord('{"s":"ok","n":1}')).toEqual({ s: 'ok' });
        expect(parseJsonToStringRecord('{"s":"ok","b":true}')).toEqual({ s: 'ok' });
        expect(parseJsonToStringRecord('{"s":"ok","o":{}}')).toEqual({ s: 'ok' });
        expect(parseJsonToStringRecord('{"s":"ok","a":[]}')).toEqual({ s: 'ok' });
    });

    it('should handle mixed valid and invalid value types', () => {
        expect(parseJsonToStringRecord('{"device":"mobile","count":2,"active":true}')).toEqual({
            device: 'mobile',
        });
    });
});
