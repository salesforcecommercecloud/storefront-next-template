/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useRef } from 'react';
import {
    useFetcher,
    type FetcherWithComponents,
    type FetcherSubmitOptions,
    type SubmitTarget as ReactRouterSubmitTarget,
} from 'react-router';
import type { CommerceSdkKeyMap, CommerceSdkCtorFromKey } from '@/lib/scapi';
import { encodeBase64Url } from '@/lib/url';
import type { ApiResponse } from '@/routes/resource.api.client.$resource';

// API route for Commerce SDK resource endpoints
const RESOURCE_API_ROUTE = '/resource/api/client';

// type FetchConfig = { timeoutMs?: number };

type FilterResponseFromUnion<T> = T extends Promise<Response | infer U> ? Promise<U> : T;

/**
 * Custom fetcher interface for Commerce SDK operations.
 * Built from React Router's FetcherWithComponents but with simplified load and submit methods.
 * Now works with structured ApiResponse format instead of throwing errors.
 */
export type ScapiFetcher<TData = unknown> = Omit<FetcherWithComponents<ApiResponse<TData>>, 'load' | 'submit'> & {
    /** Load data using the configured Commerce SDK client and method (no URL needed) */
    load: () => Promise<void>;
    /** Submit data using the configured Commerce SDK client and method */
    submit: (target?: ReactRouterSubmitTarget, opts?: Omit<FetcherSubmitOptions, 'action' | 'method'>) => Promise<void>;
    /** Convenience property to access the actual data when success is true */
    data: TData | undefined;
    /** Convenience property to access error messages when success is false */
    errors: string[] | undefined;
    /** Convenience property to check if the operation was successful */
    success: boolean;
};

type ExtractMethodNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T & string];

type ExtractMethodParams<T, M extends ExtractMethodNames<T>> = T[M] extends (...args: infer P) => any ? P : never;

type ExtractMethodReturnType<T, M extends ExtractMethodNames<T>> = T[M] extends (...args: any[]) => infer R
    ? FilterResponseFromUnion<R>
    : never;

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
 * @see {@link import('@/lib/scapi.ts').default}
 * @example
 * import { useEffect } from 'react';
 * import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
 *
 * export default function MyComponent() {
 *   const fetcher = useScapiFetcher('ShopperProducts', 'getCategory', {
 *     parameters: { id: 'test', levels: 2 }
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
 *   const fetcher = useScapiFetcher('ShopperCustomers', 'updateCustomer', {
 *     parameters: { customerId: 'customer-123' },
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
    M extends ExtractMethodNames<I>,
    I extends InstanceType<CommerceSdkCtorFromKey<C>>,
    R extends ExtractMethodReturnType<I, M>,
>(client: C, method: M, ...options: ExtractMethodParams<I, M>): ScapiFetcher<Awaited<R>> {
    // Use the spread options directly as method parameters
    // Memoize the method parameters to prevent creating new fetchers on every render
    // We use a ref to track the previous options string for deep comparison
    const prevOptionsStringRef = useRef<string>('');
    const optionsString = JSON.stringify(options);
    const methodParams = useMemo(() => {
        if (prevOptionsStringRef.current !== optionsString) {
            prevOptionsStringRef.current = optionsString;
        }
        return options as unknown as ExtractMethodParams<I, M>;
    }, [options, optionsString]);

    /* c8 ignore next */
    const parameters = Array.isArray(methodParams) ? JSON.stringify(methodParams) : '[]';
    const resource = encodeBase64Url(`["${client}","${method}",${parameters}]`);
    const fetcher = useFetcher<ApiResponse<Awaited<R>>>({ key: resource });

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
        (target?: ReactRouterSubmitTarget, _opts?: Omit<FetcherSubmitOptions, 'action' | 'method'>): Promise<void> => {
            // Invoke fetcher submit method for actions with the provided target data
            return fetcher.submit(target ?? {}, {
                ..._opts,
                method: 'POST',
                action: `${RESOURCE_API_ROUTE}/${resource}`,
            });
        },
        [fetcher, resource]
    );

    return {
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
    } as ScapiFetcher<Awaited<R>>;
}
