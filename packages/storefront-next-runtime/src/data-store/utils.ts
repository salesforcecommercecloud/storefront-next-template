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
    DataStoreNotFoundError,
    DataStoreServiceError,
    DataStoreUnavailableError,
} from '@salesforce/mrt-utilities/middleware';
import { getDefaultDataStoreProvider, type DataStoreProvider } from './provider';
import { siteContext } from '../site-context';

export type DataStoreContextKey<T> = ReturnType<typeof createContext<T | null>>;

export type DataStoreEntryKey = string | ((context: Readonly<RouterContextProvider>) => string);

export type DataStoreMiddlewareOptions<T> = {
    entryKey: DataStoreEntryKey;
    context: DataStoreContextKey<T>;
    transform?: (value: Record<string, unknown>) => T;
    provider?: DataStoreProvider | Promise<DataStoreProvider>;
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
    const { entryKey, context: contextKey } = options;
    const transform = options.transform ?? ((value: Record<string, unknown>) => value as T);
    const providerPromise = options.provider ? Promise.resolve(options.provider) : getDefaultDataStoreProvider();

    const dataStoreMiddleware: MiddlewareFunction<Response> = async ({ context }, next) => {
        const resolvedEntryKey = typeof entryKey === 'function' ? entryKey(context) : entryKey;
        try {
            const provider = await providerPromise;
            const entry = await provider.getEntry(resolvedEntryKey);

            if (!entry?.value || typeof entry.value !== 'object') {
                // eslint-disable-next-line no-console
                console.warn(`Data store entry '${resolvedEntryKey}' not found or invalid.`);
                return next();
            }
            context.set(contextKey, transform(entry.value as Record<string, unknown>));
        } catch (error) {
            if (error instanceof DataStoreUnavailableError) {
                throw new Error(
                    'Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.'
                );
            }
            if (error instanceof DataStoreNotFoundError) {
                // eslint-disable-next-line no-console
                console.warn(`Data store entry '${resolvedEntryKey}' not found.`);
                return next();
            }
            if (error instanceof DataStoreServiceError) {
                throw new Error(`Data store request failed for '${resolvedEntryKey}'.`);
            }
            throw error;
        }

        return next();
    };

    return dataStoreMiddleware;
}

/**
 * Check whether MRT environment variables are present.
 *
 * @returns True when all MRT environment variables are set.
 * @example
 * if (hasMrtEnvironment()) {
 *   // Use MRT provider
 * }
 */
export function hasMrtEnvironment(): boolean {
    return Boolean(process.env.AWS_REGION && process.env.MOBIFY_PROPERTY_ID && process.env.DEPLOY_TARGET);
}

/**
 * Check whether the runtime is in a development environment.
 *
 * @returns True when NODE_ENV is not "production".
 * @example
 * if (isDevelopmentEnvironment()) {
 *   // Load local provider
 * }
 */
export function isDevelopmentEnvironment(): boolean {
    return process.env.NODE_ENV !== 'production';
}

/**
 * Attempt to import the local provider from the dev package or workspace path.
 *
 * @returns Local provider module.
 * @throws Error when the provider cannot be resolved.
 * @example
 * const module = await tryImportLocalProvider();
 * const provider = module.createLocalDataStoreProvider();
 */
export async function tryImportLocalProvider() {
    try {
        // @ts-expect-error - resolved at runtime from dev package
        return await import(/* @vite-ignore */ '@salesforce/storefront-next-dev/data-store/local-provider');
    } catch (error) {
        throw new Error(
            'Failed to load local data-store provider. Ensure @salesforce/storefront-next-dev is installed.',
            { cause: error }
        );
    }
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
