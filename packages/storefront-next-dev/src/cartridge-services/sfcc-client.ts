/**
 * SFCC API client utilities for Commerce Cloud requests
 * Handles SSL, authentication, and network requests for WebDAV and OCAPI
 */

import { type HttpRequestOptions, type HttpResponse, CONTENT_TYPES, WEBDAV_BASE } from './types.js';

/**
 * Create HTTP request options for WebDAV operations (file upload/download)
 *
 * @param instance - The Commerce Cloud instance hostname
 * @param path - The WebDAV path (e.g., '/cartridges')
 * @param basicAuth - Base64 encoded basic authentication credentials (required)
 * @param method - HTTP method (PUT, DELETE, UNZIP, etc.)
 * @param formData - Optional form data for the request
 * @returns Configured HTTP request options for WebDAV operations
 */
export function getWebdavOptions(
    instance: string,
    path: string,
    basicAuth: string,
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData?: Record<string, any>
): HttpRequestOptions {
    const endpoint = `${WEBDAV_BASE}/${path}`;

    const opts: HttpRequestOptions = {
        baseUrl: `https://${instance}`,
        uri: endpoint,
        auth: { basic: basicAuth },
        method,
        ...(formData && { form: formData }),
    };
    return opts;
}

/**
 * Check if an HTTP response indicates an authentication error and throw if so
 *
 * @param response - The HTTP response to check
 * @throws Error with authentication message if status code is 401
 */
export function checkAuthenticationError(response: HttpResponse): void {
    if (response.statusCode === 401) {
        throw new Error('Authentication failed. Please login again.');
    }
}

/**
 * Execute an HTTP request using the native fetch API with default SSL validation
 *
 * This function handles general HTTP requests and does not automatically set Content-Type headers.
 * Callers must set the appropriate Content-Type header in opts.headers based on their body type
 *
 * @param opts - HTTP request configuration including URL, method, headers, and body
 * @returns Promise resolving to an object containing the HTTP response and parsed body
 * @throws Error if the HTTP request fails or cannot be completed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function makeRequest(opts: HttpRequestOptions): Promise<{ response: HttpResponse; body: any }> {
    const url = opts.uri;

    const fetchOptions: RequestInit = {
        ...opts,
        headers: {
            Authorization: `Basic ${opts.auth.basic}`,
            ...opts.headers,
        },
    };

    // Add form data if specified
    if (opts.form) {
        const formData = new URLSearchParams();
        Object.entries(opts.form).forEach(([key, value]) => {
            formData.append(key, String(value));
        });
        fetchOptions.body = formData;
        fetchOptions.headers = {
            ...fetchOptions.headers,
            'Content-Type': CONTENT_TYPES.APPLICATION_FORM_URLENCODED,
        };
    }

    try {
        const response = await fetch(url, fetchOptions);

        const body = response.headers.get('content-type')?.includes(CONTENT_TYPES.APPLICATION_JSON)
            ? await response.json()
            : await response.text();

        // Convert Headers to plain object
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });

        return {
            response: {
                statusCode: response.status,
                statusMessage: response.statusText,
                headers,
            },
            body,
        };
    } catch (error) {
        throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
