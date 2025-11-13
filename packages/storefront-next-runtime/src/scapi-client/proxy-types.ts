/**
 * Type utilities for the operation proxy client
 *
 * This file contains TypeScript type definitions that enable type-safe
 * operation method calls on the SCAPI clients.
 *
 * The proxy client transforms calls like:
 *   client.GET('/path', options)
 * Into:
 *   client.operationName(options)
 *
 * With full type safety for parameters and responses.
 */

import type { Client, FetchOptions, FetchResponse } from 'openapi-fetch';

/**
 * Helper to extract required keys from a type
 * Returns a union of all keys that are required (not optional)
 */
type RequiredKeysOf<T> = {
    [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Resolve FetchOptions to show the actual structure in tooltips
 * This expands the type so IntelliSense shows "params" instead of "parameters"
 */
type ResolvedFetchOptions<OpDef> =
    FetchOptions<OpDef> extends infer Resolved
        ? {
              [K in keyof Resolved]: Resolved[K];
          }
        : never;

/**
 * Represents a single operation's metadata with base path optimization
 *
 * This format reduces bundle size by:
 * 1. Extracting common base paths into a shared constant
 * 2. Using abbreviated property names to minimize repeated keys
 *
 * Property abbreviations:
 * - m: HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
 * - b: Base path shared across operations
 * - s: Suffix path unique to this operation
 *
 * At runtime, the full path is reconstructed as `b + s`.
 *
 * @example
 * const BASE_PATH = '/organizations/{organizationId}/baskets' as const;
 * const op: OperationInfo = {
 *   m: 'GET',
 *   b: BASE_PATH,
 *   s: '/{basketId}'
 * };
 */
export interface OperationInfo {
    /** HTTP method (abbreviated: m = method) */
    m: string;
    /** Base path (abbreviated: b = base) */
    b: string;
    /** Suffix path (abbreviated: s = suffix) */
    s: string;
}

/**
 * A mapping of operation names to their metadata
 *
 * This is the shape of the generated operation map objects.
 *
 * @example
 * const BASE_PATH = '/organizations/{organizationId}/categories' as const;
 * const operations: OperationMap = {
 *   getCategories: { m: 'GET', b: BASE_PATH, s: '' },
 *   getCategory: { m: 'GET', b: BASE_PATH, s: '/{id}' }
 * };
 */
export type OperationMap = Record<string, OperationInfo>;

/**
 * Template literal type helper to reconstruct full path from base + suffix
 *
 * @typeParam Base - The base path string
 * @typeParam Suffix - The suffix path string
 * @returns The concatenated path as a literal type
 *
 * @example
 * type FullPath = ReconstructPath<'/api/v1/users', '/{id}'>; // '/api/v1/users/{id}'
 */
export type ReconstructPath<Base extends string, Suffix extends string> = `${Base}${Suffix}`;

/**
 * Extract the Paths type parameter from a Client
 *
 * @typeParam TClient - The openapi-fetch client type
 * @example
 * // Given: Client<paths, MediaType>
 * // Result: paths
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractPaths<TClient extends Client<any, any>> = TClient extends Client<infer P, any> ? P : never;

/**
 * Extract the Media type parameter from a Client
 *
 * @typeParam TClient - The openapi-fetch client type
 * @example
 * // Given: Client<paths, MediaType>
 * // Result: MediaType
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractMedia<TClient extends Client<any, any>> = TClient extends Client<any, infer M> ? M : never;

/**
 * Get the HTTP method key as lowercase
 * Converts 'GET' -> 'get', 'POST' -> 'post', etc.
 */
type LowercaseMethod<M extends string> = Lowercase<M>;

/**
 * Extract the full path from an operation
 *
 * Reconstructs the full path from `b + s` (base + suffix)
 *
 * @typeParam TOperation - The operation info
 * @returns The full path as a string literal type
 */
type ExtractOperationPath<TOperation> = TOperation extends { b: infer B; s: infer S }
    ? B extends string
        ? S extends string
            ? ReconstructPath<B, S> // Reconstruct from b (base) + s (suffix)
            : never
        : never
    : never;

/**
 * Extract success data type from operation definition
 * Gets the data type from 2xx responses
 */

type ExtractSuccessData<OpDef, Media extends `${string}/${string}`> =
    OpDef extends Record<string | number, unknown>
        ? FetchResponse<OpDef, FetchOptions<OpDef>, Media> extends { data?: infer D }
            ? D
            : never
        : never;

/**
 * Create a typed operation method by binding the path parameter
 *
 * This directly constructs the function signature using the operation's path and method.
 * The function signature is built from the OpenAPI operation definition to provide
 * full type safety for parameters and responses.
 *
 * Each operation method accepts a FetchOptions object with these properties:
 * - params: { query?, header?, path?, cookie? } - API parameters from OpenAPI spec
 * - headers?: HeadersOptions - Custom HTTP headers (e.g., Authorization, Content-Type)
 * - parseAs?: "json" | "text" | "blob" | "arrayBuffer" | "stream" - Response parsing
 * - baseUrl?: string - Override the base URL for this request
 * - querySerializer?: QuerySerializer | QuerySerializerOptions - Custom query serialization
 * - bodySerializer?: BodySerializer - Custom body serialization
 * - fetch?: typeof fetch - Custom fetch implementation
 * - middleware?: Middleware[] - Request/response middleware
 *
 * Returns a Promise with { data, response } on success.
 * Throws ApiError on non-2xx responses with typed error body from OpenAPI spec.
 *
 * @typeParam TClient - The openapi-fetch client type (Client<Paths, Media>)
 * @typeParam TOperation - The operation info with abbreviated keys (m, b, s)
 *
 * @example
 * // Given operation { m: 'GET', b: BASE_PATH, s: '/users' }
 * // Original: client.GET('/users', options) => Promise<{ data?, error?, response }>
 * // Result:   client.getUsers(options) => Promise<{ data, response }>
 * // Where options, data, and thrown errors are fully typed based on the OpenAPI spec
 */
type OperationMethod<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TClient extends Client<any, any>,
    TOperation extends OperationInfo,
> =
    ExtractOperationPath<TOperation> extends infer Path
        ? Path extends keyof ExtractPaths<TClient>
            ? LowercaseMethod<TOperation['m']> extends infer Method
                ? Method extends keyof ExtractPaths<TClient>[Path]
                    ? ExtractPaths<TClient>[Path][Method] extends infer OpDef
                        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          OpDef extends Record<string | number, any>
                            ? RequiredKeysOf<FetchOptions<OpDef>> extends never
                                ? (options?: ResolvedFetchOptions<OpDef>) => Promise<{
                                      data: ExtractSuccessData<OpDef, ExtractMedia<TClient>>;
                                      response: Response;
                                  }>
                                : (options: ResolvedFetchOptions<OpDef>) => Promise<{
                                      data: ExtractSuccessData<OpDef, ExtractMedia<TClient>>;
                                      response: Response;
                                  }>
                            : never
                        : never
                    : never
                : never
            : never
        : never;

/**
 * Build the proxy client interface with ONLY operation methods
 *
 * This type creates a clean API that only exposes:
 * 1. Operation methods (getCategories, createBasket, etc.) with full type safety
 * 2. Middleware methods (use, eject) from the original client
 *
 * HTTP method syntax (GET, POST, etc.) is NOT included - operation methods only!
 *
 * Each operation method has correct parameter and return types inferred
 * from the underlying client HTTP method, with the path parameter already bound.
 *
 * @typeParam TClient - The openapi-fetch Client type (Client<Paths, Media>)
 * @typeParam TOperations - The operation map with operation names as keys
 *
 * @example
 * type MyClient = ProxyClient<
 *   Client<paths>,
 *   typeof operations
 * >;
 *
 * // MyClient exposes:
 * // - client.getCategories(options) => Promise<Response>
 * // - client.use(middleware) => void
 * // With full type inference for options and Response!
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProxyClient<TClient extends Client<any, any>, TOperations extends OperationMap> = {
    [K in keyof TOperations]: OperationMethod<TClient, TOperations[K]>;
} & Pick<TClient, 'use' | 'eject'>;

/**
 * Utility type to extract the Paths type from a Client
 *
 * @example
 * type MyPaths = ClientPaths<Client<paths>>; // paths
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClientPaths<TClient extends Client<any, any>> = TClient extends Client<infer P, any> ? P : never;

/**
 * Type guard to check if a property name is an operation method
 *
 * Used at runtime to determine if a property access should be
 * intercepted by the proxy.
 *
 * @param operations - The operation map
 * @param prop - The property being accessed
 * @returns True if prop is an operation name
 */
export function isOperationMethod<T extends OperationMap>(operations: T, prop: string | symbol): boolean {
    return typeof prop === 'string' && prop in operations;
}
