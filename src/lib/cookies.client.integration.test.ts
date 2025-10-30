import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCookie } from 'react-router';
import { getCookie, setCookie } from './cookies.client';

/**
 * Integration tests to verify cookie encoding compatibility with React Router.
 *
 * These tests ensure:
 * 1. Double encoding happens correctly (once in setCookie, once in js-cookie)
 * 2. Client-side cookies are compatible with React Router's server-side createCookie
 */

/**
 * Helper function to clear all cookies in the browser
 */
function clearAllCookies(): void {
    document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
}

describe('cookies integration', () => {
    beforeEach(() => {
        clearAllCookies();
    });

    afterEach(() => {
        clearAllCookies();
    });

    describe('double encoding verification', () => {
        it('should handle special characters with double encoding', () => {
            const testData = {
                email: 'test+user@example.com',
                token: 'abc/def=ghi',
                name: 'John Doe!@#$%',
            };
            const cookieName = 'test-special-chars';

            setCookie(cookieName, testData);

            // Verify the data round-trips correctly
            const retrieved = getCookie(cookieName);
            expect(retrieved).toEqual(testData);
        });

        it('should handle unicode characters with double encoding', () => {
            const testData = {
                name: '测试用户',
                emoji: '🚀🎉',
                mixed: 'Hello 世界!',
            };
            const cookieName = 'test-unicode';

            setCookie(cookieName, testData);

            // Verify the data round-trips correctly
            const retrieved = getCookie(cookieName);
            expect(retrieved).toEqual(testData);
        });

        it('should handle empty object consistently', () => {
            const cookieName = 'test-empty';

            setCookie(cookieName, {});
            const retrieved = getCookie(cookieName);
            expect(retrieved).toEqual({});
        });
    });

    describe('React Router createCookie compatibility', () => {
        it('should be compatible with React Router server-side cookie serialization', async () => {
            const testData = { userType: 'registered', customer_id: 'cust-123' };
            const cookieName = 'test-react-router';

            // Create cookie using React Router's createCookie (simulating server-side)
            const reactRouterCookie = createCookie(cookieName, {
                httpOnly: false,
                path: '/',
            });

            // Serialize using React Router (what the server does)
            const setCookieHeader = await reactRouterCookie.serialize(testData);

            // Parse the Set-Cookie header and set it in document.cookie
            const [nameValue] = setCookieHeader.split(';');
            document.cookie = nameValue;

            // Verify our getCookie can read what React Router wrote
            const retrieved = getCookie(cookieName);
            expect(retrieved).toEqual(testData);
        });

        it('should be readable by React Router when set by client-side setCookie', async () => {
            const testData = {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                refresh_token: 'refresh_abc123',
                access_token_expiry: Date.now() + 3600000,
            };
            const cookieName = 'test-our-cookie';

            // Set cookie using our setCookie (simulating client-side)
            setCookie(cookieName, testData);

            // Create React Router cookie instance
            const reactRouterCookie = createCookie(cookieName, {
                httpOnly: false,
                path: '/',
            });

            // Parse using React Router (simulating server-side reading)
            const parsed = await reactRouterCookie.parse(document.cookie);

            expect(parsed).toEqual(testData);
        });

        it('should handle bidirectional compatibility with complex auth data', async () => {
            const authData = {
                userType: 'registered',
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
                refresh_token: 'refresh_token_with_special_chars_=/',
                customer_id: 'user-123-!@#$%^&*()',
                email: 'test+user@example.com',
                usid: 'abc-def-ghi-123',
                access_token_expiry: 1234567890123,
                refresh_token_expiry: 9876543210123,
            };
            const cookieName = '__sfdc_auth';

            // Round trip 1: Client -> Server
            setCookie(cookieName, authData);
            const reactRouterCookie = createCookie(cookieName, {
                httpOnly: false,
                path: '/',
            });
            const serverRead = await reactRouterCookie.parse(document.cookie);
            expect(serverRead).toEqual(authData);

            // Clear cookie
            document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/`;

            // Round trip 2: Server -> Client
            const setCookieHeader = await reactRouterCookie.serialize(authData);
            const [nameValue] = setCookieHeader.split(';');
            document.cookie = nameValue;
            const clientRead = getCookie(cookieName);
            expect(clientRead).toEqual(authData);
        });

        it('should handle base64 padding characters (=) correctly without re-encoding', async () => {
            // Create data that produces base64 with "=" padding at the end
            // Base64 uses "=" for padding when the input length isn't a multiple of 3
            // {"a":1} has 7 characters, which should produce base64 with "==" padding
            const testData = { a: 1 };
            const cookieName = 'test-base64-padding';

            // Round trip 1: Client -> Server
            setCookie(cookieName, testData);
            const reactRouterCookie = createCookie(cookieName, {
                httpOnly: false,
                path: '/',
            });
            const serverRead = await reactRouterCookie.parse(document.cookie);
            expect(serverRead).toEqual(testData);

            // Clear cookie
            document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/`;

            // Round trip 2: Server -> Client
            const setCookieHeader = await reactRouterCookie.serialize(testData);
            const [nameValue] = setCookieHeader.split(';');
            document.cookie = nameValue;
            const clientRead = getCookie(cookieName);
            expect(clientRead).toEqual(testData);
        });
    });
});
