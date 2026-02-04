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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { decodeBase64Url } from '@/lib/url';
import { extractResponseError, getErrorMessage } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { ApiError, type Clients, type OperationMethodsOnly } from '@salesforce/storefront-next-runtime/scapi';

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

/**
 * Type representing Commerce SDK client names (camelCase)
 * These are the keys from the Clients object
 */
export type CommerceSdkKeyMap = Exclude<keyof Clients, 'use'>;

/**
 * Type helper to get the client type from a client name
 */
export type CommerceSdkCtorFromKey<C extends CommerceSdkKeyMap> = Clients[C];

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
    CommerceSdkCtorFromKey<C>[M] extends (...a: any[]) => any ? CommerceSdkCtorFromKey<C>[M] : never
>;

/**
 * Type helper to extract the parameters of a Commerce SDK method.
 * @template C - The Commerce SDK client key
 * @template M - The method name on the Commerce SDK client
 */
export type CommerceSdkMethodParameters<C extends CommerceSdkKeyMap, M extends CommerceSdkMethodName<C>> = Parameters<
    CommerceSdkCtorFromKey<C>[M] extends (...a: any[]) => any ? CommerceSdkCtorFromKey<C>[M] : never
>;

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
// eslint-disable-next-line custom/no-async-page-loader
export async function loader<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>({ params, context }: LoaderFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    let resource: [C, M, P];
    try {
        resource = parseResourceParameter<[C, M, P]>(params.resource);
    } catch (error) {
        return {
            success: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
    }

    try {
        const clients = createApiClients(context);
        const clientKey = resource[0] as keyof Clients;
        const client = clients[clientKey] as any;
        const methodName = resource[1] as string;

        if (!client || typeof client[methodName] !== 'function') {
            throw new TypeError(`Method not found: "${resource[0]}.${methodName}"`);
        }

        // Parameters are already in the new format: { params: { path: {...}, query: {...} }, body: {...} }
        const options = (resource[2] as any) || {};

        // Call the method - new API returns { data, response }
        const result = await client[methodName](options);

        // Extract data from the new response format
        const data = result?.data;

        return {
            success: true,
            data,
        };
    } catch (reason) {
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
 * @see {@link import('@/lib/api-clients').createApiClients}
 */
export async function action<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>({ params, context, request }: ActionFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    let resource: [C, M, P];
    try {
        resource = parseResourceParameter<[C, M, P]>(params.resource);
    } catch (error) {
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

        // Parameters are already in the new format: { params: { path: {...}, query: {...} }, body: {...} }
        const options = (resource[2] as any) || {};

        // Merge form data into the body
        const newParams = {
            ...options,
            body: {
                ...(options.body || {}),
                ...bodyData,
            },
        };

        const clients = createApiClients(context);
        const clientKey = resource[0] as keyof Clients;
        const client = clients[clientKey] as any;
        const methodName = resource[1] as string;

        if (!client || typeof client[methodName] !== 'function') {
            throw new TypeError(`Method not found: "${resource[0]}.${methodName}"`);
        }

        // Call the method - new API returns { data, response }
        const result = await client[methodName](newParams);

        // Extract data from the new response format
        const data = result?.data;

        return {
            success: true,
            data,
        };
    } catch (reason) {
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
