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

import { decodeBase64Url } from '@/lib/url';
import { extractResponseError, getErrorMessage } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients.server';
import type { AppClients } from '@/scapi/custom-clients';
import { ApiError, type OperationMethodsOnly } from '@salesforce/storefront-next-runtime/scapi';

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { getLogger } from '@/lib/logger.server';

/**
 * Single source of truth for which Clients namespaces are helpers.
 * Runtime allow-list that also drives the type-level allow-list below.
 * Prevents crafted URLs from accessing non-helper namespaces (e.g., shopperCustomers).
 *
 * To expose a new helper namespace via `useScapiFetcher('helpers', ...)`:
 *   1. Add the namespace to the `Clients` type in storefront-next-runtime/scapi
 *   2. Add it to this record — types and runtime validation update automatically
 *
 * `Pick<Clients, ...>` will error if a key here doesn't exist on `Clients`.
 */
const HELPER_NAMESPACE_MAP = { auth: true, basket: true } as const;
const HELPER_NAMESPACES = new Set(Object.keys(HELPER_NAMESPACE_MAP));

/**
 * Keys for helper namespaces (e.g., 'auth', 'basket'), derived from the runtime allow-list.
 */
export type HelperNamespaceKeyMap = keyof typeof HELPER_NAMESPACE_MAP;

/**
 * Helper namespaces available on the Clients object from `@salesforce/storefront-next-runtime/scapi`.
 * Unlike SCAPI proxy clients (e.g. `shopperProducts`, `shopperCustomers`), helper namespaces
 * expose domain-specific utility methods that aren't direct 1:1 SCAPI endpoint proxies.
 */
export type HelperNamespaces = Pick<AppClients, HelperNamespaceKeyMap>;

/**
 * Type representing Commerce SDK client names (camelCase)
 * These are the keys from the app's merged client map, including custom clients.
 */
export type CommerceSdkKeyMap = Exclude<keyof AppClients, 'use' | HelperNamespaceKeyMap>;

/**
 * Type helper to get the client type from a client name
 */
export type CommerceSdkCtorFromKey<C extends CommerceSdkKeyMap> = AppClients[C];

/**
 * Type representing valid operation method names for a Commerce SDK client.
 * This relies on OperationMethodsOnly (from storefront-next-runtime) to exclude
 * 'use' and 'eject' methods. The intersection with keyof CommerceSdkCtorFromKey<C>
 * is needed for type inference, but TypeScript's intersection of keyof types can
 * reintroduce excluded keys, so we explicitly exclude them again as a safeguard.
 * @template C - The Commerce SDK client key
 */
export type CommerceSdkMethodName<C extends CommerceSdkKeyMap> = Exclude<
    keyof OperationMethodsOnly<CommerceSdkCtorFromKey<C>> & string & keyof CommerceSdkCtorFromKey<C>,
    'use' | 'eject'
>;

/**
 * Type helper to extract the return type of a Commerce SDK method.
 * @template C - The Commerce SDK client key
 * @template M - The method name on the Commerce SDK client
 */
export type CommerceSdkMethodReturnType<C extends CommerceSdkKeyMap, M extends CommerceSdkMethodName<C>> = ReturnType<
    CommerceSdkCtorFromKey<C>[M] extends (...a: any[]) => any ? CommerceSdkCtorFromKey<C>[M] : never // eslint-disable-line @typescript-eslint/no-explicit-any
>;

/**
 * Type helper to extract the parameters of a Commerce SDK method.
 * @template C - The Commerce SDK client key
 * @template M - The method name on the Commerce SDK client
 */
export type CommerceSdkMethodParameters<C extends CommerceSdkKeyMap, M extends CommerceSdkMethodName<C>> = Parameters<
    CommerceSdkCtorFromKey<C>[M] extends (...a: any[]) => any ? CommerceSdkCtorFromKey<C>[M] : never // eslint-disable-line @typescript-eslint/no-explicit-any
>;

/**
 * Type representing valid callable method names for a helper namespace.
 * Filters to only include functions (excludes sub-namespaces which are objects).
 * @template H - The helper namespace key
 */
export type HelperMethodName<H extends HelperNamespaceKeyMap> = {
    [K in keyof AppClients[H]]: AppClients[H][K] extends (...args: any[]) => any ? K : never; // eslint-disable-line @typescript-eslint/no-explicit-any
}[keyof AppClients[H]] &
    string;

/**
 * Type helper to extract the return type of a helper method.
 * @template H - The helper namespace key
 * @template M - The method name on the helper namespace
 */
export type HelperMethodReturnType<
    H extends HelperNamespaceKeyMap,
    M extends HelperMethodName<H>,
> = M extends keyof AppClients[H] ? (AppClients[H][M] extends (...args: any[]) => infer R ? R : never) : never; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Type helper to extract the parameters of a helper method.
 * @template H - The helper namespace key
 * @template M - The method name on the helper namespace
 */
export type HelperMethodParameters<
    H extends HelperNamespaceKeyMap,
    M extends HelperMethodName<H>,
> = M extends keyof AppClients[H] ? (AppClients[H][M] extends (...args: infer P) => any ? P : never) : never; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Structured response type for API operations
 * @template T - The type of data returned on success
 */
export interface ApiResponse<T = unknown> {
    /** Whether the operation was successful */
    success: boolean;
    /** Array of error messages if the operation failed */
    errors?: string[];
    /** Data returned on successful operation */
    data?: T;
}

// Default empty array string for resource parameter fallback
const DEFAULT_RESOURCE_ARRAY = '[]';

/**
 * Parses the resource parameter from the URL, handling null/undefined cases
 * @param resourceParam - The resource parameter from the URL params
 * @returns Parsed resource array [client, method, options] or throws TypeError if invalid
 */
function parseResourceParameter<T = [unknown, string, unknown[]]>(resourceParam: string | null | undefined): T {
    const resourceString = resourceParam ?? DEFAULT_RESOURCE_ARRAY;
    const resource =
        resourceString === DEFAULT_RESOURCE_ARRAY ? [] : (JSON.parse(decodeBase64Url(resourceString)) as unknown[]);

    if (!Array.isArray(resource) || resource.length !== 3) {
        throw new TypeError('Unexpected resource format');
    }

    return resource as T;
}

/**
 * Resolves a helper namespace function and parsed options from a resource tuple.
 * Used by both loader and action to avoid duplicating validation logic.
 * @param clients - The Clients object from createApiClients
 * @param resource - The parsed resource tuple [client, method, payload]
 * @returns The resolved helper function (bound), helper name, and parsed options
 */
function resolveHelper(clients: ReturnType<typeof createApiClients>, resource: [unknown, unknown, unknown]) {
    const namespace = resource[1] as string;
    if (!HELPER_NAMESPACES.has(namespace)) {
        throw new TypeError(`Unknown helper namespace: "${namespace}"`);
    }
    const { helperName, ...options } = (resource[2] as Record<string, unknown>) || {};
    const helper = clients[namespace as HelperNamespaceKeyMap] as unknown as Record<string, unknown>;
    const methodName = String(helperName);

    if (!helper || typeof helper[methodName] !== 'function') {
        throw new TypeError(`Helper method not found: "helpers.${namespace}.${methodName}"`);
    }

    const fn = helper[methodName].bind(helper) as (...args: unknown[]) => Promise<unknown>;
    return { fn, helperName: methodName, options };
}

/**
 * A React Router server loader that's part of our Commerce SDK fetch API trinity. The trinity consists of this route's
 * loaders, the `scapi` service, and the `useScapiFetcher` hook. The purpose of these three entities is to simplify and
 * centralize the way to interact with the Commerce SDK methods right inside this loader function. This makes this
 * route virtually the heart of the Commerce SDK access/interaction.
 *
 * The loader expects a Commerce SDK client's name, a method name and method parameters to be passed as route
 * parameters. It then instantiates the targeted client, invokes the method and returns structured data.
 * If an error occurs, it returns an ApiResponse with success: false and error message.
 * @see {@link import('react-router').ClientLoaderFunction}
 * @see {@link import('@/hooks/use-scapi-fetcher.ts').useScapiFetcher}
 * @see {@link import('@/lib/api-clients.ts').createApiClients}
 */
export async function loader<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>({ params, context }: LoaderFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    const logger = getLogger(context);
    logger.debug('ApiClientResource: loader starting', { resource: params.resource });

    let resource: [C, M, P];
    try {
        resource = parseResourceParameter<[C, M, P]>(params.resource);
    } catch (error) {
        logger.warn('ApiClientResource: failed to parse resource parameter', { error });
        return {
            success: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
    }

    try {
        const clients = createApiClients(context);

        // Handle helper namespace calls (e.g., ['helpers', 'basket', { helperName: 'getOrCreateBasket', ...options }])
        if ((resource[0] as string) === 'helpers') {
            const { fn, options } = resolveHelper(clients, resource as [unknown, unknown, unknown]);
            // Helpers return data directly (not { data, response })
            const data = (await fn(Object.keys(options).length > 0 ? options : undefined)) as Awaited<R>;
            return { success: true, data };
        }

        const clientKey = resource[0] as keyof AppClients;
        const client = clients[clientKey] as Record<string, unknown>;
        const methodName = resource[1] as string;

        if (!client || typeof client[methodName] !== 'function') {
            throw new TypeError(`Method not found: "${resource[0]}.${methodName}"`);
        }

        // Parameters are already in the new format: { params: { path: {...}, query: {...} }, body: {...} }
        const options = (resource[2] as Record<string, unknown>) || {};

        // Call the method - new API returns { data, response }
        const result = (await client[methodName](options)) as Record<string, unknown>;

        // Extract data from the new response format
        const data = result?.data as Awaited<R>;

        return {
            success: true,
            data,
        };
    } catch (reason) {
        logger.error('ApiClientResource: loader method call failed', {
            error: reason,
            client: resource[0],
            method: resource[1],
            ...((resource[0] as string) === 'helpers' && {
                helper: (resource[2] as Record<string, unknown>)?.helperName,
            }),
        });
        let errorMessage: string;
        // Use getErrorMessage for ApiError instances (new Commerce SDK format)
        if (reason instanceof ApiError) {
            errorMessage = getErrorMessage(reason);
        } else {
            // Fall back to extractResponseError for legacy ResponseError format
            try {
                const { responseMessage } = await extractResponseError(reason as Error);
                errorMessage = responseMessage || 'Unknown error';
            } catch {
                errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
            }
        }
        return {
            success: false,
            errors: [errorMessage],
        };
    }
}

/**
 * A React Router server action that's part of our Commerce SDK fetch API trinity. The trinity consists of this route's
 * loaders/actions, the `fetch` service, and the `useScapiFetcher` hook. The purpose of these three entities is to simplify and
 * centralize the way to interact with the Commerce SDK methods right inside this action function. This makes this
 * route virtually the heart of the Commerce SDK access/interaction.
 *
 * The action expects a Commerce SDK client's name, a method name and method parameters to be passed as route
 * parameters. It then instantiates the targeted client, invokes the method and returns structured data.
 * If an error occurs, it returns an ApiResponse with success: false and error message.
 *
 * This action is specifically designed for non-GET requests (PUT, POST, DELETE, etc.) and uses the shared `act` function
 * to handle the actual Commerce SDK method invocation.
 * @see {@link import('react-router').ActionFunction}
 * @see {@link import('@/hooks/use-scapi-fetcher.ts').useScapiFetcher}
 * @see {@link import('@/lib/api-clients.server').createApiClients}
 */
export async function action<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>({ params, context, request }: ActionFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    const logger = getLogger(context);
    logger.debug('ApiClientResource: action starting', { resource: params.resource });

    let resource: [C, M, P];
    try {
        resource = parseResourceParameter<[C, M, P]>(params.resource);
    } catch (error) {
        logger.warn('ApiClientResource: failed to parse resource parameter in action', { error });
        return {
            success: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
    }

    try {
        // Extract form data from the request
        const formData = await request.formData();

        // Convert FormData to a plain object for the body
        // Note: FormData converts all values to strings, so we need to convert known fields back to their proper types
        const bodyData: Record<string, FormDataEntryValue | boolean | number | null> = {};
        for (const [key, value] of formData.entries()) {
            // Convert known boolean fields from string to boolean
            if (key === 'preferred' && typeof value === 'string') {
                bodyData[key] = value === 'true' || value === '1';
            }
            // Convert known numeric fields from string to number, or null to clear
            else if (key === 'gender' && typeof value === 'string') {
                // If empty string, send null to clear the field; otherwise convert to number
                // If parsing fails (NaN), treat as null to avoid sending invalid data
                if (value === '') {
                    bodyData[key] = null;
                } else {
                    const parsed = parseInt(value, 10);
                    bodyData[key] = isNaN(parsed) ? null : parsed;
                }
            } else {
                bodyData[key] = value;
            }
        }

        const clients = createApiClients(context);

        // Handle helper namespace calls
        if ((resource[0] as string) === 'helpers') {
            const { fn, options } = resolveHelper(clients, resource as [unknown, unknown, unknown]);

            // Merge strategy depends on the helper's argument shape:
            // - If options already has a `body` key (e.g., basket helpers), merge form data into body
            // - Otherwise (e.g., auth helpers with flat args), merge form data at top level
            const mergedOptions =
                'body' in options
                    ? { ...options, body: { ...(options.body as Record<string, unknown>), ...bodyData } }
                    : { ...options, ...bodyData };

            // Helpers return data directly (not { data, response })
            const data = (await fn(Object.keys(mergedOptions).length > 0 ? mergedOptions : undefined)) as Awaited<R>;
            return { success: true, data };
        }

        // Parameters are already in the new format: { params: { path: {...}, query: {...} }, body: {...} }
        const options = (resource[2] as Record<string, unknown>) || {};

        // Merge form data into the body
        const newParams = {
            ...options,
            body: {
                ...((options.body as Record<string, unknown>) || {}),
                ...bodyData,
            },
        };

        const clientKey = resource[0] as keyof AppClients;
        const client = clients[clientKey] as Record<string, unknown>;
        const methodName = resource[1] as string;

        if (!client || typeof client[methodName] !== 'function') {
            throw new TypeError(`Method not found: "${resource[0]}.${methodName}"`);
        }

        // Call the method - new API returns { data, response }
        const result = (await client[methodName](newParams)) as Record<string, unknown>;

        // Extract data from the new response format
        const data = result?.data as Awaited<R>;

        return {
            success: true,
            data,
        };
    } catch (reason) {
        logger.error('ApiClientResource: action method call failed', {
            error: reason,
            client: resource[0],
            method: resource[1],
            ...((resource[0] as string) === 'helpers' && {
                helper: (resource[2] as Record<string, unknown>)?.helperName,
            }),
        });
        let errorMessage: string;
        // Use getErrorMessage for ApiError instances (new Commerce SDK format)
        if (reason instanceof ApiError) {
            errorMessage = getErrorMessage(reason);
        } else {
            // Fall back to extractResponseError for legacy ResponseError format
            try {
                const { responseMessage } = await extractResponseError(reason as Error);
                errorMessage = responseMessage || 'Unknown error';
            } catch {
                errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
            }
        }
        return {
            success: false,
            errors: [errorMessage],
        };
    }
}
