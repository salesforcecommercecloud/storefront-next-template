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
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Mock config.server.ts so tests don't depend on real config data.
// loadConfig() inside the runtime dynamically imports this file.
vi.mock('../config.server.ts', () => ({
    default: {
        app: {
            url: {
                prefix: '/',
                excludeRoutes: ['/resource/**', '/action/**'],
            },
        },
    },
}));

describe('routes.ts', () => {
    let originalReactRouterAppDirectory: string;

    beforeEach(() => {
        originalReactRouterAppDirectory = globalThis.__reactRouterAppDirectory;
        globalThis.__reactRouterAppDirectory = __dirname;
    });

    afterEach(() => {
        globalThis.__reactRouterAppDirectory = originalReactRouterAppDirectory;
    });

    it('should export the routes object', async () => {
        const { default: routes } = await import('./routes');
        const resolvedRoutes = await routes;

        // Find the `_app` layout route (pathless layout) at the top level (no wrapper when prefix is '/')
        const defaultLayout = resolvedRoutes.find((r: any) => r.id === 'routes/_app');
        expect(defaultLayout).toBeDefined();
        expect(defaultLayout?.file).toBe('routes/_app.tsx');
        expect(defaultLayout?.children).toBeDefined();

        // Check some child routes that should be nested under the `_app` layout
        expect(defaultLayout?.children).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'routes/_app._index',
                    index: true,
                    path: undefined,
                }),
                expect.objectContaining({
                    id: 'routes/_app.category.$categoryId',
                    path: 'category/:categoryId',
                }),
                expect.objectContaining({
                    id: 'routes/_app.product.$productId',
                    path: 'product/:productId',
                }),
                expect.objectContaining({
                    id: 'routes/_app.cart',
                    path: 'cart',
                }),
                expect.objectContaining({
                    id: 'routes/_app.checkout',
                    path: 'checkout',
                }),
            ])
        );

        // Find the _empty layout route (pathless layout) at the top level
        const emptyLayout = resolvedRoutes.find((r: any) => r.id === 'routes/_empty');
        expect(emptyLayout).toBeDefined();
        expect(emptyLayout?.file).toBe('routes/_empty.tsx');
        expect(emptyLayout?.children).toBeDefined();

        // Check some child routes that should be nested under the `_empty` layout
        expect(emptyLayout?.children).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'routes/_empty.signup',
                    path: 'signup',
                }),
                expect.objectContaining({
                    id: 'routes/_empty.login',
                    path: 'login',
                }),
                expect.objectContaining({
                    id: 'routes/_empty.logout',
                    path: 'logout',
                }),
            ])
        );
    });
});
