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
import { createRoutesStub, RouterContextProvider } from 'react-router';
import type { PublicSessionData } from '@/lib/api/types';
import type AppComponent from './root';
import type { ErrorBoundary as RootErrorBoundary, Layout as RootLayout, loader as RootLoader } from './root';

let App: typeof AppComponent;
let ErrorBoundary: typeof RootErrorBoundary;
let Layout: typeof RootLayout;
let loader: typeof RootLoader;
let meta: Awaited<typeof import('./root')>['meta'];
const defaultClientAuth: PublicSessionData = {
    customerId: 'test-customer',
    userType: 'registered',
};
import { mockConfig, mockBuildConfig } from '@/test-utils/config';

const mockSite = {
    ...mockBuildConfig.app.commerce.sites[0],
    alias: mockBuildConfig.app.siteAliasMap?.RefArchGlobal ?? undefined,
};

vi.mock('@/lib/i18next.client', async () => {
    const i18next = await import('i18next');
    const { initReactI18next } = await import('react-i18next');

    // Create a test i18n instance that mimics the client-side setup
    // (no resources pre-loaded, uses backend to fetch translations)
    const testInstance = i18next.default.createInstance();

    // Mock the backend to return test translations
    const mockBackend = {
        type: 'backend' as const,
        init: vi.fn(),
        read: vi.fn((_language: string, namespace: string, callback: (error: any, data: any) => void) => {
            // Return test translations for error namespace
            if (namespace === 'error') {
                callback(null, {
                    defaultTitle: 'Something went wrong',
                    goToHomepage: 'Go to Homepage',
                    allRightsReserved: 'All rights reserved.',
                    '404': {
                        title: 'Page not found',
                        message:
                            "We couldn't find the page you're looking for. It may have been moved or the link might be incorrect.",
                        secondaryMessage: "Don't worry—you can still explore our collection or head back home.",
                        details: 'The requested page could not be found.',
                    },
                    '403': {
                        title: 'Access restricted',
                        message:
                            "You don't have permission to view this page. If you believe this is an error, please contact our support team.",
                        secondaryMessage: 'In the meantime, feel free to browse our collection.',
                    },
                    '500': {
                        title: 'Something went wrong',
                        message:
                            "We're sorry, but something unexpected happened on our end. Our team has been notified and is working to fix it.",
                        secondaryMessage:
                            'Please try again in a few moments, or browse our shop while we sort things out.',
                    },
                });
            } else {
                // Return empty translations for other namespaces
                callback(null, {});
            }
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

// Mock font file imports (used in root.tsx links function and inline @font-face)
vi.mock('/fonts/sen-variable.woff2', () => ({
    default: '/mocked-fonts/sen-variable.woff2',
}));

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
    HYBRID_PROXY_CONFIG: { enabled: false },
}));
// @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY

vi.mock('@salesforce/storefront-next-runtime/config', async () => {
    const actual = await vi.importActual('@salesforce/storefront-next-runtime/config');
    const { ConfigContext, createAppConfig } = await import('@salesforce/storefront-next-runtime/config');

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
    meta = rootModule.meta;
});

function createLoaderContext(options: Parameters<typeof createTestContext>[0] = {}) {
    const context = createTestContext(options) as RouterContextProvider;
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

            const charset = document.head.querySelector('meta[charset="utf-8"]');
            const viewport = document.head.querySelector('meta[name="viewport"]');
            expect(charset).toBeInTheDocument();
            expect(viewport).toBeInTheDocument();
            expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1');

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

                expect(getByText('Something went wrong')).toBeInTheDocument();
                expect(getByText('Error: Test error')).toBeInTheDocument();

                const stackElement = getByText(stackText);
                expect(stackElement).toBeInTheDocument();
                expect(stackElement.closest('pre')).toBeInTheDocument();
            });

            it('should render normal error without message', () => {
                const error = new Error('');
                error.stack = stackText;

                const { getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Something went wrong')).toBeInTheDocument();

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
                expect(getByText('Page not found')).toBeInTheDocument();
                expect(getByText(/The requested page could not be found/)).toBeInTheDocument();
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

                expect(getByText('500')).toBeInTheDocument();
                expect(getByText('Something went wrong')).toBeInTheDocument();
                // 500 errors now show friendly translated message instead of statusText
                expect(getByText(/We're sorry, but something unexpected happened on our end/)).toBeInTheDocument();
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
                error.stack = undefined;
                const { getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Something went wrong')).toBeInTheDocument();
                expect(getByText('Error: Test error')).toBeInTheDocument();
            });

            it('should render normal error without message', () => {
                const error = new Error('');
                const { getByText } = render(<ErrorBoundary error={error} />);

                expect(getByText('Something went wrong')).toBeInTheDocument();
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
                expect(getByText('Page not found')).toBeInTheDocument();
                expect(getByText(/The requested page could not be found/)).toBeInTheDocument();
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

                expect(getByText('500')).toBeInTheDocument();
                expect(getByText('Something went wrong')).toBeInTheDocument();
                // 500 errors now show friendly translated message instead of statusText
                expect(getByText(/We're sorry, but something unexpected happened on our end/)).toBeInTheDocument();
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
                    loader: () => ({
                        clientAuth: {
                            customerId: 'test-customer',
                            userType: 'registered',
                        },
                        basketSnapshot: null,
                        appConfig: mockConfig,
                        locale: 'en-US',
                        currency: 'USD',
                        site: mockSite,
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
                        site: mockSite,
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
                    loader: () => ({
                        clientAuth: {
                            customerId: 'test-customer',
                            userType: 'registered',
                        },
                        basketSnapshot: null,
                        locale: 'en-US',
                        currency: 'USD',
                        site: mockSite,
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

        describe('BackNavigationRevalidator', () => {
            it('calls revalidate once when hybrid is enabled and navigation type is back_forward', async () => {
                const revalidateMock = vi.fn();
                const reactRouter = await import('react-router');
                vi.spyOn(reactRouter, 'useRevalidator').mockReturnValue({
                    state: 'idle',
                    revalidate: revalidateMock,
                } as ReturnType<typeof reactRouter.useRevalidator>);

                vi.stubGlobal('performance', {
                    getEntriesByType: (type: string) => (type === 'navigation' ? [{ type: 'back_forward' }] : []),
                } as unknown as Performance);

                const i18next = await import('i18next');
                const { initReactI18next } = await import('react-i18next');
                const testI18nInstance = i18next.default.createInstance();
                await testI18nInstance.use(initReactI18next).init({
                    lng: 'en-US',
                    fallbackLng: 'en-US',
                    resources: { 'en-US': { translation: {} } },
                });

                const appConfigWithHybrid = { ...mockConfig, hybrid: { enabled: true } };

                const Stub = createRoutesStub([
                    {
                        id: 'root',
                        path: '/',
                        Component: App,
                        loader: () => ({
                            auth: () => ({
                                access_token: 'test-token',
                                customer_id: 'test-customer',
                                userType: 'registered',
                            }),
                            basket: { basketId: 'test-basket', productItems: [] },
                            appConfig: appConfigWithHybrid,
                            locale: 'en-US',
                            currency: 'USD',
                            site: mockSite,
                            getI18next: () => testI18nInstance,
                        }),
                    },
                ]);

                render(<Stub initialEntries={['/']} />);

                await waitFor(() => {
                    expect(revalidateMock).toHaveBeenCalledTimes(1);
                });

                vi.unstubAllGlobals();
                vi.restoreAllMocks();
            });

            it('does not call revalidate when navigation type is not back_forward', async () => {
                const revalidateMock = vi.fn();
                const reactRouter = await import('react-router');
                vi.spyOn(reactRouter, 'useRevalidator').mockReturnValue({
                    state: 'idle',
                    revalidate: revalidateMock,
                } as ReturnType<typeof reactRouter.useRevalidator>);

                vi.stubGlobal('performance', {
                    getEntriesByType: (type: string) => (type === 'navigation' ? [{ type: 'navigate' }] : []),
                } as unknown as Performance);

                const i18next = await import('i18next');
                const { initReactI18next } = await import('react-i18next');
                const testI18nInstance = i18next.default.createInstance();
                await testI18nInstance.use(initReactI18next).init({
                    lng: 'en-US',
                    fallbackLng: 'en-US',
                    resources: { 'en-US': { translation: {} } },
                });

                const appConfigWithHybrid = { ...mockConfig, hybrid: { enabled: true } };

                const Stub = createRoutesStub([
                    {
                        id: 'root',
                        path: '/',
                        Component: App,
                        loader: () => ({
                            auth: () => ({
                                access_token: 'test-token',
                                customer_id: 'test-customer',
                                userType: 'registered',
                            }),
                            basket: { basketId: 'test-basket', productItems: [] },
                            appConfig: appConfigWithHybrid,
                            locale: 'en-US',
                            currency: 'USD',
                            site: mockSite,
                            getI18next: () => testI18nInstance,
                        }),
                    },
                ]);

                const { getByTestId } = render(<Stub initialEntries={['/']} />);

                await waitFor(() => {
                    expect(getByTestId('page-designer-provider')).toBeInTheDocument();
                });

                expect(revalidateMock).not.toHaveBeenCalled();

                vi.unstubAllGlobals();
                vi.restoreAllMocks();
            });

            it('does not call revalidate when hybrid is disabled', async () => {
                const revalidateMock = vi.fn();
                const reactRouter = await import('react-router');
                vi.spyOn(reactRouter, 'useRevalidator').mockReturnValue({
                    state: 'idle',
                    revalidate: revalidateMock,
                } as ReturnType<typeof reactRouter.useRevalidator>);

                vi.stubGlobal('performance', {
                    getEntriesByType: (type: string) => (type === 'navigation' ? [{ type: 'back_forward' }] : []),
                } as unknown as Performance);

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
                        loader: () => ({
                            auth: () => ({
                                access_token: 'test-token',
                                customer_id: 'test-customer',
                                userType: 'registered',
                            }),
                            basket: { basketId: 'test-basket', productItems: [] },
                            appConfig: mockConfig,
                            locale: 'en-US',
                            currency: 'USD',
                            site: mockSite,
                            getI18next: () => testI18nInstance,
                        }),
                    },
                ]);

                const { getByTestId } = render(<Stub initialEntries={['/']} />);

                await waitFor(() => {
                    expect(getByTestId('page-designer-provider')).toBeInTheDocument();
                });

                expect(revalidateMock).not.toHaveBeenCalled();

                vi.unstubAllGlobals();
                vi.restoreAllMocks();
            });
        });
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
            expect(result.locale).toEqual({ id: 'en-GB', preferredCurrency: 'GBP' });
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
            expect(result.locale).toEqual({ id: 'en-GB', preferredCurrency: 'GBP' });
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

    describe('meta function', () => {
        function buildMetaArgs(loaderData: any) {
            return {
                data: loaderData,
                loaderData,
                location: { pathname: '/', search: '', hash: '', state: null, key: 'default' },
                matches: [] as any,
                params: {},
            } as Parameters<typeof meta>[0];
        }

        it('returns seoMeta from loaderData when present', () => {
            const seoMeta = [{ tagName: 'link', rel: 'canonical', href: 'https://example.com/' }];
            const result = meta(buildMetaArgs({ seoMeta }));
            expect(result).toEqual(seoMeta);
        });

        it('returns empty array when loaderData is undefined', () => {
            const result = meta(buildMetaArgs(undefined));
            expect(result).toEqual([]);
        });

        it('returns empty array when seoMeta is not in loaderData', () => {
            const result = meta(buildMetaArgs({}));
            expect(result).toEqual([]);
        });
    });
});
