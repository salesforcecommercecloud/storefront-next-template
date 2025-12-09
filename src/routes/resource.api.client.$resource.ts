/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    ActionFunctionArgs,
    ClientActionFunctionArgs,
    ClientLoaderFunctionArgs,
    LoaderFunctionArgs,
} from 'react-router';
import { decodeBase64Url } from '@/lib/url';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import type { Clients, OperationMethodsOnly } from '@salesforce/storefront-next-runtime/scapi';

// Default empty array string for resource parameter fallback
const DEFAULT_RESOURCE_ARRAY = '[]';

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

async function load<
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
        try {
            const { responseMessage } = await extractResponseError(reason as Error);
            errorMessage = responseMessage || 'Unknown error';
        } catch {
            errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
        }
        return {
            success: false,
            errors: [errorMessage],
        };
    }
}

/**
 * Shared function to handle Commerce SDK action requests (PUT, POST, DELETE, etc.).
 * This function provides a genericized implementation for handling various action operations
 * of the Commerce SDK, similar to the `load` function but for non-GET requests.
 *
 * @template R - The return type of the Commerce SDK method
 * @template C - The Commerce SDK client key
 * @template M - The method name on the Commerce SDK client
 * @template P - The parameters for the Commerce SDK method
 * @param params - The route parameters containing the encoded resource information
 * @param context - The context object containing Commerce SDK configuration
 * @returns Promise resolving to ApiResponse with success/error/data structure
 */
async function act<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>({ params, context, request }: ActionFunctionArgs | ClientActionFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
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
        // Note: FormData converts all values to strings, so we need to convert known boolean fields back
        const bodyData: Record<string, FormDataEntryValue | boolean> = {};
        for (const [key, value] of formData.entries()) {
            // Convert known boolean fields from string to boolean
            if (key === 'preferred' && typeof value === 'string') {
                bodyData[key] = value === 'true' || value === '1';
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
        try {
            const { responseMessage } = await extractResponseError(reason as Error);
            errorMessage = responseMessage || 'Unknown error';
        } catch {
            errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
        }
        return {
            success: false,
            errors: [errorMessage],
        };
    }
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
export function loader<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>(args: LoaderFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    return load<R, C, M, P>(args);
}

/**
 * A React Router client loader that's part of our Commerce SDK fetch API trinity. The trinity consists of this route's
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
export function clientLoader<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>(args: ClientLoaderFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    return load<R, C, M, P>(args);
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
// eslint-disable-next-line custom/no-server-actions
export function action<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>(args: ActionFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    return act<R, C, M, P>(args);
}

/**
 * A React Router client action that's part of our Commerce SDK fetch API trinity. The trinity consists of this route's
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
 * @see {@link import('react-router').ClientActionFunction}
 * @see {@link import('@/hooks/use-scapi-fetcher.ts').useScapiFetcher}
 * @see {@link import('@/lib/api-clients.ts').createApiClients}
 */
export function clientAction<
    R extends CommerceSdkMethodReturnType<C, M>,
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodParameters<C, M>,
>(args: ClientActionFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    return act<R, C, M, P>(args);
}
