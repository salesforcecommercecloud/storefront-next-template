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

import { type MiddlewareFunction, type RouterContextProvider, createContext } from 'react-router';
import {
    DataStore,
    DataStoreNotFoundError,
    DataStoreServiceError,
    DataStoreUnavailableError,
} from '@salesforce/mrt-utilities/data-store';
import { siteContext } from '../site-context';

export type DataStoreContextKey<T> = ReturnType<typeof createContext<T | null>>;

export type DataStoreEntryKey = string | ((context: Readonly<RouterContextProvider>) => string);

export type DataStoreEntry<TValue = unknown> = {
    value?: TValue;
};

export type DataStoreMiddlewareOptions<T> = {
    entryKey: DataStoreEntryKey;
    context: DataStoreContextKey<T>;
    transform?: (value: Record<string, unknown>) => T;
    onUnavailable?: 'throw' | 'fallback';
    fallbackValue?: T | ((context: Readonly<RouterContextProvider>) => T);
};

/**
 * Creates a typed React Router context for data store entries.
 *
 * Initializes the context with `null` so middleware can populate it during requests.
 *
 * @returns React Router context key for data store values
 */
export function createDataStoreContext<T>(): DataStoreContextKey<T> {
    return createContext<T | null>(null);
}

/**
 * Creates a data-store middleware that fetches site preferences from MRT data access layer
 * and stores them in the router context.
 *
 * Environment variables:
 * - `AWS_REGION` (required): AWS region for the data store table (e.g., "us-east-1")
 * - `MOBIFY_PROPERTY_ID` (required): MRT property identifier (e.g., "abcd1234")
 * - `DEPLOY_TARGET` (required): MRT deploy target (e.g., "production")
 *
 * @param options - Middleware options for data store entry and context
 * @returns React Router middleware for server requests
 */
export function createDataStoreMiddleware<T>(options: DataStoreMiddlewareOptions<T>): MiddlewareFunction<Response> {
    const { entryKey, context: contextKey, onUnavailable = 'throw', fallbackValue } = options;
    const transform = options.transform ?? ((value: Record<string, unknown>) => value as T);

    const dataStoreMiddleware: MiddlewareFunction<Response> = async ({ context }, next) => {
        const resolvedEntryKey = typeof entryKey === 'function' ? entryKey(context) : entryKey;
        const result = await loadDataStoreEntry({
            entryKey: resolvedEntryKey,
            context,
            transform,
            onUnavailable,
            fallbackValue,
        });

        if (result.state === 'value' || result.state === 'fallback') {
            context.set(contextKey, result.value);
        }

        return next();
    };

    return dataStoreMiddleware;
}

/**
 * Lazy variant of {@link createDataStoreMiddleware}. Instead of fetching the
 * entry up-front during middleware execution, this stores a memoized loader
 * in the router context. Consumers call {@link readLazyDataStoreEntry} to
 * trigger the fetch on demand — pages that never read the value never pay
 * for the data-store call.
 *
 * Repeated reads within the same request share the in-flight promise so
 * the entry is fetched at most once per request.
 *
 * Use this for entries that only a subset of routes consume (e.g. config
 * read by a single feature) rather than entries needed on every request.
 */
export function createLazyDataStoreMiddleware<T>(options: DataStoreMiddlewareOptions<T>): MiddlewareFunction<Response> {
    const { entryKey, context: contextKey, onUnavailable = 'throw', fallbackValue } = options;
    const transform = options.transform ?? ((value: Record<string, unknown>) => value as T);

    const lazyMiddleware: MiddlewareFunction<Response> = async ({ context }, next) => {
        let pending: Promise<T | null> | undefined;

        const loader: LazyDataStoreLoader<T> = () => {
            if (!pending) {
                const resolvedEntryKey = typeof entryKey === 'function' ? entryKey(context) : entryKey;
                pending = loadDataStoreEntry({
                    entryKey: resolvedEntryKey,
                    context,
                    transform,
                    onUnavailable,
                    fallbackValue,
                }).then((result) => (result.state === 'missing' ? null : result.value));
            }
            return pending;
        };

        context.set(contextKey as unknown as DataStoreContextKey<LazyDataStoreLoader<T>>, loader);

        return next();
    };

    return lazyMiddleware;
}

/**
 * Reads a value populated by {@link createLazyDataStoreMiddleware}. Triggers
 * the underlying data-store fetch on first call and reuses the cached
 * promise on subsequent calls within the same request.
 *
 * Returns `null` when the lazy middleware did not run (no loader in
 * context) or when the entry is missing/invalid.
 */
export async function readLazyDataStoreEntry<T>(
    context: Readonly<RouterContextProvider>,
    contextKey: DataStoreContextKey<T>
): Promise<T | null> {
    const loader = context.get(contextKey as unknown as DataStoreContextKey<LazyDataStoreLoader<T>>);
    if (typeof loader !== 'function') return null;
    return loader();
}

type LazyDataStoreLoader<T> = () => Promise<T | null>;

type LoadResult<T> = { state: 'value'; value: T } | { state: 'fallback'; value: T } | { state: 'missing' };

/**
 * Internal helper shared by the eager and lazy middleware factories.
 * Performs the fetch + transform pipeline and resolves all three error
 * paths (unavailable / not-found / service-error) consistently. Returns a
 * tagged result so callers can decide whether to populate the context
 * synchronously (eager middleware) or hand the value back to a lazy reader.
 */
async function loadDataStoreEntry<T>(args: {
    entryKey: string;
    context: Readonly<RouterContextProvider>;
    transform: (value: Record<string, unknown>) => T;
    onUnavailable: 'throw' | 'fallback';
    fallbackValue: T | ((context: Readonly<RouterContextProvider>) => T) | undefined;
}): Promise<LoadResult<T>> {
    const { entryKey, context, transform, onUnavailable, fallbackValue } = args;

    try {
        const entry = await getDataStoreEntry(entryKey);

        if (!entry?.value || typeof entry.value !== 'object') {
            // eslint-disable-next-line no-console
            console.warn(`Data store entry '${entryKey}' not found or invalid.`);
            return { state: 'missing' };
        }

        return { state: 'value', value: transform(entry.value as Record<string, unknown>) };
    } catch (error) {
        if (error instanceof DataStoreUnavailableError) {
            if (onUnavailable === 'fallback' && typeof fallbackValue !== 'undefined') {
                const resolvedFallbackValue =
                    typeof fallbackValue === 'function'
                        ? (fallbackValue as (ctx: Readonly<RouterContextProvider>) => T)(context)
                        : fallbackValue;
                // eslint-disable-next-line no-console
                console.warn(`Data store unavailable for '${entryKey}'. Using configured fallback value.`);
                return { state: 'fallback', value: resolvedFallbackValue };
            }
            throw new Error(
                'Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.'
            );
        }
        if (error instanceof DataStoreNotFoundError) {
            // eslint-disable-next-line no-console
            console.warn(`Data store entry '${entryKey}' not found.`);
            return { state: 'missing' };
        }
        if (error instanceof DataStoreServiceError) {
            throw new Error(`Data store request failed for '${entryKey}'.`);
        }
        throw error;
    }
}

/**
 * Read a data-store entry through the singleton MRT utilities API.
 * The underlying implementation (production DynamoDB vs development pseudo store)
 * is resolved by `@salesforce/mrt-utilities/data-store` export conditions.
 *
 * @param key - Data-store entry key
 * @returns Data-store entry or null when missing/invalid shape
 */
export async function getDataStoreEntry<TValue = unknown>(key: string): Promise<DataStoreEntry<TValue> | null> {
    const entry = (await DataStore.getDataStore().getEntry(key)) as DataStoreEntry<TValue> | undefined;
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    return entry;
}

/**
 * Creates an entryKey function that prefixes the given suffix with the current site ID.
 *
 * @param suffix - The entry key suffix (e.g., "custom-site-preferences")
 * @returns A function compatible with `DataStoreMiddlewareOptions.entryKey`
 */
export function prefixWithSiteId(suffix: string): (context: Readonly<RouterContextProvider>) => string {
    return (context) => {
        const siteId = context.get(siteContext)?.site?.id;
        if (!siteId)
            throw new Error('Site id not found. Ensure site context middleware runs before data-store middleware.');
        return `${siteId}-${suffix}`;
    };
}
