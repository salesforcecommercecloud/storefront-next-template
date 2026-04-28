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
import { createContext, type RouterContextProvider } from 'react-router';
import type { Clients, Middleware } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Names of SCAPI clients that support middleware registration.
 *
 * Derived from the {@link Clients} type by selecting only keys whose values
 * expose a `use` method (i.e. ProxyClient instances), which excludes
 * non-client members like `auth`, `basket`, and `use`.
 */
type ScapiClientName = {
    [K in keyof Clients]: Clients[K] extends { use: (middleware: Middleware) => void } ? K : never;
}[keyof Clients];

export interface ScapiMiddlewareEntry {
    /**
     * Factory that receives the router context and returns an openapi-fetch
     * middleware to register, or `null` to skip registration.
     *
     * Called by {@link createApiClients} after all React Router middleware has
     * run, so every context value is guaranteed to be available regardless of
     * middleware ordering.
     */
    factory: (context: RouterContextProvider | Readonly<RouterContextProvider>, clients: Clients) => Middleware | null;
    /**
     * Scope the middleware to specific SCAPI clients.
     * When omitted, the middleware is registered globally on all clients.
     */
    clients?: ScapiClientName[];
}

/**
 * React Router context for SCAPI client middleware registration.
 *
 * React Router middleware can push factory entries into this array during their
 * execution. {@link createApiClients} calls each factory with the router context
 * and applies the returned middleware to the appropriate SCAPI clients.
 *
 * Because factories are invoked at client-creation time (inside loaders/actions),
 * all context values are available — there is no ordering dependency between
 * the middleware that registers the factory and the middleware that populates
 * the context values the factory reads.
 */
export const scapiMiddlewareContext = createContext<ScapiMiddlewareEntry[]>([]);
