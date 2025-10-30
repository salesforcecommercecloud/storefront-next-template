/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    ActionFunctionArgs,
    ClientActionFunctionArgs,
    ClientLoaderFunctionArgs,
    LoaderFunctionArgs,
} from 'react-router';
import type { InstanceMethodKeysOf } from '+types/lang';
import { decodeBase64Url } from '@/lib/url';
import { extractResponseError } from '@/lib/utils';
import createClient, { type CommerceSdkCtorFromKey, type CommerceSdkKeyMap } from '@/lib/scapi';

// Default empty array string for resource parameter fallback
const DEFAULT_RESOURCE_ARRAY = '[]';

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
 * @returns Parsed resource array or throws TypeError if invalid
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
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
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
        const data = await createClient(context)?.[resource[0]]?.[resource[1]]?.(...(resource[2] as unknown[]));
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
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
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
        const bodyData: Record<string, FormDataEntryValue> = {};
        for (const [key, value] of formData.entries()) {
            bodyData[key] = value;
        }

        // Merge the original parameters with the form data as body
        const parameters = resource[2] as unknown[];
        const updatedParameters = parameters.map((param, index) => {
            // Check if this is the last parameter and it's an object (likely a body parameter)
            // If so, merge our form data into it, otherwise leave it unchanged
            if (index === parameters.length - 1 && typeof param === 'object' && param !== null) {
                return {
                    ...param,
                    body: bodyData,
                };
            }
            return param;
        });

        // If no body parameter exists, add one to the last parameter or create a new one
        const lastParam = updatedParameters[updatedParameters.length - 1];
        if (updatedParameters.length === 0 || !lastParam || typeof lastParam !== 'object' || !('body' in lastParam)) {
            if (updatedParameters.length === 0) {
                updatedParameters.push({ body: bodyData });
            } else {
                // Add body to the last parameter
                updatedParameters[updatedParameters.length - 1] = {
                    ...lastParam,
                    body: bodyData,
                };
            }
        }

        const data = await createClient(context)?.[resource[0]]?.[resource[1]]?.(...updatedParameters);
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
 * @see {@link import('@/lib/scapi.ts').default}
 */
export function loader<
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
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
 * @see {@link import('@/lib/scapi.ts').default}
 */
export function clientLoader<
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
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
 * @see {@link import('@/lib/scapi.ts').default}
 */
// eslint-disable-next-line custom/no-server-actions
export function action<
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
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
 * @see {@link import('@/lib/scapi.ts').default}
 */
export function clientAction<
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
>(args: ClientActionFunctionArgs): Promise<ApiResponse<Awaited<R>>> {
    return act<R, C, M, P>(args);
}
