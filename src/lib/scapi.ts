/* global __TEST__ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RouterContext, RouterContextProvider } from 'react-router';
// eslint-disable-next-line import/no-namespace
import type * as CommerceSdk from 'commerce-sdk-isomorphic';
import type { SessionData } from '@/lib/api/types';
import type { CtorFromKey, CtorNameKeyMap } from '+types/classes';
import type { Ctor, InstanceMethodKeysOf, InstancePropertiesKeysOf } from '+types/lang';
import { authContext } from '@/middlewares/auth.utils';
import { performanceTimerContext, PERFORMANCE_MARKS } from '@/middlewares/performance-metrics';
import { encodeBase64Url } from '@/lib/url';
import { getAppOrigin } from '@/lib/utils';

type CommerceSdkClientConfig = Readonly<{
    clientId: string;
    organizationId: string;
    siteId: string;
    shortCode: string;
    locale: string;
    currency: string;
    redirectURI: string;
}>;

// Base types for Commerce SDK
export type CommerceSdkKeyMap = CtorNameKeyMap<typeof CommerceSdk>;
export type CommerceSdkCtorFromKey<S extends CommerceSdkKeyMap> = CtorFromKey<typeof CommerceSdk, S>;

// Helper types for better type inference
type CommerceSdkClientMethodNames<C extends CommerceSdkKeyMap> = InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>;
type CommerceSdkClientPropertiesNames<C extends CommerceSdkKeyMap> = InstancePropertiesKeysOf<
    CommerceSdkCtorFromKey<C>
>;

type CommerceSdkClientMethodParameters<
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkClientMethodNames<C>,
> = Parameters<
    InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...args: any[]) => any
        ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
        : never
>;

type CommerceSdkClientMethodReturnType<
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkClientMethodNames<C>,
> = ReturnType<
    InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...args: any[]) => any
        ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
        : never
>;

type LastArgIsBooleanTrue<T extends readonly unknown[]> = T extends readonly [...any[], infer Last]
    ? Last extends true
        ? true
        : false
    : false;

type FilterResponseFromUnion<T> = T extends Promise<Response | infer U> ? Promise<U> : T;

type CommerceSdkClientMethod<C extends CommerceSdkKeyMap, M extends CommerceSdkClientMethodNames<C>> = <
    A extends [...CommerceSdkClientMethodParameters<C, M>, boolean?] | CommerceSdkClientMethodParameters<C, M>,
>(
    ...args: A
) => LastArgIsBooleanTrue<A> extends true
    ? Promise<Response>
    : FilterResponseFromUnion<CommerceSdkClientMethodReturnType<C, M>> extends never
      ? CommerceSdkClientMethodReturnType<C, M>
      : FilterResponseFromUnion<CommerceSdkClientMethodReturnType<C, M>>;

type CommerceSdkClientClass<C extends CommerceSdkKeyMap> = {
    [M in CommerceSdkClientMethodNames<C>]: CommerceSdkClientMethod<C, M>;
} & {
    getInstance: () => Promise<
        {
            [M in CommerceSdkClientMethodNames<C>]: CommerceSdkClientMethod<C, M>;
        } & {
            [P in CommerceSdkClientPropertiesNames<C>]: InstanceType<CommerceSdkCtorFromKey<C>>[P];
        } & {
            clientConfig: C extends 'ShopperLogin'
                ? CommerceSdk.ClientConfig<CommerceSdkClientConfig>
                : CommerceSdk.ClientConfig<Omit<CommerceSdkClientConfig, 'redirectURI'>>;
        }
    >;
};

// The shape of the Commerce SDK client
export type CommerceSdkClient = {
    [C in CommerceSdkKeyMap]: CommerceSdkClientClass<C>;
};

// Cache for SDK instances, their resolvers, and requests. While the SDK class and their related resolver caches are
// global, the instance and  API request caches are per-context, i.e. per-request. A global context for the known
// classes is okay to have as the amount of classes to be expected is rather small.
const clientClassCache = new Map<string, Ctor>();
const clientClassLoadCache = new Map<string, Promise<Ctor>>();
const clientInstanceCache = new WeakMap<Readonly<RouterContextProvider>, Map<string, any>>();
const clientInstanceLoadCache = new WeakMap<Readonly<RouterContextProvider>, Map<string, Promise<Ctor>>>();
const requestCache = new WeakMap<Readonly<RouterContextProvider>, Map<string, Promise<any>>>();

export let clientClassCacheContext: RouterContext<typeof clientClassCache>;

// @ts-expect-error: __TEST__ is a global variable existing to support dead code elimination
if (__TEST__) {
    // Right now, only create the context in test mode. In other environments, dead code elimination will kick in.
    // In the future, we might want to create the context in other environments as well, for example, to support
    // prewarming with already loaded Commerce SDK clients.
    void import('react-router').then(({ createContext }) => {
        clientClassCacheContext = createContext<typeof clientClassCache>(clientClassCache);
    });
}

/**
 * Salesforce Commerce API client configuration.
 * This sets up the connection to the Salesforce B2C Commerce API.
 */
const getCommerceSdkClientConfig = (): Readonly<CommerceSdkClientConfig> => {
    return Object.freeze({
        clientId: import.meta.env.VITE_COMMERCE_API_CLIENT_ID || '',
        organizationId: import.meta.env.VITE_COMMERCE_API_ORG_ID || '',
        shortCode: import.meta.env.VITE_COMMERCE_API_SHORT_CODE || '',
        siteId: import.meta.env.VITE_COMMERCE_API_SITE_ID || '',
        locale: import.meta.env.VITE_SITE_LOCALE || 'en-US',
        currency: import.meta.env.VITE_SITE_CURRENCY || 'USD',
        redirectURI: `${getAppOrigin()}${import.meta.env.VITE_COMMERCE_API_CALLBACK || ''}`,
    });
};

/**
 * Creates a Commerce SDK client instance with authentication
 */
function createCommerceSdkClient<T>(
    ClientClass: new (...args: any[]) => T,
    parameters: Partial<CommerceSdkClientConfig> & { shortCode: string },
    session?: SessionData
): T {
    return new ClientClass({
        parameters,
        ...(session ? { headers: { authorization: `Bearer ${session.access_token}` } } : {}),
        throwOnBadResponse: true,
        proxy: `${getAppOrigin()}${import.meta.env.VITE_COMMERCE_API_PROXY || ''}`,
    });
}

/**
 * Creates a Salesforce Commerce API (SCAPI) service/proxy that's part of our Commerce SDK fetch API trinity. The
 * trinity consists of this service, a `useFetch` hook, and finally a route (and its loaders) for processing requests
 * from the first two. The purpose of these three entities is to simplify and centralize the way to interact with the
 * Commerce SDK methods inside the fetch service.
 *
 * This service is the heart of any interaction with the Commerce SDK methods. It provides a simple interface to
 * dynamically load the desired functionality from the Commerce SDK and execute it with the provided parameters.
 *
 * **Note/Gotcha:** The factory exposed by the `@/lib/scapi` module does not provide access to the actual Commerce SDK
 * client instances directly, but rather a proxy interface to simplify the access to the methods of each exposed
 * Commerce SDK class. The proxy interface is used to dynamically create an instance of the targeted SDK client on
 * demand when finally invoking an instance method. Prior to that call, the SDK module might not have been resolved yet.
 * In cases where you need to get the actual instance of the Commerce SDK client - for example, if you need to pass a
 * `ShopperLogin` instance into the login helpers - you can use the async `getInstance` method that's exposed for each
 * proxy as well.
 *
 * TODO: This service should encapsulate the authentication handling, as that would allows us to start streaming of API
 *  responses on the server without having to wait for the authentication to complete.
 * @see {@link import('@/hooks/use-fetch.ts').useFetch}
 * @see {@link import('@/routes/resource.api.client.$resource.ts').loader}
 * @see {@link import('@/routes/resource.api.client.$resource.ts').clientLoader}
 * @example Default mode
 * import type { LoaderFunctionArgs } from 'react-router';
 * import createClient from '@/lib/scapi';
 *
 * export function loader({ params, context }: LoaderFunctionArgs) {
 *   const client = createClient(context);
 *   return {
 *     basket: client.ShopperBaskets.getBasket({ parameters: { basketId: 'test' } }),
 *     products: client.ShopperProducts.getProduct({ parameters: { id: params.productId } }),
 *   };
 * }
 * @example Raw response mode
 * import type { LoaderFunctionArgs } from 'react-router';
 * import createClient from '@/lib/scapi';
 *
 * export function loader({ params, context }: LoaderFunctionArgs) {
 *   const client = createClient(context);
 *   return {
 *     basket: client.ShopperBaskets.getBasket(
 *       {
 *         parameters: { basketId: 'test' }
 *       },
 *       true
 *     ).then((res: Response) => res.json()),
 *   };
 * }
 */
const factory = (context: Readonly<RouterContextProvider>): CommerceSdkClient =>
    new Proxy({} as CommerceSdkClient, {
        get(_t1: CommerceSdkClient, className: CommerceSdkKeyMap) {
            // Return a class proxy that handles method calls
            return new Proxy({} as any, {
                get(_t2: any, methodName: string) {
                    return async (...args: any[]) => {
                        // Instantiate per-context caches
                        !clientInstanceCache.has(context) && clientInstanceCache.set(context, new Map());
                        !clientInstanceLoadCache.has(context) && clientInstanceLoadCache.set(context, new Map());

                        // Use cached classes, if available
                        let sdkClientClass = clientClassCache.get(className);
                        if (!sdkClientClass) {
                            // Deduplicate parallel class loading
                            let sdkClientClassLoadPromise = clientClassLoadCache.get(className);
                            if (!sdkClientClassLoadPromise) {
                                sdkClientClassLoadPromise = import('commerce-sdk-isomorphic')
                                    .then((sdk) => {
                                        const clientClass = sdk?.[className] as Ctor;
                                        if (!clientClass || typeof clientClass !== 'function') {
                                            throw new TypeError(`Client not found: "${className}"`);
                                        }
                                        return clientClass;
                                    })
                                    .finally(() => {
                                        // Clean up the resolver cache to prevent memory leaks
                                        clientClassLoadCache.delete(className);
                                    });

                                clientClassLoadCache.set(className, sdkClientClassLoadPromise);
                            }

                            sdkClientClass = await sdkClientClassLoadPromise;
                            clientClassCache.set(className, sdkClientClass);
                        }

                        // Verify authentication
                        // TODO: In a follow-up PR we can think of moving SCAPI authentication here. Right now we're
                        //  using a promise reference created in the auth middleware. That reference allows us to
                        //  call the `fetch` service and start streaming API responses on the server without having
                        //  to wait for the authentication flow to complete.
                        let sdkClientInstance = clientInstanceCache.get(context)?.get(className);
                        if (!sdkClientInstance) {
                            if (className === 'ShopperLogin') {
                                // Special treatment for the `ShopperLogin` client
                                // This client - of course - doesn't require authentication itself, so we can create it
                                // without upfront session retrieval
                                const { clientId, organizationId, shortCode, siteId, currency, locale, redirectURI } =
                                    getCommerceSdkClientConfig();
                                sdkClientInstance = createCommerceSdkClient<Ctor>(sdkClientClass, {
                                    clientId,
                                    organizationId,
                                    shortCode,
                                    siteId,
                                    currency,
                                    locale,
                                    redirectURI,
                                });
                                clientInstanceCache.get(context)?.set(className, sdkClientInstance);
                            } else {
                                let sdkClientInstanceLoadPromise = clientInstanceLoadCache.get(context)?.get(className);
                                if (!sdkClientInstanceLoadPromise) {
                                    sdkClientInstanceLoadPromise = context
                                        .get(authContext)
                                        ?.ref?.then((session) => {
                                            if (!session) {
                                                throw new TypeError(`Client not authenticated: "${className}"`);
                                            }

                                            // Create and cache the targeted client instance resolver
                                            const { clientId, organizationId, shortCode, siteId, currency, locale } =
                                                getCommerceSdkClientConfig();
                                            return createCommerceSdkClient<Ctor>(
                                                sdkClientClass,
                                                { clientId, organizationId, shortCode, siteId, currency, locale },
                                                session
                                            );
                                        })
                                        .finally(() => {
                                            // Clean up the resolver cache to prevent memory leaks
                                            clientInstanceLoadCache.get(context)?.delete(className);
                                        });

                                    clientInstanceLoadCache.get(context)?.set(className, sdkClientInstanceLoadPromise);
                                }

                                sdkClientInstance = await sdkClientInstanceLoadPromise;
                                clientInstanceCache.get(context)?.set(className, sdkClientInstance);
                            }
                        }

                        // Special handling for the `getInstance` method
                        if (methodName === 'getInstance') {
                            return sdkClientInstance;
                        }

                        // Verify proxied SDK client method exists
                        if (!sdkClientInstance || typeof sdkClientInstance?.[methodName] !== 'function') {
                            throw new TypeError(`Method not found: "${className}.${methodName}"`);
                        }

                        // Utilize per-request cache for deduplication
                        !requestCache.has(context) && requestCache.set(context, new Map());
                        const cacheKey = `${className}:${methodName}:${encodeBase64Url(JSON.stringify(args))}`;
                        const cache = requestCache.get(context);
                        if (cache?.has(cacheKey)) {
                            return cache.get(cacheKey);
                        }

                        const performanceTimer = context.get(performanceTimerContext);
                        const performanceName = PERFORMANCE_MARKS.apiCall.create({
                            className: String(className),
                            methodName: String(methodName),
                        });

                        // Start performance timing for the API call
                        performanceTimer?.mark(performanceName, 'start');

                        const promise = (sdkClientInstance[methodName](...args) as Promise<any>)
                            .then((value) => {
                                performanceTimer?.mark(performanceName, 'end');
                                return value;
                            })
                            .catch((error) => {
                                // End performance timing even on error
                                performanceTimer?.mark(performanceName, 'end', {
                                    detail: `API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                });
                                throw error;
                            })
                            .finally(() => {
                                cache?.delete(cacheKey);
                            });

                        // Track the API call for performance monitoring
                        performanceTimer?.trackOperation(promise);

                        cache?.set(cacheKey, promise);
                        return promise;
                    };
                },
            });
        },
    });

export default factory;
