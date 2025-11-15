import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createTestContext } from '@/lib/test-utils';
import { type PropsWithChildren } from 'react';
import { createRoutesStub } from 'react-router';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { SessionData } from '@/lib/api/types';
import { clientLoader, default as App, ErrorBoundary, Layout, loader } from './root';
import { mockConfig } from '@/test-utils/config';

vi.mock('@/lib/i18next.client', async () => {
    const i18next = await import('i18next');
    const { initReactI18next } = await import('react-i18next');

    // Create a test i18n instance that mimics the client-side setup
    // (no resources pre-loaded, uses backend to fetch translations)
    const testInstance = i18next.default.createInstance();

    // Mock the backend to return empty translations for testing
    const mockBackend = {
        type: 'backend' as const,
        init: vi.fn(),
        read: vi.fn((language: string, namespace: string, callback: (error: any, data: any) => void) => {
            // Return empty translations to simulate the backend
            callback(null, {});
        }),
    };

    void testInstance
        .use(initReactI18next)
        .use(mockBackend)
        .init({
            lng: 'en',
            fallbackLng: 'en',
            ns: [], // Start with no namespaces loaded
            interpolation: {
                escapeValue: false,
            },
        });

    return {
        initI18next: vi.fn(() => testInstance),
    };
});

vi.mock('@/lib/api/categories', () => ({
    fetchCategory: vi.fn(),
}));

vi.mock('@/components/header', async () => ({
    ...(await vi.importActual('@/components/header')),
    default: ({ children }: PropsWithChildren) => <header data-testid="header">{children}</header>,
}));

vi.mock('@/components/footer', async () => ({
    ...(await vi.importActual('@/components/footer')),
    default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock('@/components/navigation-menu-mega', async () => ({
    ...(await vi.importActual('@/components/navigation-menu-mega')),
    default: () => <nav data-testid="navigation-menu-mega">Navigation Menu</nav>,
}));

vi.mock('@/components/toast', async () => ({
    ...(await vi.importActual('@/components/toast')),
    ToasterTheme: () => <div data-testid="toaster">Toaster</div>,
}));

vi.mock('@/extensions/store-locator/providers/store-locator', async () => ({
    ...(await vi.importActual('@/extensions/store-locator/providers/store-locator')),
    default: ({ children }: PropsWithChildren) => <div data-testid="store-locator-provider">{children}</div>,
}));

vi.mock('@/config', async () => ({
    ...(await vi.importActual('@/config')),
    ConfigProvider: ({ children }: PropsWithChildren) => <div data-testid="config-provider">{children}</div>,
}));

vi.mock('@/providers/auth', async () => ({
    ...(await vi.importActual('@/providers/auth')),
    default: ({ children }: PropsWithChildren) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock('@/providers/basket', async () => ({
    ...(await vi.importActual('@/providers/basket')),
    default: ({ children }: PropsWithChildren) => <div data-testid="basket-provider">{children}</div>,
}));

vi.mock('@/middlewares/auth.server', async () => ({
    ...(await vi.importActual('@/middlewares/auth.server')),
    default: vi.fn(),
    getAuth: vi.fn(() => ({
        access_token: 'test-token',
        customer_id: 'test-customer',
        userType: 'registered',
    })),
}));

vi.mock('@/middlewares/auth.client', async () => ({
    ...(await vi.importActual('@/middlewares/auth.client')),
    default: vi.fn(),
    getAuth: vi.fn(() => ({
        access_token: 'test-token',
        customer_id: 'test-customer',
        userType: 'registered',
    })),
}));

vi.mock('@/middlewares/basket.client', async () => ({
    ...(await vi.importActual('@/middlewares/basket.client')),
    default: vi.fn(),
    getBasket: vi.fn(() => ({
        basketId: 'test-basket-id',
        productItems: [],
    })),
}));

vi.mock('@/middlewares/i18next', async () => {
    const i18next = await import('i18next');
    const { initReactI18next } = await import('react-i18next');
    const resources = await import('@/locales');

    // Create a test i18n instance for server-side
    const testInstance = i18next.default.createInstance();
    void testInstance.use(initReactI18next).init({
        lng: 'en',
        fallbackLng: 'en',
        resources: resources.default,
        interpolation: {
            escapeValue: false,
        },
    });

    return {
        ...(await vi.importActual('@/middlewares/i18next')),
        getLocale: vi.fn(() => 'en'),
        getInstance: vi.fn(() => testInstance),
        i18nextMiddleware: vi.fn(),
    };
});

function ContentComponent() {
    return <div data-testid="content">Content</div>;
}

function LayoutComponent() {
    return (
        <Layout>
            <ContentComponent />
        </Layout>
    );
}

describe('root.tsx', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Layout Component', () => {
        it('should render html structure with meta tags', () => {
            const Stub = createRoutesStub([
                {
                    path: '/',
                    Component: LayoutComponent,
                },
            ]);

            const { getByTestId } = render(<Stub initialEntries={['/']} />);
            expect(getByTestId('content')).toBeInTheDocument();
            expect(getByTestId('toaster')).toBeInTheDocument();

            const html = document.querySelector('html');
            expect(html).toBeInTheDocument();
            expect(html).toHaveAttribute('lang', 'en');

            const title = document.querySelector('title');
            expect(title).toBeInTheDocument();
            expect(title?.textContent).toBe('NextGen PWA Kit Store');

            const charset = document.head.querySelector('meta[charset="utf-8"]');
            const viewport = document.head.querySelector('meta[name="viewport"]');
            const description = document.head.querySelector('meta[name="description"]');
            expect(charset).toBeInTheDocument();
            expect(viewport).toBeInTheDocument();
            expect(description).toBeInTheDocument();
            expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1');
            expect(description).toHaveAttribute('content', 'Welcome to our web store for high performers!');

            const favicon = document.querySelector('link[rel="icon"]');
            expect(favicon).toBeInTheDocument();
            expect(favicon).toHaveAttribute('type', 'image/x-icon');
        });
    });

    describe('ErrorBoundary Component', () => {
        const stackText = 'Error: Test error with stack';

        describe('development mode', () => {
            it('should render normal error with message', () => {
                const error = new Error('Test error');
                error.stack = stackText;

                const { getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Oops!')).toBeInTheDocument();
                expect(getByText('Test error')).toBeInTheDocument();

                const stackElement = getByText(stackText);
                expect(stackElement).toBeInTheDocument();
                expect(stackElement.closest('pre')).toBeInTheDocument();
            });

            it('should render normal error without message', () => {
                const error = new Error('');
                error.stack = stackText;

                const { getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Oops!')).toBeInTheDocument();
                expect(getByText('An unexpected error occurred.')).toBeInTheDocument();

                const stackElement = getByText(stackText);
                expect(stackElement).toBeInTheDocument();
                expect(stackElement.closest('pre')).toBeInTheDocument();
            });

            it('should render predefined 404 error message for route errors with 404 status', () => {
                const error = {
                    status: 404,
                    statusText: 'Not Found',
                    data: {},
                    internal: false,
                };
                const { container, getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('404')).toBeInTheDocument();
                expect(getByText('The requested page could not be found.')).toBeInTheDocument();
                expect(container.querySelector('pre')).not.toBeInTheDocument();
                expect(container.querySelector('code')).not.toBeInTheDocument();
            });

            it('should render custom status text for non-404 route errors', () => {
                const error = {
                    status: 500,
                    statusText: 'Internal Server Error',
                    data: {},
                    internal: false,
                };
                const { container, getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Error')).toBeInTheDocument();
                expect(getByText('Internal Server Error')).toBeInTheDocument();
                expect(container.querySelector('pre')).not.toBeInTheDocument();
                expect(container.querySelector('code')).not.toBeInTheDocument();
            });
        });

        describe('production mode', () => {
            let originalEnv = import.meta.env.DEV;

            beforeEach(() => {
                originalEnv = import.meta.env.DEV;
                import.meta.env.DEV = false;
            });

            afterEach(() => {
                import.meta.env.DEV = originalEnv;
            });

            it('should render normal error with message', () => {
                const error = new Error('Test error');
                const { container, getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Oops!')).toBeInTheDocument();
                expect(getByText('An unexpected error occurred.')).toBeInTheDocument();
                expect(container.querySelector('pre')).not.toBeInTheDocument();
                expect(container.querySelector('code')).not.toBeInTheDocument();
            });

            it('should render normal error without message', () => {
                const error = new Error('');
                const { container, getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Oops!')).toBeInTheDocument();
                expect(getByText('An unexpected error occurred.')).toBeInTheDocument();
                expect(container.querySelector('pre')).not.toBeInTheDocument();
                expect(container.querySelector('code')).not.toBeInTheDocument();
            });

            it('should render predefined 404 error message for route errors with 404 status', () => {
                const error = {
                    status: 404,
                    statusText: 'Not Found',
                    data: {},
                    internal: false,
                };
                const { container, getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('404')).toBeInTheDocument();
                expect(getByText('The requested page could not be found.')).toBeInTheDocument();
                expect(container.querySelector('pre')).not.toBeInTheDocument();
                expect(container.querySelector('code')).not.toBeInTheDocument();
            });

            it('should render custom status text for non-404 route errors', () => {
                const error = {
                    status: 500,
                    statusText: 'Internal Server Error',
                    data: {},
                    internal: false,
                };
                const { container, getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Error')).toBeInTheDocument();
                expect(getByText('Internal Server Error')).toBeInTheDocument();
                expect(container.querySelector('pre')).not.toBeInTheDocument();
                expect(container.querySelector('code')).not.toBeInTheDocument();
            });
        });
    });

    describe('App Component', () => {
        it('should render html structure with provider components', async () => {
            const { fetchCategory } = await import('@/lib/api/categories');

            const mockCategory: ShopperProducts.schemas['Category'] = {
                id: 'root',
                name: 'Root Category',
                categories: [
                    { id: 'cat-1', name: 'Category 1' },
                    { id: 'cat-2', name: 'Category 2' },
                ],
            };

            vi.mocked(fetchCategory).mockResolvedValue(mockCategory);

            const Stub = createRoutesStub([
                {
                    id: 'root',
                    path: '/',
                    Component: App,
                    loader: () => ({
                        root: Promise.resolve(mockCategory),
                        subs: Promise.resolve([mockCategory]),
                        auth: () => ({
                            access_token: 'test-token',
                            customer_id: 'test-customer',
                            userType: 'registered',
                        }),
                        basket: { basketId: 'test-basket', productItems: [] },
                        appConfig: mockConfig,
                    }),
                },
            ]);

            const { getByTestId } = render(<Stub initialEntries={['/']} />);

            await waitFor(() => {
                expect(getByTestId('header')).toBeInTheDocument();
                expect(getByTestId('footer')).toBeInTheDocument();
                expect(getByTestId('navigation-menu-mega')).toBeInTheDocument();
                expect(getByTestId('config-provider')).toBeInTheDocument();
                expect(getByTestId('auth-provider')).toBeInTheDocument();
                expect(getByTestId('basket-provider')).toBeInTheDocument();
                expect(getByTestId('store-locator-provider')).toBeInTheDocument();
            });
        });
    });

    describe('loader function', () => {
        it('should return category promises and auth function', async () => {
            const { fetchCategory } = await import('@/lib/api/categories');

            const mockRootCategory: ShopperProducts.schemas['Category'] = {
                id: 'root',
                name: 'Root',
                categories: [
                    { id: 'cat-1', name: 'Category 1', onlineSubCategoriesCount: 2 },
                    { id: 'cat-2', name: 'Category 2', onlineSubCategoriesCount: 0 },
                ],
            };

            vi.mocked(fetchCategory).mockResolvedValueOnce(mockRootCategory);
            vi.mocked(fetchCategory).mockResolvedValue({ id: 'sub', name: 'Sub' });

            const context = createTestContext();
            const result = loader({ context, request: new Request('http://localhost'), params: {} }) as any;

            expect(result).toHaveProperty('root');
            expect(result).toHaveProperty('subs');
            expect(result).toHaveProperty('auth');
            expect(typeof result.auth).toBe('function');

            // Verify fetchCategory was called correctly
            expect(fetchCategory).toHaveBeenCalledWith(context, 'root', 1);

            // Wait for root promise to resolve
            const rootCategory = await result.root;
            expect(rootCategory).toEqual(mockRootCategory);

            // Verify sub categories are fetched
            await result.subs;
            expect(fetchCategory).toHaveBeenCalledWith(context, 'cat-1', 2);
            expect(fetchCategory).not.toHaveBeenCalledWith(context, 'cat-2', 2);
        });

        it('should not fetch sub categories when onlineSubCategoriesCount is 0', async () => {
            const { fetchCategory } = await import('@/lib/api/categories');

            const mockRootCategory: ShopperProducts.schemas['Category'] = {
                id: 'root',
                name: 'Root',
                categories: [
                    { id: 'cat-1', name: 'Category 1', onlineSubCategoriesCount: 0 },
                    { id: 'cat-2', name: 'Category 2', onlineSubCategoriesCount: 0 },
                ],
            };

            vi.mocked(fetchCategory).mockResolvedValue(mockRootCategory);

            const context = createTestContext();
            const result = loader({ context, request: new Request('http://localhost'), params: {} }) as any;

            await result.root;
            const subs = await result.subs;

            expect(subs).toEqual([]);
            expect(fetchCategory).toHaveBeenCalledTimes(1);
        });

        it('should call getAuth to retrieve session data', async () => {
            const { fetchCategory } = await import('@/lib/api/categories');
            const { getAuth } = await import('@/middlewares/auth.server');

            const mockSession: SessionData = {
                access_token: 'test-token',
                customer_id: 'test-customer',
                userType: 'registered',
            };

            vi.mocked(fetchCategory).mockResolvedValue({ id: 'root', name: 'Root' });
            vi.mocked(getAuth).mockReturnValue(mockSession);

            const context = createTestContext();
            const result = loader({ context, request: new Request('http://localhost'), params: {} }) as any;

            expect(getAuth).toHaveBeenCalledWith(context);
            expect(result.auth()).toEqual(mockSession);
        });
    });

    describe('clientLoader function', () => {
        it('should return auth function and basket', async () => {
            const { getAuth } = await import('@/middlewares/auth.client');
            const { getBasket } = await import('@/middlewares/basket.client');

            const mockSession: SessionData = {
                access_token: 'test-token',
                customer_id: 'test-customer',
                userType: 'registered',
            };

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket',
                productItems: [],
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);
            vi.mocked(getBasket).mockReturnValue(mockBasket);

            const context = createTestContext();
            const result = clientLoader({
                context,
                request: new Request('http://localhost'),
                params: {},
                serverLoader: vi.fn(),
            }) as any;

            expect(result).toHaveProperty('auth');
            expect(result).toHaveProperty('basket');
            expect(typeof result.auth).toBe('function');
            expect(typeof result.basket).toBe('object');

            expect(getAuth).not.toHaveBeenCalled();
            expect(getBasket).toHaveBeenCalledWith(context);
            expect(result.auth()).toEqual(mockSession);
            expect(result.basket).toEqual(mockBasket);
        });

        it('should have hydrate property set to true', () => {
            expect(clientLoader.hydrate).toBe(true);
        });
    });

    describe('middleware exports', () => {
        it('should export server middleware array', async () => {
            const { middleware } = await import('./root');
            expect(Array.isArray(middleware)).toBe(true);
            expect(middleware.length).toBeGreaterThan(0);
        });

        it('should export client middleware array', async () => {
            const { clientMiddleware } = await import('./root');
            expect(Array.isArray(clientMiddleware)).toBe(true);
            expect(clientMiddleware.length).toBeGreaterThan(0);
        });
    });
});
