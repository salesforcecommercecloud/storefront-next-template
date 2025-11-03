import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader } from './resource.api.locales.$lng.$ns';
import type { Route } from './+types/resource.api.locales.$lng.$ns';

// Mock the resources module - define inline to avoid hoisting issues
vi.mock('@/locales/.server', () => ({
    default: {
        en: {
            home: { title: 'Home', welcome: 'Welcome' },
            product: { addToCart: 'Add to Cart', price: 'Price' },
        },
        es: {
            home: { title: 'Inicio', welcome: 'Bienvenido' },
            product: { addToCart: 'Agregar al carrito', price: 'Precio' },
        },
    },
}));

// Mock react-router data function to make it testable
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        data: vi.fn((body: any, init?: any) => ({ __data: body, __init: init || {} })),
    };
});

describe('resource.api.locales.$lng.$ns', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset environment to test
        process.env.NODE_ENV = 'test';
    });

    describe('loader()', () => {
        const createLoaderArgs = (lng: string, ns: string): Route.LoaderArgs => ({
            params: { lng, ns },
            context: new Map(),
            request: new Request('http://localhost/resource/api/locales/en/home'),
        });

        describe('successful requests', () => {
            it('should return translations for valid language and namespace', () => {
                const result = loader(createLoaderArgs('en', 'home')) as any;

                expect(result.__data).toEqual({
                    title: 'Home',
                    welcome: 'Welcome',
                });
            });

            it('should return Spanish translations', () => {
                const result = loader(createLoaderArgs('es', 'product')) as any;

                expect(result.__data).toEqual({
                    addToCart: 'Agregar al carrito',
                    price: 'Precio',
                });
            });

            it('should return data for valid language and namespace', () => {
                const result = loader(createLoaderArgs('en', 'product')) as any;

                expect(result.__data).toEqual({
                    addToCart: 'Add to Cart',
                    price: 'Price',
                });
            });

            it('should not set cache headers in test environment', () => {
                process.env.NODE_ENV = 'test';
                const result = loader(createLoaderArgs('en', 'home')) as any;

                // In test environment, cache headers should not be set
                expect(result.__init.headers).toBeDefined();
                const headers = result.__init.headers as Headers;
                expect(headers.get('Cache-Control')).toBeNull();
            });

            it('should set cache headers in production environment', () => {
                process.env.NODE_ENV = 'production';
                const result = loader(createLoaderArgs('en', 'home')) as any;

                // In production, cache headers should be set
                expect(result.__init.headers).toBeDefined();
                const headers = result.__init.headers as Headers;
                expect(headers.get('Cache-Control')).toBeTruthy();
                expect(headers.get('Cache-Control')).toContain('max-age=300');
            });
        });

        describe('error handling', () => {
            it('should return 400 error for invalid language', () => {
                const result = loader(createLoaderArgs('invalid-lang', 'home')) as any;

                expect(result.__data).toHaveProperty('error');
                expect(result.__init.status).toBe(400);
            });

            it('should return 400 error for invalid namespace', () => {
                const result = loader(createLoaderArgs('en', 'invalid-namespace')) as any;

                expect(result.__data).toHaveProperty('error');
                expect(result.__init.status).toBe(400);
            });

            it('should return 400 error when language parameter is missing', () => {
                const args = {
                    params: { lng: undefined as any, ns: 'home' },
                    context: new Map(),
                    request: new Request('http://localhost/resource/api/locales'),
                } as Route.LoaderArgs;

                const result = loader(args) as any;

                expect(result.__data).toHaveProperty('error');
                expect(result.__init.status).toBe(400);
            });

            it('should return 400 error when namespace parameter is missing', () => {
                const args = {
                    params: { lng: 'en', ns: undefined as any },
                    context: new Map(),
                    request: new Request('http://localhost/resource/api/locales'),
                } as Route.LoaderArgs;

                const result = loader(args) as any;

                expect(result.__data).toHaveProperty('error');
                expect(result.__init.status).toBe(400);
            });

            it('should handle empty string language', () => {
                const result = loader(createLoaderArgs('', 'home')) as any;

                expect(result.__data).toHaveProperty('error');
                expect(result.__init.status).toBe(400);
            });

            it('should handle empty string namespace', () => {
                const result = loader(createLoaderArgs('en', '')) as any;

                expect(result.__data).toHaveProperty('error');
                expect(result.__init.status).toBe(400);
            });
        });

        describe('cache control', () => {
            it('should include correct cache control header in production', () => {
                process.env.NODE_ENV = 'production';
                const result = loader(createLoaderArgs('en', 'home')) as any;

                const headers = result.__init.headers as Headers;
                expect(headers.get('Cache-Control')).toBe(
                    'max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800'
                );
            });
        });
    });
});
