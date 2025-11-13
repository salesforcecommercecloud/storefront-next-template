/**
 * Proxy client factory for operation-based API calls
 *
 * This module creates a proxied version of an openapi-fetch client that
 * allows calling operations by their operation name instead of using
 * HTTP methods and path strings.
 *
 * Example transformation:
 *   Before: client.GET('/organizations/{organizationId}/categories', options)
 *   After:  client.getCategories(options)
 *
 * The proxy maintains full type safety and has minimal runtime overhead.
 */

import type { Client } from 'openapi-fetch';
import type { OperationMap, ProxyClient } from './proxy-types';
import { ApiError } from './ApiError';

/**
 * Create a proxied client with operation methods
 *
 * This function wraps an openapi-fetch client with a JavaScript Proxy that
 * intercepts property access. When an operation method is called, it:
 *
 * 1. Looks up the operation in the operation map
 * 2. Extracts the HTTP method (m) and path (b + s)
 * 3. Reconstructs the full path from base + suffix
 * 4. Calls the appropriate client method with the path and options
 *
 * Operation format uses abbreviated keys for bundle size optimization:
 * - m: HTTP method (GET, POST, etc.)
 * - b: Base path shared across operations
 * - s: Suffix path unique to this operation
 *
 * All other property accesses (like .use(), .eject(), etc.) are passed
 * through to the original client unchanged.
 *
 * @typeParam TClient - The openapi-fetch Client type
 * @typeParam TOperations - The operation map type
 *
 * @param client - The base openapi-fetch client instance
 * @param operations - The operation map object (generated at build time)
 * @returns A proxied client with operation methods
 *
 * @example
 * ```typescript
 * import createClient from 'openapi-fetch';
 * import { operations } from './generated/shopper-products-v1.operations';
 * import type { paths } from './generated/shopper-products-v1';
 *
 * const baseClient = createClient<paths>({ baseUrl: 'https://api.example.com' });
 * const client = createClient(baseClient, operations);
 *
 * // Now you can call operations directly:
 * const response = await client.getCategories({
 *   params: {
 *     path: { organizationId: 'xxx' },
 *     query: { ids: ['root'], siteId: 'RefArch' }
 *   }
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient<TClient extends Client<any, any>, TOperations extends OperationMap>(
    client: TClient,
    operations: TOperations
): ProxyClient<TClient, TOperations> {
    // Create and return the proxy
    return new Proxy(client, {
        /**
         * Proxy get trap - intercepts property access
         *
         * When a property is accessed on the proxy client:
         * 1. Check if it's an operation method name
         * 2. If yes, return a function that calls the appropriate HTTP method
         * 3. If no, return the original client property
         *
         * @param target - The original client instance
         * @param prop - The property being accessed
         * @returns The property value or operation method function
         */
        get(target, prop) {
            // Check if this is an operation method
            if (typeof prop === 'string' && prop in operations) {
                const operationInfo = operations[prop];

                // Extract operation info with abbreviated keys
                // m: HTTP method, b: base path, s: suffix path
                const { m: method, b: base, s: suffix } = operationInfo;

                // Reconstruct the full path from base + suffix
                const path = base + suffix;

                // Return an async function that calls the HTTP method and handles errors
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return async function (this: any, ...args: any[]) {
                    // Get the HTTP method function (GET, POST, etc.)
                    const httpMethod = method.toUpperCase();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const clientMethod = (target as any)[httpMethod];

                    if (typeof clientMethod !== 'function') {
                        throw new Error(
                            `Client method ${httpMethod} not found. This is likely a bug in the proxy client.`
                        );
                    }

                    // Call the HTTP method with the path and options
                    // The path is bound, options are passed from the operation call
                    // openapi-fetch returns { data, error, response }

                    const result = await clientMethod.call(target, path, ...args);

                    // If there's an error, parse the response body and throw ApiError
                    if (result.error !== undefined) {
                        const response = result.response;

                        // Read the raw response body
                        // Use clone() to allow the body to be read multiple times
                        const rawBody = await response.clone().text();

                        // Try to parse the body as JSON, fall back to raw text
                        let parsedBody: Record<string, unknown> | null = null;
                        try {
                            parsedBody = JSON.parse(rawBody);
                        } catch {
                            // If JSON parsing fails, leave parsedBody as null
                        }

                        // Throw a typed ApiError with all response details
                        throw new ApiError({
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            body: parsedBody,
                            rawBody,
                            url: response.url,
                            method: httpMethod,
                        });
                    }

                    // On success, return { data, response } without the error property
                    return {
                        data: result.data,
                        response: result.response,
                    };
                };
            }

            // Only pass through middleware methods (use, eject)
            // All other properties (GET, POST, etc.) are intentionally hidden
            if (prop === 'use' || prop === 'eject') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const value = (target as any)[prop];
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            }

            // Undefined for any other property access
            return undefined;
        },
    }) as ProxyClient<TClient, TOperations>;
}
