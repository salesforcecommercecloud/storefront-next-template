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
import { useCallback, useMemo, useRef } from 'react';
import { useFetcher, type FetcherWithComponents, type FetcherSubmitOptions } from 'react-router';
import type {
    CommerceSdkKeyMap,
    CommerceSdkMethodName,
    CommerceSdkMethodReturnType,
    CommerceSdkMethodParameters,
    ApiResponse,
} from '@/routes/resource.api.client.$resource';
import { encodeBase64Url } from '@/lib/url';

// API route for Commerce SDK resource endpoints
const RESOURCE_API_ROUTE = '/resource/api/client';

/**
 * Unwraps the payload type from our ApiResponse wrapper or the SCAPI client shape `{ data, response }`.
 * The second branch matches the openapi-fetch response shape exposed by the proxied Commerce SDK clients.
 */
type UnwrapApiResponse<T> = T extends ApiResponse<infer P> ? P : T extends { data: infer P; response: unknown } ? P : T;

/** Infers the argument signature for a given Commerce SDK client and method */
type CommerceSdkMethodArgs<
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
> = CommerceSdkMethodParameters<C, M>[0];

/** Extracts the request body type from a Commerce SDK method, or falls back to args */
type CommerceSdkMethodBody<C extends CommerceSdkKeyMap, M extends CommerceSdkMethodName<C>> =
    CommerceSdkMethodArgs<C, M> extends { body: infer B } ? B : CommerceSdkMethodArgs<C, M>;

/** Resolves the return payload type for a given Commerce SDK client and method */
type CommerceSdkMethodPayload<C extends CommerceSdkKeyMap, M extends CommerceSdkMethodName<C>> = UnwrapApiResponse<
    Awaited<CommerceSdkMethodReturnType<C, M>>
>;

/**
 * Custom fetcher interface for Commerce SDK operations.
 * Built from React Router's FetcherWithComponents but with simplified load and submit methods.
 * Now works with structured ApiResponse format instead of throwing errors.
 */
export type ScapiFetcher<TData = unknown, TSubmitPayload = unknown> = Omit<
    FetcherWithComponents<TData>,
    'load' | 'submit' | 'data'
> & {
    /** Load data using the configured Commerce SDK client and method (no URL needed) */
    load: () => Promise<void>;
    /**
     * Submit data using the configured Commerce SDK client and method.
     * Payload is the method body shape (JSON-serializable); it will be wrapped in FormData.
     */
    submit: (payload?: TSubmitPayload, opts?: Omit<FetcherSubmitOptions, 'action' | 'method'>) => Promise<void>;
    // TODO: Fix the data getter, typescript didn't like resolving its type properly, and I removed it for now.
    /** Convenience property to access the actual data when success is true */
    data: UnwrapApiResponse<TData> | undefined;
    /** Convenience property to access error messages when success is false */
    errors: string[] | undefined;
    /** Convenience property to check if the operation was successful */
    success: boolean;
};

/**
 * A React hook that's part of our Commerce SDK fetch API trinity. The trinity consists of this hook, the `fetch`
 * service, and finally the route (and its loaders/actions) for processing requests from the first two. The purpose of these
 * three entities is to simplify and centralize the way to interact with the Commerce SDK methods inside the mentioned
 * route.
 *
 * Under the hood, this hook uses React Router's `useFetcher` hook to perform the actual requests. By doing so we're
 * able to synchronize our hook with React Router's lifecycle and error handling. The response data is available
 * in the `data` property of the returned fetcher object. If the caller is interested in the request's state,
 * it can access the `state` property of the hook.
 *
 * The hook exclusively interacts with the route `${RESOURCE_API_ROUTE}/{resource}` and its related loader and action functions.
 * It expects a Commerce SDK client's name, a method name and method parameters to be passed as parameters.
 *
 * The hook provides two main methods:
 * - `load()`: For GET requests using loader/clientLoader functions
 * - `submit()`: For non-GET requests (PUT, POST, DELETE, etc.) using action/clientAction functions
 *
 * Additionally, the hook supports optional callbacks for handling success and error states:
 * - `onSuccess`: Called when a request completes successfully
 * - `onError`: Called when a request fails
 *
 * TODO: Actively monitor the React Router issue {@link https://github.com/remix-run/react-router/issues/14207} which
 *   is about adding a manual reset/abort functionality to fetchers. Once this issue is resolved, we should make the
 *   functionality available in this hook as well.
 * @see {@link import('react-router').useFetcher}
 * @see {@link import('@/routes/resource.api.client.$resource.ts').loader}
 * @see {@link import('@/routes/resource.api.client.$resource.ts').clientLoader}
 * @see {@link import('@/routes/resource.api.client.$resource.ts').action}
 * @see {@link import('@/routes/resource.api.client.$resource.ts').clientAction}
 * @see {@link import('@/lib/api-clients.ts').createApiClients}
 * @example
 * import { useEffect } from 'react';
 * import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
 *
 * export default function MyComponent() {
 *   const config = useConfig();
 *   const fetcher = useScapiFetcher('shopperProducts', 'getCategory', {
 *     params: {
 *       query: { id: 'test', levels: 2 }
 *     }
 *   });
 *
 *   useEffect(() => {
 *     fetcher.load().then(() => {
 *       // Request completed, data available in fetcher.data
 *     });
 *   }, [fetcher]);
 *
 *   // Access data from fetcher.data
 *   const data = fetcher.data;
 * }
 *
 * @example
 * import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
 *
 * export default function MyComponent() {
 *   const fetcher = useScapiFetcher('shopperCustomers', 'updateCustomer', {
 *     params: {
 *       path: { customerId: 'customer-123' }
 *     },
 *     body: {}
 *   });
 *
 *   const handleUpdate = (formData) => {
 *     fetcher.submit(formData, { method: 'POST' }).then(() => {
 *       // Request completed, data available in fetcher.data
 *     });
 *   };
 * }
 */
export function useScapiFetcher<
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
    P extends CommerceSdkMethodArgs<C, M> = CommerceSdkMethodArgs<C, M>,
    B extends CommerceSdkMethodBody<C, M> = CommerceSdkMethodBody<C, M>,
>(client: C, method: M, options: P): ScapiFetcher<CommerceSdkMethodPayload<C, M>, B> {
    // Memoize the method parameters to prevent creating new fetchers on every render
    // We use refs to track the previous options string and params for deep comparison
    const prevOptionsStringRef = useRef<string>('');
    const prevMethodParamsRef = useRef<P>(options);
    const currentOptionsRef = useRef<P>(options);

    // Update the current options ref on every render
    currentOptionsRef.current = options;
    const optionsString = JSON.stringify(options);

    // Only update methodParams when the stringified options actually change
    const methodParams = useMemo(() => {
        if (prevOptionsStringRef.current !== optionsString) {
            prevOptionsStringRef.current = optionsString;
            prevMethodParamsRef.current = currentOptionsRef.current;
        }
        return prevMethodParamsRef.current;
    }, [optionsString]);

    const parameters = JSON.stringify(methodParams);
    const resource = encodeBase64Url(`["${client}","${method}",${parameters}]`);
    const fetcher = useFetcher<ApiResponse<CommerceSdkMethodPayload<C, M>>>({ key: resource });

    /**
     * Load method for handling GET requests using loader/clientLoader functions.
     * This method invokes the fetcher's load method which triggers the loader/clientLoader functions on the server.
     * The response data will be available in fetcher.data once the request completes.
     *
     * @returns Promise that resolves when the request completes
     */
    const load = useCallback((): Promise<void> => {
        // Invoke fetcher load method for loaders with the resource URL
        return fetcher.load(`${RESOURCE_API_ROUTE}/${resource}`);
    }, [fetcher, resource]);

    /**
     * Submit method for handling non-GET requests (PUT, POST, DELETE, etc.) using action/clientAction functions.
     * This method invokes the fetcher's submit method which triggers the action/clientAction functions on the server.
     * The response data will be available in fetcher.data once the request completes.
     *
     * @param target - The data to submit (plain object, FormData, or HTMLFormElement). If not provided, an empty object is used.
     * @param opts - Optional configuration
     * @returns Promise that resolves when the request completes
     */
    const submit = useCallback(
        (payload?: B, _opts?: Omit<FetcherSubmitOptions, 'action' | 'method'>): Promise<void> => {
            // Invoke fetcher submit method for actions with the provided target data
            return fetcher.submit(payload ?? {}, {
                ..._opts,
                method: 'POST',
                action: `${RESOURCE_API_ROUTE}/${resource}`,
            });
        },
        [fetcher, resource]
    );

    return {
        // ...(fetcher as unknown as FetcherWithComponents<CommerceSdkMethodPayload<C, M>>),
        ...fetcher,
        load,
        submit,
        // Convenience properties for easier access to structured response
        get data() {
            return fetcher.data?.data;
        },
        get errors() {
            return fetcher.data?.errors;
        },
        get success() {
            return fetcher.data?.success ?? false;
        },
    };
}
