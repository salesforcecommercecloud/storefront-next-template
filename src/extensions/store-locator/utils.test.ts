/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSelectedStoreInfoCookieName, getCookieFromRequestAs, getCookieFromDocumentAs } from './utils';

describe('getSelectedStoreInfoCookieName', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns cookie name with site ID from environment', () => {
        const result = getSelectedStoreInfoCookieName();
        // The actual site ID depends on the environment variable PUBLIC_COMMERCE_API_SITE_ID
        // In the test environment, it should be 'RefArchGlobal' or fallback to 'site-default'
        expect(result).toMatch(/^selectedStoreInfo_/);
        expect(result.length).toBeGreaterThan('selectedStoreInfo_'.length);
    });

    it('returns a consistent cookie name format', () => {
        const result1 = getSelectedStoreInfoCookieName();
        const result2 = getSelectedStoreInfoCookieName();

        // Should return the same value on multiple calls
        expect(result1).toBe(result2);

        // Should follow the expected format
        expect(result1).toMatch(/^selectedStoreInfo_[a-zA-Z0-9_-]+$/);
    });
});

describe('getCookieFromRequestAs', () => {
    let mockRequest: Request;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when Cookie header is missing', () => {
        mockRequest = new Request('https://example.com', {
            headers: {},
        });

        const result = getCookieFromRequestAs<{ test: string }>(mockRequest, 'testCookie');
        expect(result).toBeNull();
    });

    it('returns null when cookie is not found', () => {
        mockRequest = new Request('https://example.com', {
            headers: {
                Cookie: 'otherCookie=value; anotherCookie=anotherValue',
            },
        });

        const result = getCookieFromRequestAs<{ test: string }>(mockRequest, 'testCookie');
        expect(result).toBeNull();
    });

    it('returns parsed cookie value when found', () => {
        const cookieValue = { test: 'value', number: 123 };
        mockRequest = new Request('https://example.com', {
            headers: {
                Cookie: `testCookie=${encodeURIComponent(JSON.stringify(cookieValue))}; otherCookie=value`,
            },
        });

        const result = getCookieFromRequestAs<{ test: string; number: number }>(mockRequest, 'testCookie');
        expect(result).toEqual(cookieValue);
    });

    it('returns null when cookie value is invalid JSON', () => {
        mockRequest = new Request('https://example.com', {
            headers: {
                Cookie: 'testCookie=invalid-json; otherCookie=value',
            },
        });

        const result = getCookieFromRequestAs<{ test: string }>(mockRequest, 'testCookie');
        expect(result).toBeNull();
    });

    it('returns null when cookie value is not an object', () => {
        mockRequest = new Request('https://example.com', {
            headers: {
                Cookie: `testCookie=${encodeURIComponent(JSON.stringify('string-value'))}; otherCookie=value`,
            },
        });

        const result = getCookieFromRequestAs<{ test: string }>(mockRequest, 'testCookie');
        expect(result).toBeNull();
    });

    it('handles cookies with special characters in values', () => {
        const cookieValue = { test: 'value with = and ; characters', special: 'test=value;more' };
        mockRequest = new Request('https://example.com', {
            headers: {
                Cookie: `testCookie=${encodeURIComponent(JSON.stringify(cookieValue))}; otherCookie=value`,
            },
        });

        const result = getCookieFromRequestAs<{ test: string; special: string }>(mockRequest, 'testCookie');
        expect(result).toEqual(cookieValue);
    });

    it('handles malformed cookies gracefully', () => {
        mockRequest = new Request('https://example.com', {
            headers: {
                Cookie: 'malformed=; testCookie={"test":"value"}; another=',
            },
        });

        const result = getCookieFromRequestAs<{ test: string }>(mockRequest, 'testCookie');
        expect(result).toEqual({ test: 'value' });
    });

    it('handles URL decoding errors gracefully', () => {
        mockRequest = new Request('https://example.com', {
            headers: {
                Cookie: 'testCookie=%invalid-encoding; otherCookie=value',
            },
        });

        const result = getCookieFromRequestAs<{ test: string }>(mockRequest, 'testCookie');
        expect(result).toBeNull();
    });
});

describe('getCookieFromDocumentAs', () => {
    let originalDocument: Document;

    beforeEach(() => {
        vi.clearAllMocks();
        originalDocument = global.document;
        // Mock document.cookie
        Object.defineProperty(global.document, 'cookie', {
            writable: true,
            value: '',
        });
    });

    afterEach(() => {
        global.document = originalDocument;
    });

    it('returns null when cookie is not found', () => {
        document.cookie = 'otherCookie=value; anotherCookie=anotherValue';

        const result = getCookieFromDocumentAs<{ test: string }>('testCookie');
        expect(result).toBeNull();
    });

    it('returns parsed cookie value when found', () => {
        const cookieValue = { test: 'value', number: 123 };
        document.cookie = `testCookie=${encodeURIComponent(JSON.stringify(cookieValue))}; otherCookie=value`;

        const result = getCookieFromDocumentAs<{ test: string; number: number }>('testCookie');
        expect(result).toEqual(cookieValue);
    });

    it('returns null when cookie value is invalid JSON', () => {
        document.cookie = 'testCookie=invalid-json; otherCookie=value';

        const result = getCookieFromDocumentAs<{ test: string }>('testCookie');
        expect(result).toBeNull();
    });

    it('returns null when cookie value is not an object', () => {
        document.cookie = `testCookie=${encodeURIComponent(JSON.stringify('string-value'))}; otherCookie=value`;

        const result = getCookieFromDocumentAs<{ test: string }>('testCookie');
        expect(result).toBeNull();
    });

    it('handles cookies with special characters in values', () => {
        const cookieValue = { test: 'value with = and ; characters', special: 'test=value;more' };
        document.cookie = `testCookie=${encodeURIComponent(JSON.stringify(cookieValue))}; otherCookie=value`;

        const result = getCookieFromDocumentAs<{ test: string; special: string }>('testCookie');
        expect(result).toEqual(cookieValue);
    });

    it('handles malformed cookies gracefully', () => {
        document.cookie = 'malformed=; testCookie={"test":"value"}; another=';

        const result = getCookieFromDocumentAs<{ test: string }>('testCookie');
        expect(result).toEqual({ test: 'value' });
    });

    it('handles URL decoding errors gracefully', () => {
        document.cookie = 'testCookie=%invalid-encoding; otherCookie=value';

        const result = getCookieFromDocumentAs<{ test: string }>('testCookie');
        expect(result).toBeNull();
    });

    it('handles empty document.cookie', () => {
        document.cookie = '';

        const result = getCookieFromDocumentAs<{ test: string }>('testCookie');
        expect(result).toBeNull();
    });
});
