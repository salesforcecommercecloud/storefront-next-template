import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

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
        return expect(routes).resolves.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'routes/_index',
                    path: undefined,
                }),
                expect.objectContaining({
                    id: 'routes/category.$categoryId',
                    path: 'category/:categoryId',
                }),
                expect.objectContaining({
                    id: 'routes/product.$productId',
                    path: 'product/:productId',
                }),
                expect.objectContaining({
                    id: 'routes/cart',
                    path: 'cart',
                }),
                expect.objectContaining({
                    id: 'routes/checkout',
                    path: 'checkout',
                }),
            ])
        );
    });
});
