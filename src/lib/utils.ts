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
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Json } from '+types/lang';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const stringToBase64 =
    typeof window === 'object' && typeof window.document === 'object'
        ? (unencoded: string): string => btoa(unencoded)
        : (unencoded: string): string => Buffer.from(unencoded).toString('base64');

export const validatePassword = (password: string) => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[,!%#@$&*()_+\-=[\]{};':"\\|.<>/?]/.test(password),
});

export const isPasswordValid = (password: string) => {
    const validation = validatePassword(password);
    return Object.values(validation).every(Boolean);
};

/**
 * This method extracts the status and message from a ResponseError that is returned
 * by the SCAPI client.
 *
 * The SCAPI client throws an `ApiError` (exported from @salesforce/storefront-next-runtime/scapi).
 * We check for the `response` property and assume it is a ResponseError if present.
 *
 * @throws error if the error is not a ResponseError
 */
export const extractResponseError = async (
    error: unknown
): Promise<{
    status_code: string | undefined;
    type?: string | undefined;
    responseMessage: string | undefined;
    [key: string]: Json | undefined;
}> => {
    // the regular error.message will return only the generic status code message
    // i.e. 'Bad Request' for 400. We need to drill specifically into the ResponseError
    // to get a more descriptive error message from SLAS
    if (error instanceof Error && 'response' in error) {
        const json = (await (error.response as Response).json()) ?? {};
        const { type, status_code, ...rest } = json;

        // TODO: This sort of anticipation of how the user might want the API response to be interpreted
        //  as error message, isn't necessarily a good idea. It's better to pass all properties to the user
        //  let the user decide how to format the error.
        // Extract error message from various possible fields in the API response
        // Salesforce Commerce Cloud API can return error details in different fields
        const responseMessage = (json.message || json.detail || json.title || error.message) as string;

        return {
            status_code,
            type,
            // If we have a structured error with title and detail, combine them for better UX
            responseMessage:
                json.title && json.detail && json.title !== json.detail
                    ? `${json.title}: ${json.detail}`
                    : responseMessage,
            ...rest,
        };
    }
    throw error;
};

/**
 * Type for Commerce SDK error objects that may have status or response properties
 */
interface CommerceSdkError extends Error {
    status?: number | string;
    response?: {
        status?: number | string;
        [key: string]: unknown;
    };
}

/**
 * Type guard to check if an error has status information
 */
function hasStatus(error: unknown): error is CommerceSdkError {
    return (
        typeof error === 'object' &&
        error !== null &&
        ('status' in error || ('response' in error && typeof (error as CommerceSdkError).response === 'object'))
    );
}

/**
 * Extract status code from an error object, handling both direct status and nested response.status
 * This is a fallback when extractResponseError fails to read the response body
 */
export function extractStatusCode(error: unknown): string | undefined {
    if (!hasStatus(error)) {
        return undefined;
    }
    if (typeof error.status === 'number' || typeof error.status === 'string') {
        return String(error.status);
    }
    if (error.response && typeof error.response === 'object' && 'status' in error.response) {
        const responseStatus = error.response.status;
        if (typeof responseStatus === 'number' || typeof responseStatus === 'string') {
            return String(responseStatus);
        }
    }
    return undefined;
}

/**

 * TODO: This method replaces the extractResponseError for the new scapi client. We may want to rename this once we remove extractResponseError
 * Extracts error message from different error types
 * @param error - The error to extract message from
 * @returns A user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        // Try to parse rawBody JSON string first
        if (error.rawBody) {
            try {
                const parsedBody = JSON.parse(error.rawBody);
                if (parsedBody.message) {
                    return parsedBody.message;
                }
            } catch {
                // Failed to parse, fall through to other options
            }
        }
        // Fall back to body.detail or statusText
        return error.body?.detail || error.statusText || 'An error occurred';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An error occurred';
}

/**
 * Returns the application's origin.
 *
 * This function is isomorphic, it can be used on the client and server.
 *
 * On the server, it will return the origin derived from the EXTERNAL_DOMAIN_NAME (from process.env).
 *
 * On the client, it will return the window.location.origin
 */
export const getAppOrigin = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    const EXTERNAL_DOMAIN_NAME = process.env.EXTERNAL_DOMAIN_NAME || 'localhost:5173';
    if (!EXTERNAL_DOMAIN_NAME) {
        throw new Error('Environment variable: "EXTERNAL_DOMAIN_NAME" is not set.');
    }

    const isLocalhost = EXTERNAL_DOMAIN_NAME?.includes('localhost');
    const protocol = isLocalhost ? 'http' : 'https';
    return `${protocol}://${EXTERNAL_DOMAIN_NAME}`;
};

/**
 * Determines whether the specified URL is absolute.
 *
 * @param url The URL to test
 * @returns True if the specified URL is absolute, otherwise false
 */
export const isAbsoluteURL = (url: string): boolean => /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);

/**
 * Check if code is running on the server side
 */
export const isServer = () => typeof window === 'undefined';

/**
 * Retrieves an item from session storage and parses it as JSON
 * @param key - The session storage key
 * @returns The parsed JSON value or undefined if not found or on server
 */
export const getSessionJSONItem = <T = unknown>(key: string): T | undefined => {
    if (isServer()) {
        return undefined;
    }
    try {
        const item = window.sessionStorage.getItem(key);
        if (item) {
            return JSON.parse(item) as T;
        }
    } catch {
        // Failed to parse, ignore silently
    }
    return undefined;
};

/**
 * Sets an item in session storage as a JSON string
 * @param key - The session storage key
 * @param value - The value to stringify and store
 */
export const setSessionJSONItem = <T = unknown>(key: string, value: T): void => {
    if (isServer()) {
        return;
    }
    try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Failed to save, ignore silently
    }
};

export const clearSessionJSONItem = (key: string): void => {
    if (isServer()) {
        return;
    }
    try {
        window.sessionStorage.removeItem(key);
    } catch {
        // Failed to remove, ignore silently
    }
};

/**
 * Resolves a local asset URL to work correctly in both local and MRT (Managed Runtime) environments.
 *
 * When assets are imported directly (e.g., `import hero from '/images/hero.png'`), Vite handles
 * the bundle path transformation at build time. However, for dynamic string paths passed as props,
 * we need to resolve them at runtime.
 *
 * This function:
 * - Returns absolute URLs (http://, https://, data:, //) unchanged
 * - Returns URLs that already contain the bundle path unchanged (e.g., statically imported images)
 * - In local dev, returns paths as-is (e.g., '/images/hero.png')
 * - In MRT, prepends the bundle path (e.g., '/mobify/bundle/60/client/images/hero.png')
 * - Works isomorphically (client and server)
 *
 * @param url The asset URL to resolve (e.g., '/images/hero.png' or 'images/hero.png')
 * @returns The resolved URL with bundle path for MRT, or the original path for local dev
 *
 * @example
 * // Local dev:
 * resolveAssetUrl('/images/hero.png') // → '/images/hero.png'
 * resolveAssetUrl('images/hero.png') // → '/images/hero.png'
 * // On MRT with BUNDLE_ID=60:
 * resolveAssetUrl('/images/hero.png') // → '/mobify/bundle/60/client/images/hero.png'
 * resolveAssetUrl('images/hero.png') // → '/mobify/bundle/60/client/images/hero.png'
 * // Already transformed (static import):
 * resolveAssetUrl('/mobify/bundle/60/client/images/hero.png') // → '/mobify/bundle/60/client/images/hero.png'
 * // External URLs (always unchanged):
 * resolveAssetUrl('http://example.com/image.jpg') // → 'http://example.com/image.jpg'
 */
export const resolveAssetUrl = (url: string): string => {
    // Return absolute URLs unchanged
    if (isAbsoluteURL(url) || url.startsWith('data:')) {
        return url;
    }

    // If the URL already contains the bundle path (e.g., from a static import), return it as-is
    if (url.includes('/mobify/bundle/')) {
        return url;
    }

    // Determine the bundle ID
    // Falls back to 'local' if _BUNDLE_ID is undefined (e.g., in dev mode where bundle config isn't injected)
    const bundleId = (typeof window !== 'undefined' ? window._BUNDLE_ID : process.env.BUNDLE_ID) || 'local';

    // In local development, don't prepend bundle path
    if (bundleId === 'local') {
        // Ensure the URL starts with a slash for consistency
        return url.startsWith('/') ? url : `/${url}`;
    }

    // In MRT, prepend the bundle path
    const bundlePath = `/mobify/bundle/${bundleId}/client/`;
    const normalizedUrl = url.startsWith('/') ? url.slice(1) : url;

    return `${bundlePath}${normalizedUrl}`;
};
