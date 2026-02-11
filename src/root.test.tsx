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
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createTestContext } from '@/lib/test-utils';
import { type PropsWithChildren } from 'react';
import { createRoutesStub } from 'react-router';
import type { PublicSessionData } from '@/lib/api/types';
import type AppComponent from './root';
import type { ErrorBoundary as RootErrorBoundary, Layout as RootLayout, loader as RootLoader } from './root';

let App: typeof AppComponent;
let ErrorBoundary: typeof RootErrorBoundary;
let Layout: typeof RootLayout;
let loader: typeof RootLoader;
const defaultClientAuth: PublicSessionData = {
    customerId: 'test-customer',
    userType: 'registered',
};
import { mockConfig } from '@/test-utils/config';
// @sfdc-extension-block-start SFDC_EXT_HYBRID_PROXY
import { isProxyPath } from '@/extensions/hybrid-proxy/config';
// @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY

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
        read: vi.fn((_language: string, _namespace: string, callback: (error: any, data: any) => void) => {
            // Return empty translations to simulate the backend
            callback(null, {});
        }),
    };

    void testInstance
        .use(initReactI18next)
        .use(mockBackend)
        .init({
            lng: 'en-US',
            fallbackLng: 'en-US',
            ns: [], // Start with no namespaces loaded
            interpolation: {
                escapeValue: false,
            },
        });

    return {
        initI18next: vi.fn(() => testInstance),
    };
});

vi.mock('@/components/toast', async () => ({
    ...(await vi.importActual('@/components/toast')),
    ToasterTheme: () => <div data-testid="toaster">Toaster</div>,
}));

vi.mock('@/components/tracking-consent-banner', async () => ({
    ...(await vi.importActual('@/components/tracking-consent-banner')),
    TrackingConsentBanner: () => <div data-testid="tracking-consent-banner">Tracking Consent Banner</div>,
}));

// @sfdc-extension-block-start SFDC_EXT_HYBRID_PROXY
vi.mock('@/extensions/hybrid-proxy/navigation-interceptor', () => ({
    HybridProxyNavigationInterceptor: () => <div data-testid="hybrid-proxy-interceptor">Hybrid Proxy Interceptor</div>,
}));

vi.mock('@/extensions/hybrid-proxy/config', () => ({
    isProxyPath: vi.fn(),
}));
// @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY

vi.mock('@/config', async () => {
    const actual = await vi.importActual('@/config');
    const { ConfigContext, createAppConfig } = await import('@/config/context');
    const { mockBuildConfig } = await import('@/test-utils/config');

    return {
        ...actual,
        ConfigProvider: ({ children }: PropsWithChildren) => (
            <ConfigContext.Provider value={createAppConfig(mockBuildConfig)}>
                <div data-testid="config-provider">{children}</div>
            </ConfigContext.Provider>
        ),
    };
});

vi.mock('@/providers/auth', async () => ({
    ...(await vi.importActual('@/providers/auth')),
    default: ({ children }: PropsWithChildren) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock('@/providers/basket', async () => ({
    ...(await vi.importActual('@/providers/basket')),
    default: ({ children }: PropsWithChildren) => <div data-testid="basket-provider">{children}</div>,
}));

vi.mock('@salesforce/storefront-next-runtime/design/react/core', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        PageDesignerProvider: ({ children }: PropsWithChildren) => (
            <div data-testid="page-designer-provider">{children}</div>
        ),
    };
});

vi.mock('@/middlewares/auth.client', async () => ({
    ...(await vi.importActual('@/middlewares/auth.client')),
    default: vi.fn(),
    getAuth: vi.fn(() => ({
        accessToken: 'test-token',
        customerId: 'test-customer',
        userType: 'registered',
    })),
}));

vi.mock('@/middlewares/basket.server', async () => ({
    ...(await vi.importActual('@/middlewares/basket.server')),
    default: vi.fn(),
    getBasket: vi.fn(() => Promise.resolve({ current: null, snapshot: null })),
}));

vi.mock('@/middlewares/i18next', async () => {
    const i18next = await import('i18next');
    const { initReactI18next } = await import('react-i18next');
    const resources = await import('@/locales');

    // Create a test i18n instance for server-side
    const testInstance = i18next.default.createInstance();
    void testInstance.use(initReactI18next).init({
        lng: 'en-US',
        fallbackLng: 'en-US',
        resources: resources.default,
        interpolation: {
            escapeValue: false,
        },
    });

    return {
        ...(await vi.importActual('@/middlewares/i18next')),
        i18nextMiddleware: vi.fn(),
    };
});

beforeAll(async () => {
    const rootModule = await import('./root');
    App = rootModule.default;
    ErrorBoundary = rootModule.ErrorBoundary;
    Layout = rootModule.Layout;
    loader = rootModule.loader;
});

function createLoaderContext(options: Parameters<typeof createTestContext>[0] = {}) {
    const context = createTestContext(options);
    const baseGet = context.get.bind(context);
    const authFallback = new Map() as Map<string, unknown> & { ref?: PublicSessionData };
    const authSession =
        options.authSession === null ? undefined : { ...defaultClientAuth, ...(options.authSession ?? {}) };
    authFallback.ref = authSession;

    context.get = ((key) => {
        try {
            return baseGet(key);
        } catch {
            // If additional context keys need to be shimmed in tests, handle them here.
            return authFallback;
        }
    }) as typeof context.get;

    return context;
}

function ContentComponent() {
    return <div data-testid="content">Content</div>;
}

/**
 * HydrateFallback is required when using createRoutesStub with components that have loaders.
 * Without it, React Router throws "Cannot destructure property 'basename' of 'undefined'"
 * during the hydration phase. This is a React Router v7 testing requirement.
 */
function HydrateFallback() {
    return <div data-testid="hydrate-fallback">Loading...</div>;
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
            expect(html).toHaveAttribute('lang', 'en-US');

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

        it('should render preconnect links from config', async () => {
            // Mock useMatches to return appConfig in the root route data
            const reactRouter = await import('react-router');
            const useMatchesSpy = vi.spyOn(reactRouter, 'useMatches').mockReturnValue([
                {
                    id: 'root',
                    pathname: '/',
                    params: {},
                    data: { appConfig: mockConfig },
                    handle: undefined,
                },
            ] as any);

            const Stub = createRoutesStub([
                {
                    id: 'root',
                    path: '/',
                    Component: LayoutComponent,
                },
            ]);

            render(<Stub initialEntries={['/']} />);

            await waitFor(() => {
                const preconnectLinks = document.querySelectorAll('link[rel="preconnect"]');
                expect(preconnectLinks.length).toBeGreaterThan(0);
                expect(preconnectLinks[0]).toHaveAttribute('href', 'https://edge.disstg.commercecloud.salesforce.com');
            });

            useMatchesSpy.mockRestore();
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
        // Note: Each test creates its own i18next instance because it must be passed to
        // the loader's getI18next function. A shared beforeEach setup wouldn't work here
        // since each test's route stub needs its own instance reference.

        it('should render html structure with provider components', async () => {
            // Create i18next instance for this test's loader
            const i18next = await import('i18next');
            const { initReactI18next } = await import('react-i18next');
            const testI18nInstance = i18next.default.createInstance();
            await testI18nInstance.use(initReactI18next).init({
                lng: 'en-US',
                fallbackLng: 'en-US',
                resources: { en: { translation: {} } },
            });

            const Stub = createRoutesStub([
                {
                    id: 'root',
                    path: '/',
                    Component: App,
                    HydrateFallback,
                    loader: () => ({
                        clientAuth: {
                            customerId: 'test-customer',
                            userType: 'registered',
                        },
                        basketSnapshot: null,
                        appConfig: mockConfig,
                        locale: 'en-US',
                        currency: 'USD',
                        getI18next: () => testI18nInstance,
                    }),
                },
            ]);

            const { getByTestId } = render(<Stub initialEntries={['/']} />);

            await waitFor(() => {
                expect(getByTestId('page-designer-provider')).toBeInTheDocument(); // <-- part of the conditional App content
                expect(getByTestId('config-provider')).toBeInTheDocument(); // <-- always there
                expect(getByTestId('auth-provider')).toBeInTheDocument(); // <-- always there
                expect(getByTestId('basket-provider')).toBeInTheDocument(); // <-- always there
            });
        });

        it.skip('should fall back to AuthContext default value when clientAuth is undefined', async () => {
            const { AuthContext } = await import('@/providers/auth');

            const mockInitialAuth: PublicSessionData = {
                customerId: 'initial-customer',
                userType: 'guest',
            };

            // Simulate the context having a default value
            // In tests, we can wrap with a provider to override the default
            const TestApp = (props: any) => (
                <AuthContext.Provider value={mockInitialAuth}>
                    <App {...props} />
                </AuthContext.Provider>
            );

            const Stub = createRoutesStub([
                {
                    id: 'root',
                    path: '/',
                    Component: TestApp,
                    loader: () => ({
                        clientAuth: undefined, // No auth from loader, should fall back to context default
                        basketSnapshot: null,
                        appConfig: mockConfig,
                    }),
                },
            ]);

            const { getByTestId } = render(<Stub initialEntries={['/']} />);

            await waitFor(() => {
                expect(getByTestId('auth-provider')).toBeInTheDocument();
            });
        });

        it('should use window.__APP_CONFIG__ when serverData.appConfig is not available', async () => {
            // Set window.__APP_CONFIG__ as fallback
            (window as any).__APP_CONFIG__ = mockConfig;

            // Create i18next instance for this test's loader
            const i18next = await import('i18next');
            const { initReactI18next } = await import('react-i18next');
            const testI18nInstance = i18next.default.createInstance();
            await testI18nInstance.use(initReactI18next).init({
                lng: 'en-US',
                fallbackLng: 'en-US',
                resources: { en: { translation: {} } },
            });

            const Stub = createRoutesStub([
                {
                    id: 'root',
                    path: '/',
                    Component: App,
                    HydrateFallback,
                    loader: () => ({
                        clientAuth: {
                            customerId: 'test-customer',
                            userType: 'registered',
                        },
                        basketSnapshot: null,
                        locale: 'en-US',
                        currency: 'USD',
                        getI18next: () => testI18nInstance,
                        // appConfig not in loader data
                    }),
                },
            ]);

            const { getByTestId } = render(<Stub initialEntries={['/']} />);

            await waitFor(() => {
                expect(getByTestId('config-provider')).toBeInTheDocument();
            });

            // Cleanup
            delete (window as any).__APP_CONFIG__;
        });

        // @sfdc-extension-block-start SFDC_EXT_HYBRID_PROXY
        describe('Hybrid Proxy Integration', () => {
            it('should render normal app structure when not on proxy path', async () => {
                vi.mocked(isProxyPath).mockReturnValue(false);

                // Create a mock i18next instance for testing
                const i18next = await import('i18next');
                const { initReactI18next } = await import('react-i18next');
                const testI18nInstance = i18next.default.createInstance();
                await testI18nInstance.use(initReactI18next).init({
                    lng: 'en-US',
                    fallbackLng: 'en-US',
                    resources: { 'en-US': { translation: {} } },
                });

                const Stub = createRoutesStub([
                    {
                        id: 'root',
                        path: '/',
                        Component: App,
                        HydrateFallback,
                        loader: () => ({
                            clientAuth: {
                                customerId: 'test-customer',
                                userType: 'registered',
                            },
                            basketSnapshot: null,
                            appConfig: mockConfig,
                            locale: 'en-US',
                            currency: 'USD',
                            getI18next: () => testI18nInstance,
                        }),
                    },
                ]);

                const { getByTestId, queryByTestId } = render(<Stub initialEntries={['/']} />);

                await waitFor(() => {
                    expect(getByTestId('page-designer-provider')).toBeInTheDocument(); // <-- part of the conditional App content
                    expect(getByTestId('config-provider')).toBeInTheDocument(); // <-- always there
                    expect(queryByTestId('hybrid-proxy-interceptor')).not.toBeInTheDocument();
                });
            });

            it('should render interceptor and hide app structure when on proxy path', async () => {
                vi.mocked(isProxyPath).mockReturnValue(true);

                // Create a mock i18next instance for testing
                const i18next = await import('i18next');
                const { initReactI18next } = await import('react-i18next');
                const testI18nInstance = i18next.default.createInstance();
                await testI18nInstance.use(initReactI18next).init({
                    lng: 'en-US',
                    fallbackLng: 'en-US',
                    resources: { 'en-US': { translation: {} } },
                });

                const Stub = createRoutesStub([
                    {
                        id: 'root',
                        // The actual path doesn't matter here since we mock isProxyPath() to return true
                        path: '/cart',
                        Component: App,
                        HydrateFallback,
                        loader: () => ({
                            clientAuth: {
                                customerId: 'test-customer',
                                userType: 'registered',
                            },
                            basketSnapshot: null,
                            appConfig: mockConfig,
                            locale: 'en-US',
                            currency: 'USD',
                            getI18next: () => testI18nInstance,
                        }),
                    },
                ]);

                const { getByTestId, queryByTestId } = render(<Stub initialEntries={['/cart']} />);

                await waitFor(() => {
                    expect(getByTestId('hybrid-proxy-interceptor')).toBeInTheDocument();
                    expect(getByTestId('config-provider')).toBeInTheDocument(); // <-- always there
                    expect(queryByTestId('page-designer-provider')).not.toBeInTheDocument(); // <-- part of the conditional App content
                });
            });
        });
        // @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY
    });

    describe('loader function', () => {
        it('should return clientAuth and other loader data', async () => {
            const { i18nextContext } = await import('@/lib/i18next');
            const i18next = await import('i18next');
            const { initReactI18next } = await import('react-i18next');
            const resources = await import('@/locales');

            // Set up i18next context
            const testInstance = i18next.default.createInstance();
            void testInstance.use(initReactI18next).init({
                lng: 'en-US',
                fallbackLng: 'en-US',
                resources: resources.default,
                interpolation: {
                    escapeValue: false,
                },
            });

            const context = createLoaderContext();
            // Set up i18next context with bound functions
            context.set(i18nextContext, {
                getLocale: () => 'en-US',
                getI18nextInstance: () => testInstance,
            });

            const result = loader({
                context,
                request: new Request('http://localhost'),
                params: {},
                unstable_pattern: '/',
            }) as any;

            expect(result).toHaveProperty('clientAuth');
            expect(result).toHaveProperty('appConfig');
            expect(result).toHaveProperty('locale');
            expect(result).toHaveProperty('getI18next');
            expect(typeof result.clientAuth).toBe('object');
            expect(typeof result.getI18next).toBe('function');
            expect(result.locale).toBe('en-US');
        });

        it('should return clientAuth with non-sensitive session data', async () => {
            const { i18nextContext } = await import('@/lib/i18next');
            const i18next = await import('i18next');
            const { initReactI18next } = await import('react-i18next');
            const resources = await import('@/locales');

            const mockClientAuth: PublicSessionData = {
                customerId: 'test-customer',
                userType: 'registered',
            };

            // Set up i18next context
            const testInstance = i18next.default.createInstance();
            void testInstance.use(initReactI18next).init({
                lng: 'en-US',
                fallbackLng: 'en-US',
                resources: resources.default,
                interpolation: {
                    escapeValue: false,
                },
            });

            const context = createLoaderContext({ authSession: mockClientAuth });
            // Set up i18next context with bound functions
            context.set(i18nextContext, {
                getLocale: () => 'en-US',
                getI18nextInstance: () => testInstance,
            });

            const result = loader({
                context,
                request: new Request('http://localhost'),
                params: {},
                unstable_pattern: '/',
            }) as any;

            // clientAuth should contain only non-sensitive fields
            expect(result.clientAuth).toEqual(expect.objectContaining(mockClientAuth));
            expect(result.clientAuth).not.toHaveProperty('accessToken');
            expect(result.clientAuth).not.toHaveProperty('refreshToken');
            expect(result.appConfig).toBeDefined();
            expect(result.locale).toBe('en-US');
            expect(typeof result.getI18next).toBe('function');
        });

        it('should throw error when i18next data is not found in context', () => {
            const context = createLoaderContext({ skipI18next: true });
            // Do not set i18next context to simulate missing middleware

            expect(() => {
                loader({ context, request: new Request('http://localhost'), params: {}, unstable_pattern: '/' });
            }).toThrow('i18next data not found in context. Ensure i18next middleware runs before loaders.');
        });

        it('should return pageDesignerMode as EDIT when mode=EDIT is in URL', async () => {
            const { i18nextContext } = await import('@/lib/i18next');
            const i18next = await import('i18next');
            const { initReactI18next } = await import('react-i18next');
            const resources = await import('@/locales');

            const testInstance = i18next.default.createInstance();
            void testInstance.use(initReactI18next).init({
                lng: 'en',
                fallbackLng: 'en',
                resources: resources.default,
                interpolation: {
                    escapeValue: false,
                },
            });

            const context = createLoaderContext();
            context.set(i18nextContext, {
                getLocale: () => 'en',
                getI18nextInstance: () => testInstance,
            });

            const result = loader({
                context,
                request: new Request('http://localhost?mode=EDIT'),
                params: {},
                unstable_pattern: '/',
            }) as any;

            expect(result.pageDesignerMode).toBe('EDIT');
        });

        it('should return pageDesignerMode as PREVIEW when mode=PREVIEW is in URL', async () => {
            const { i18nextContext } = await import('@/lib/i18next');
            const i18next = await import('i18next');
            const { initReactI18next } = await import('react-i18next');
            const resources = await import('@/locales');

            const testInstance = i18next.default.createInstance();
            void testInstance.use(initReactI18next).init({
                lng: 'en',
                fallbackLng: 'en',
                resources: resources.default,
                interpolation: {
                    escapeValue: false,
                },
            });

            const context = createLoaderContext();
            context.set(i18nextContext, {
                getLocale: () => 'en',
                getI18nextInstance: () => testInstance,
            });

            const result = loader({
                context,
                request: new Request('http://localhost?mode=PREVIEW'),
                params: {},
                unstable_pattern: '/',
            }) as any;

            expect(result.pageDesignerMode).toBe('PREVIEW');
        });

        it('should return pageDesignerMode as undefined when no mode parameter is in URL', async () => {
            const { i18nextContext } = await import('@/lib/i18next');
            const i18next = await import('i18next');
            const { initReactI18next } = await import('react-i18next');
            const resources = await import('@/locales');

            const testInstance = i18next.default.createInstance();
            void testInstance.use(initReactI18next).init({
                lng: 'en',
                fallbackLng: 'en',
                resources: resources.default,
                interpolation: {
                    escapeValue: false,
                },
            });

            const context = createLoaderContext();
            context.set(i18nextContext, {
                getLocale: () => 'en',
                getI18nextInstance: () => testInstance,
            });

            const result = loader({
                context,
                request: new Request('http://localhost'),
                params: {},
                unstable_pattern: '/',
            }) as any;

            expect(result.pageDesignerMode).toBeUndefined();
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
