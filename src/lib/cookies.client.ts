/* eslint-disable @typescript-eslint/no-explicit-any */
import Cookies from 'js-cookie';
import { getCookieConfig, type CookieConfig } from './cookie-utils';

// Re-export for backwards compatibility
export { getCookieConfig, type CookieConfig };

/**
 * Returns the decoded value of a cookie that originally got created by React Router's server runtime (e.g.
 * `createCookie`). The method uses {@link decodeURIComponent} twice because of the two involved libraries
 * on the server.
 * @see {@link https://github.com/remix-run/react-router/blob/cb9a090316003988ff367bb2f2d1ef5bd03bd3af/packages/react-router/lib/server-runtime/cookies.ts#L178}
 * @see {@link https://github.com/jshttp/cookie/blob/13d558f6840fac9c66243be217597a6e2f288335/src/index.ts#L366}
 */
export const getCookie = <T extends Record<string, any>>(name: string): T => {
    try {
        const cookie = Cookies.get(name);
        return (cookie ? JSON.parse(decodeURIComponent(myEscape(atob(cookie)))) : {}) as T;
    } catch {
        return {} as T;
    }
};

/**
 * Sets an encoded value for a cookie with configurable attributes that that can seamlessly be used by React Router's server runtime (e.g.
 * `createCookie`). The method uses {@link encodeURIComponent} twice because of the two involved libraries
 * on the server.
 *
 * Cookie attribute precedence (highest to lowest):
 * 1. Cookie configuration overrides (from environment variables)
 * 2. Cookie options passed to the function
 * 3. Default cookie attributes (secure: true, sameSite: 'lax', etc.)
 *
 * @see {@link https://github.com/remix-run/react-router/blob/cb9a090316003988ff367bb2f2d1ef5bd03bd3af/packages/react-router/lib/server-runtime/cookies.ts#L174}
 * @see {@link https://github.com/jshttp/cookie/blob/13d558f6840fac9c66243be217597a6e2f288335/src/index.ts#L253}
 */
export const setCookie = <T extends Record<string, any>>(
    name: string,
    value: T,
    cookieOptions?: CookieConfig
): string | undefined => {
    const encodedValue = value ? btoa(myUnescape(encodeURIComponent(JSON.stringify(value)))) : '';
    const cookieConfig = getCookieConfig(cookieOptions);
    return Cookies.set(name, encodedValue, cookieConfig);
};

export const removeCookie = (name: string): void => {
    Cookies.remove(name);
};

/**
 * Custom escape function copied from React Router to match server-side cookie deserialization logic.
 *
 * The server module uses React Router for cookie deserialization with the following flow:
 * decodeURIComponent() → myEscape() → atob() → decodeURIComponent() → JSON.parse()
 *
 * To maintain compatibility, we copy the same function from React Router.
 *
 * @see {@link https://github.com/remix-run/react-router/blob/6d542b9f4679c59533c309bb86627e222d3d3501/packages/react-router/lib/server-runtime/cookies.ts}
 * @todo Consider passing our own encoding function to React Router once this issue is resolved:
 *       {@link https://github.com/remix-run/react-router/issues/13751}
 * @internal Exported for testing purposes only
 */
export function myEscape(value: string): string {
    const str = value.toString();
    let result = '';
    let index = 0;
    let chr, code;
    while (index < str.length) {
        chr = str.charAt(index++);
        if (/[\w*+\-./@]/.exec(chr)) {
            result += chr;
        } else {
            code = chr.charCodeAt(0);
            if (code < 256) {
                result += `%${hex(code, 2)}`;
            } else {
                result += `%u${hex(code, 4).toUpperCase()}`;
            }
        }
    }
    return result;
}

function hex(code: number, length: number): string {
    let result = code.toString(16);
    while (result.length < length) result = `0${result}`;
    return result;
}

/**
 * Custom unescape function copied from React Router to match server-side cookie serialization logic.
 *
 * The server module uses React Router for cookie serialization with the following flow:
 * JSON.stringify() → encodeURIComponent() → myUnescape() → btoa() → encodeURIComponent()
 *
 * This function handles both standard percent-encoding and Unicode escape sequences (%uXXXX format)
 * during the serialization process.
 *
 * @see {@link https://github.com/remix-run/react-router/blob/6d542b9f4679c59533c309bb86627e222d3d3501/packages/react-router/lib/server-runtime/cookies.ts}
 * @internal Exported for testing purposes only
 */
export function myUnescape(value: string): string {
    const str = value.toString();
    let result = '';
    let index = 0;
    let chr, part;
    while (index < str.length) {
        chr = str.charAt(index++);
        if (chr === '%') {
            if (str.charAt(index) === 'u') {
                part = str.slice(index + 1, index + 5);
                if (/^[\da-f]{4}$/i.exec(part)) {
                    result += String.fromCharCode(parseInt(part, 16));
                    index += 5;
                    continue;
                }
            } else {
                part = str.slice(index, index + 2);
                if (/^[\da-f]{2}$/i.exec(part)) {
                    result += String.fromCharCode(parseInt(part, 16));
                    index += 2;
                    continue;
                }
            }
        }
        result += chr;
    }
    return result;
}
