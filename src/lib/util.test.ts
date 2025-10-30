import { afterEach, vi, test, expect, describe } from 'vitest';
import { Buffer } from 'node:buffer';

describe('stringTo64Base', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    test('uses btoa in browser-like env and encodes correctly', async () => {
        vi.stubGlobal('btoa', (s: string) => Buffer.from(s, 'binary').toString('base64'));
        const util = await import('@/lib/utils');
        expect(util.stringToBase64('hello')).toBe('aGVsbG8=');
    });

    test('falls back to Buffer in non-browser env', async () => {
        vi.stubGlobal('window', undefined);
        const util = await import('@/lib/utils');
        expect(util.stringToBase64('hello')).toBe('aGVsbG8=');
    });
});

describe('validatePassword', () => {
    test('returns all true for a strong password', async () => {
        const util = await import('@/lib/utils');
        expect(util.validatePassword('Abcdef1!')).toEqual({
            minLength: true,
            hasUppercase: true,
            hasLowercase: true,
            hasNumber: true,
            hasSpecialChar: true,
        });
    });

    test('returns correct flags for a weak password', async () => {
        const util = await import('@/lib/utils');
        expect(util.validatePassword('abcdefg')).toEqual({
            minLength: false,
            hasUppercase: false,
            hasLowercase: true,
            hasNumber: false,
            hasSpecialChar: false,
        });
    });
});

describe('isAbsoluteURL', () => {
    test('returns true for absolute HTTP URLs', async () => {
        const util = await import('@/lib/utils');
        expect(util.isAbsoluteURL('http://example.com')).toBe(true);
        expect(util.isAbsoluteURL('http://example.com/path')).toBe(true);
        expect(util.isAbsoluteURL('http://example.com/path?query=value')).toBe(true);
        expect(util.isAbsoluteURL('http://example.com/path#hash')).toBe(true);
    });

    test('returns true for absolute HTTPS URLs', async () => {
        const util = await import('@/lib/utils');
        expect(util.isAbsoluteURL('https://example.com')).toBe(true);
        expect(util.isAbsoluteURL('https://www.example.com/api/v1/data')).toBe(true);
        expect(util.isAbsoluteURL('https://subdomain.example.com:8080/path')).toBe(true);
    });

    test('returns false for relative URLs', async () => {
        const util = await import('@/lib/utils');
        expect(util.isAbsoluteURL('/path/to/resource')).toBe(false);
        expect(util.isAbsoluteURL('./relative/path')).toBe(false);
        expect(util.isAbsoluteURL('../parent/path')).toBe(false);
        expect(util.isAbsoluteURL('relative/path')).toBe(false);
        expect(util.isAbsoluteURL('file.html')).toBe(false);
    });

    test('returns false for query-only and hash-only URLs', async () => {
        const util = await import('@/lib/utils');
        expect(util.isAbsoluteURL('?query=value')).toBe(false);
        expect(util.isAbsoluteURL('#section')).toBe(false);
        expect(util.isAbsoluteURL('?query=value#section')).toBe(false);
    });

    test('returns false for empty or invalid URLs', async () => {
        const util = await import('@/lib/utils');
        expect(util.isAbsoluteURL('')).toBe(false);
        expect(util.isAbsoluteURL('not-a-url')).toBe(false);
        expect(util.isAbsoluteURL('://')).toBe(false);
        expect(util.isAbsoluteURL('http:')).toBe(false);
        expect(util.isAbsoluteURL('http:example.com')).toBe(false);
    });

    test('handles edge cases with valid protocol schemes', async () => {
        const util = await import('@/lib/utils');
        // Valid scheme characters: letters, digits, plus, period, hyphen
        expect(util.isAbsoluteURL('a://example.com')).toBe(true);
        expect(util.isAbsoluteURL('data+xml://example.com')).toBe(true);
        expect(util.isAbsoluteURL('custom-scheme://example.com')).toBe(true);
        expect(util.isAbsoluteURL('scheme.v2://example.com')).toBe(true);
    });
});
