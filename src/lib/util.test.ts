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
