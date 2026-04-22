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
import { type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

// React Router
import {
    type DataStrategyResult,
    isRouteErrorResponse,
    Links,
    type LinksFunction,
    type LoaderFunctionArgs,
    Meta,
    type MetaDescriptor,
    type MetaFunction,
    type MiddlewareFunction,
    Navigate,
    Outlet,
    Scripts,
    ScrollRestoration,
    useMatches,
    useRevalidator,
    useRouteLoaderData,
} from 'react-router';

// Third-party libraries
import { createInstance, type i18n } from 'i18next';
import { I18nextProvider, useTranslation, initReactI18next } from 'react-i18next';
import resources from '@/locales'; // Server-side translations
import { PageDesignerProvider } from '@salesforce/storefront-next-runtime/design/react/core';
import { isDesignModeActive, isPreviewModeActive } from '@salesforce/storefront-next-runtime/design/mode';
import {
    customGlobalPreferencesMiddleware,
    customSitePreferencesMiddleware,
} from '@salesforce/storefront-next-runtime/data-store';
import { SiteProvider, siteContext, type Site, type Locale } from '@salesforce/storefront-next-runtime/site-context';

// Middlewares
import authMiddlewareServer, { getAuth as getAuthServer } from '@/middlewares/auth.server';
import { getPublicSessionData } from '@/middlewares/auth.utils';
import createBasketMiddleware, { basketResourceContext, type BasketSnapshot } from '@/middlewares/basket.server';
import shopperContextMiddlewareServer from '@/middlewares/shopper-context.server';
import legacyRoutesMiddlewareClient from '@/middlewares/legacy-routes.client';
import {
    performanceMetricsMiddlewareClient,
    performanceMetricsMiddlewareServer,
} from '@/middlewares/performance-metrics';
import { appConfigMiddlewareServer } from '@/middlewares/app-config.server';
import { appConfigMiddlewareClient } from '@/middlewares/app-config.client';
import { ConfigProvider, getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { siteContextMiddleware } from '@/middlewares/site-context.server';
import { i18nextMiddleware } from '@/middlewares/i18next.server';
// @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
import {
    selectedStoreMiddleware,
    selectedStoreContext,
} from '@/extensions/store-locator/middlewares/selected-store.server';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
// @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR
import { correlationMiddleware } from '@/middlewares/correlation.server';
import { loggingMiddleware } from '@/middlewares/logging.server';
import { modeDetectionMiddlewareServer, modeDetectionMiddlewareClient } from '@/middlewares/mode-detection';
import { maintenanceMiddleware } from '@/middlewares/maintenance.server';

// Providers
import AuthProvider from '@/providers/auth';
import BasketProvider from '@/providers/basket';
import { ComposeProviders } from '@/providers/compose-providers';
import { CorrelationProvider } from '@/providers/correlation';
import { correlationContext } from '@/lib/correlation';
import RecommendersProvider from '@/providers/recommenders';

// Components
import { ToasterTheme } from '@/components/toast';
import { TrackingConsentBanner } from '@/components/tracking-consent-banner';
import ShopperAgent from '@/components/shopper-agent';

// Hooks
import { useExecutePendingAction } from '@/hooks/use-execute-pending-action';

// Lib/Utils
import type { PublicSessionData } from '@/lib/api/types';
import { i18nextContext } from '@/lib/i18next';
import { initI18next } from '@/lib/i18next.client';
import { PageViewTracker } from '@/lib/analytics/page-view-tracker';
import { initializeRegistry } from '@/lib/static-registry';
import { buildSeoMetaDescriptors } from '@/utils/seo';

// Adapters
import { EINSTEIN_ADAPTER_NAME } from '@/adapters/einstein';

// Assets
import favicon from '/favicon.ico';

// Fonts
import sen from '/fonts/sen-variable.woff2';

// Styles
import { PageDesignerInit } from '@/page-designer-init';
import appStylesHref from './theme/index.css?url';

// Extensions
import { UITargetProviders } from '@/targets/ui-target-providers';
// @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
import StoreLocatorProvider from '@/extensions/store-locator/providers/store-locator';
// @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR
import { type Maintenance, maintenanceContext } from '@/lib/maintenance';

// Layout Components - logo for error page
import logo from '/images/logo.svg';

export const links: LinksFunction = () => {
    return [
        // Preload critical fonts
        { rel: 'preload', href: sen, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
        { rel: 'preload', href: appStylesHref, as: 'style' },
        { rel: 'stylesheet', href: appStylesHref },
    ];
};

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
    return loaderData?.seoMeta ?? [];
};

export const middleware: MiddlewareFunction<Response>[] = [
    correlationMiddleware,
    loggingMiddleware,
    modeDetectionMiddlewareServer,
    appConfigMiddlewareServer,
    siteContextMiddleware, // Must run after appConfig, before i18next and currency
    customSitePreferencesMiddleware,
    customGlobalPreferencesMiddleware,
    i18nextMiddleware,
    selectedStoreMiddleware /** @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */,
    performanceMetricsMiddlewareServer,
    maintenanceMiddleware,
    authMiddlewareServer,
    createBasketMiddleware(),
    shopperContextMiddlewareServer,
];

export const clientMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>>[] = [
    // Client middleware functions have varying return types, but React Router expects Record<string, DataStrategyResult>
    // We cast through unknown to avoid type errors while maintaining runtime correctness
    appConfigMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Must run first to set config in context
    modeDetectionMiddlewareClient,
    legacyRoutesMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Checks hybrid.enabled, needs config from context
    performanceMetricsMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
];

// On the client side, initialize i18next.
// (On the server side, it's initialized elsewhere in middlewares/i18next.ts file)
// Read the language from the server-rendered HTML to avoid language detection issues
const i18nextOnClient =
    typeof window !== 'undefined' ? initI18next({ language: document.documentElement.lang || undefined }) : undefined;

export const loader = ({
    context,
    request,
}: LoaderFunctionArgs): {
    // Public auth data - only non-sensitive fields, safe to serialize
    clientAuth: PublicSessionData;
    appConfig: AppConfig;
    basketSnapshot: BasketSnapshot | null;
    maintenance: Maintenance;
    locale: Locale;
    site: Site;
    currency: string;
    selectedStoreInfo: SelectedStoreInfo | null /** @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */;
    correlationId: string;
    pageDesignerMode: 'EDIT' | 'PREVIEW' | undefined;
    // Pre-computed in the loader (server-only) so seo.ts stays out of the client bundle
    seoMeta: MetaDescriptor[];
    // Return as function to prevent i18next instance serialization
    getI18next: () => i18n;
} => {
    const session = getAuthServer(context);

    const appConfig = getConfig<AppConfig>(context);

    // Get i18next accessor functions from context (stored by middleware)
    const i18nextData = context.get(i18nextContext);
    if (!i18nextData) {
        throw new Error('i18next data not found in context. Ensure i18next middleware runs before loaders.');
    }

    // Call the bound functions to get locale and i18next instance

    // On the server side, our middleware stores the translations in this i18next object
    // so we'll need to be careful not to accidentally serialize this object (to avoid bloating the html).
    const i18next = i18nextData.getI18nextInstance();

    // @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
    const selectedStoreInfo = context.get(selectedStoreContext) ?? null;
    // @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR

    // Get resolved site, locale, and currency from site context middleware
    const siteCtx = context.get(siteContext);
    if (!siteCtx) {
        throw new Error('Site context not found. Ensure siteContextMiddleware runs before loaders.');
    }
    const { locale, site, currency } = siteCtx;

    // Load the application basket provider with the basket snapshot. We are actively not loading the basket, as
    // we want to lazy load the basket when the basket is needed. This prevents low-engagement users from causing
    // unnecessary resource usage in the form of basket creations.
    const basketSnapshot = context.get(basketResourceContext)?.snapshot ?? null;

    // Get correlation ID from middleware for request tracing
    const correlationId = context.get(correlationContext);

    // Get maintenance data from middleware
    const maintenance = context.get(maintenanceContext);

    // Extract only non-sensitive fields for client - tokens stay server-side only
    const clientAuth = getPublicSessionData(session);

    const requestUrl = new URL(request.url);

    const seoMeta = buildSeoMetaDescriptors({
        site,
        appConfig,
        origin: requestUrl.origin,
        locale,
        location: { pathname: requestUrl.pathname, search: requestUrl.search },
    });

    return {
        appConfig,
        basketSnapshot,
        locale,
        site,
        currency,
        selectedStoreInfo /** @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */,
        correlationId,
        maintenance,
        clientAuth,
        seoMeta,
        getI18next: () => i18next,
        pageDesignerMode: isDesignModeActive(request) ? 'EDIT' : isPreviewModeActive(request) ? 'PREVIEW' : undefined,
    };
};

// This creates a union type where properties unique to either loader are optional
// Properties present in both loaders remain required
type ServerLoaderData = ReturnType<typeof loader>;
type LoaderData = ServerLoaderData;

export function Layout({ children }: PropsWithChildren) {
    const matches = useMatches();
    const rootMatch = matches.find((m) => m.id === 'root');
    const appConfig = (rootMatch?.data as { appConfig?: AppConfig })?.appConfig;
    const appConfigScript = appConfig ? `window.__APP_CONFIG__ = ${JSON.stringify(appConfig)};` : '';

    const data = useRouteLoaderData<LoaderData>('root');
    const i18next = typeof window === 'undefined' ? data?.getI18next?.() : i18nextOnClient;
    const lang = i18next?.language ?? 'en';
    const dir = i18next?.dir(lang) ?? 'ltr';

    return (
        <html lang={lang} dir={dir}>
            <head>
                <meta charSet="utf-8" />
                <link rel="icon" type="image/x-icon" href={favicon} />
                {appConfig?.links?.preconnect?.map((origin: string) => (
                    <link key={origin} rel="preconnect" href={origin} />
                ))}
                {appConfig?.links?.prefetchDns?.map((origin: string) => (
                    <link key={origin} rel="dns-prefetch" href={origin} />
                ))}
                {appConfig?.links?.prefetch?.map((href: string) => (
                    <link key={href} rel="prefetch" href={href} />
                ))}
                <style
                    dangerouslySetInnerHTML={{
                        __html: `@font-face{font-family:'Sen';src:url(${sen}) format('woff2');font-weight:400 800;font-style:normal;font-display:swap}`,
                    }}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                        ${appConfigScript}
                    `,
                    }}
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links />
            </head>
            <body className="antialiased flex flex-col min-h-screen">
                {children}
                <ToasterTheme />
                <ScrollRestoration />
                <Scripts />
                {/* Dev-only overlay: mounts outside the React tree to avoid interfering with app state/context. Zero production overhead — tree-shaken by Vite when PROD=true. */}
                <UITargetDevModeInit />
            </body>
        </html>
    );
}

/**
 * Error page content component with i18n support
 */
function ErrorPageContent({
    status,
    details,
    stack,
}: {
    status: number | undefined;
    details: string | undefined;
    stack: string | undefined;
}) {
    const { t } = useTranslation('error');

    return (
        <>
            {/* Simple Header */}
            <header className="bg-header-background text-header-foreground border-b border-border sticky top-0 z-50">
                <div className="px-4 lg:px-9">
                    <div className="flex items-center gap-x-4 lg:gap-x-6 h-16">
                        <a href="/" className="flex-shrink-0 flex items-center">
                            <img
                                src={logo}
                                alt="Logo"
                                className="h-3 lg:h-4 w-auto [filter:var(--header-logo-filter)]"
                            />
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="grow pt-8">
                <div className="flex items-center justify-center min-h-[60vh] px-4 py-12">
                    <div className="mx-auto max-w-3xl w-full text-center">
                        {/* Large status code */}
                        {status && <div className="text-error-status font-bold leading-none mb-8">{status}</div>}

                        {/* Error content - conditional based on status */}
                        {status === 404 ? (
                            <>
                                <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('404.title')}</h1>
                                <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
                                    {t('404.message')}
                                </p>
                                <p className="text-base text-muted-foreground mb-4 max-w-2xl mx-auto">
                                    {t('404.secondaryMessage')}
                                </p>
                                <p className="text-sm text-muted-foreground mb-12 max-w-2xl mx-auto opacity-50">
                                    {t('404.details')}
                                </p>
                            </>
                        ) : status === 403 ? (
                            <>
                                <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('403.title')}</h1>
                                <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
                                    {t('403.message')}
                                </p>
                                <p className="text-base text-muted-foreground mb-12 max-w-2xl mx-auto">
                                    {t('403.secondaryMessage')}
                                </p>
                            </>
                        ) : status === 500 ? (
                            <>
                                <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('500.title')}</h1>
                                <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
                                    {t('500.message')}
                                </p>
                                <p className="text-base text-muted-foreground mb-12 max-w-2xl mx-auto">
                                    {t('500.secondaryMessage')}
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('defaultTitle')}</h1>
                                {/* For other errors: show technical details */}
                                {details && (
                                    <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                                        Error: {details}
                                    </p>
                                )}
                            </>
                        )}

                        {/* Back to home button */}
                        <div>
                            <a
                                href="/"
                                className="inline-block rounded-none bg-primary px-12 py-3 text-base font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary/90">
                                {t('goToHomepage')}
                            </a>
                        </div>

                        {/* Stack trace (only in dev mode with stack) */}
                        {stack && (
                            <div className="mt-16 border border-border rounded-lg bg-muted/30 text-left">
                                <div className="flex items-center px-4 py-3 border-b border-border">
                                    <h2 className="text-sm font-semibold text-foreground">Stack Trace</h2>
                                </div>
                                <pre className="p-4 overflow-auto max-h-80 text-xs leading-relaxed text-foreground/90 font-mono">
                                    <code>{stack}</code>
                                </pre>
                                <div className="px-4 py-3 border-t border-border">
                                    <p className="text-xs text-muted-foreground">
                                        To disable stack traces in production, turn off{' '}
                                        <code className="text-xs">unstable_devTools</code> in your router config.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="mt-auto bg-background border-t border-border">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    <p className="text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} {t('allRightsReserved')}
                    </p>
                </div>
            </footer>
        </>
    );
}

export function ErrorBoundary({ error }: { error: unknown }) {
    // Handle maintenance mode errors
    // Error is serialized when crossing server->client boundary, so we check the string representation
    if (error && error.toString().indexOf('MAINTENANCE_ERROR') >= 0) {
        // Use React Router Navigate for smooth client-side navigation
        return <Navigate to="/maintenance" replace />;
    }

    // For all other errors, render error page with app layout
    let status: number | undefined;
    let details: string | undefined;
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        status = error.status;
        details = error.statusText;
    } else if (error instanceof Error) {
        details = error.message;
        stack = error.stack;
    } else if (typeof error === 'string') {
        details = error;
    }

    // Always create a new i18next instance with pre-loaded translations for the ErrorBoundary
    // This ensures translations are immediately available without async loading
    const language =
        typeof window !== 'undefined' && i18nextOnClient
            ? i18nextOnClient.language || 'en-US'
            : typeof document !== 'undefined'
              ? document.documentElement.lang || 'en-US'
              : 'en-US';

    const i18nextInstance = createInstance();
    // Initialize synchronously with pre-loaded resources
    void i18nextInstance.use(initReactI18next).init({
        lng: language,
        fallbackLng: 'en-US',
        resources,
        interpolation: {
            escapeValue: false,
        },
        initImmediate: true, // Ensures synchronous initialization with pre-loaded resources
    });

    return (
        <I18nextProvider i18n={i18nextInstance}>
            <ErrorPageContent status={status} details={details} stack={stack} />
        </I18nextProvider>
    );
}

export default function App({
    loaderData: {
        clientAuth,
        basketSnapshot,
        getI18next,
        currency,
        correlationId,
        pageDesignerMode,
        site,
        locale,
        // @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
        selectedStoreInfo,
        // @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR
    },
}: {
    loaderData: LoaderData;
}) {
    // Currency is always provided by loader (which reads from middleware)
    if (!currency) {
        throw new Error('Currency is required but not provided by loader');
    }

    // Get app configuration from server loader data (initial load) or window.__APP_CONFIG__ (client nav)
    // This ensures config is read from MRT environment variables (via middleware), not baked at build time
    const serverData = useRouteLoaderData('root');
    const appConfig = serverData?.appConfig || (typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined);
    if (!appConfig) {
        throw new Error('App configuration not available - check server loader and window.__APP_CONFIG__');
    }

    // In server-only auth architecture:
    // - clientAuth contains only non-sensitive fields (userType, customerId, usid, etc.)
    // - These values are serialized directly from the server loader
    // - No client middleware or bootstrap needed - server is the single source of truth
    // - Tokens (accessToken, refreshToken) stay server-side only

    // Initialize Page Designer components
    initializeRegistry();

    const i18next = (typeof window === 'undefined' ? getI18next?.() : i18nextOnClient) as i18n;

    const sites = appConfig.commerce.sites as AppConfig['commerce']['sites'];
    const defaultSite = sites.find((s) => s.id === appConfig.defaultSiteId) ?? sites[0];
    const shopperAgentLocale = i18next?.language ?? defaultSite?.defaultLocale ?? appConfig.i18n.fallbackLng;

    // Memoize the providers array to prevent unnecessary remounting of providers on render
    const providers = useMemo(
        () =>
            [
                [I18nextProvider, { i18n: i18next }],
                [ConfigProvider, { config: appConfig }],
                // Site provider will contain info about site/locale/currency on single request.
                // include i18next.language since these infos tend to go together.
                // site will drive the language/locale and currency
                [SiteProvider, { site, locale, language: i18next.language, currency }],
                [AuthProvider, { value: clientAuth }],
                [BasketProvider, { snapshot: basketSnapshot }],
                [RecommendersProvider, { adapterName: EINSTEIN_ADAPTER_NAME }],
                [CorrelationProvider, { value: correlationId }],
                // @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
                [StoreLocatorProvider, { selectedStoreInfo }],
                // @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR
            ] as const,
        [
            correlationId,
            i18next,
            appConfig,
            currency,
            clientAuth,
            basketSnapshot,
            site,
            locale,
            // @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
            selectedStoreInfo,
            // @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR
        ]
    );

    const hybridEnabled = Boolean(appConfig?.hybrid?.enabled);

    return (
        <ComposeProviders providers={providers}>
            <UITargetProviders>
                <AuthActionExecutor />
                {hybridEnabled && <BackNavigationRevalidator />}
                <PageDesignerProvider
                    clientId="storefront-next"
                    targetOrigin="*"
                    usid={clientAuth?.usid}
                    mode={pageDesignerMode}>
                    <PageDesignerInit />
                    <Outlet />
                </PageDesignerProvider>
                <TrackingConsentBanner />
                {typeof window !== 'undefined' && <PageViewTracker />}
            </UITargetProviders>
            {(appConfig.commerceAgent?.enabled === 'true' || appConfig.commerceAgent?.enabled === true) && (
                <ShopperAgent
                    commerceAgentConfiguration={appConfig.commerceAgent}
                    locale={shopperAgentLocale}
                    currency={currency}
                    userId={clientAuth?.customerId}
                />
            )}
        </ComposeProviders>
    );
}

/**
 * Component that executes pending actions after authentication
 * This runs on every route to check if there are actions queued from auth interception
 */
function AuthActionExecutor() {
    useExecutePendingAction();
    return null;
}

/**
 * Revalidates loader data once on back/forward (e.g. back from SFRA). Mounted only when
 * hybrid is enabled; ensures UI is fresh after a full-page redirect. No-op when hybrid is off.
 */
function BackNavigationRevalidator() {
    const revalidator = useRevalidator();
    const didRevalidateRef = useRef(false);
    useEffect(() => {
        if (didRevalidateRef.current) return;
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (nav?.type === 'back_forward' && revalidator.state === 'idle') {
            didRevalidateRef.current = true;
            void revalidator.revalidate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
}

/**
 * Initialize UITarget dev mode overlay (DEV ONLY - zero production overhead)
 * Lazy-loads the overlay when VITE_UI_TARGET_DEV_MODE=true
 */
function UITargetDevModeInit() {
    useEffect(() => {
        // Only runs in browser
        if (typeof window === 'undefined') return;

        // Only in development
        if (import.meta.env.PROD) return;

        // Only if enabled
        if (import.meta.env.VITE_UI_TARGET_DEV_MODE !== 'true') return;

        // Lazy load the overlay
        void import('@/lib/ui-target-dev-mode').then(({ initUITargetDevMode }) => {
            void initUITargetDevMode();
        });
    }, []);

    return null;
}
