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
import { type PropsWithChildren, useMemo } from 'react';

// React Router
import {
    type DataStrategyResult,
    isRouteErrorResponse,
    Links,
    type LinksFunction,
    type LoaderFunctionArgs,
    Meta,
    type MiddlewareFunction,
    Navigate,
    Outlet,
    Scripts,
    ScrollRestoration,
    /** @sfdc-extension-line SFDC_EXT_HYBRID_PROXY */
    useLocation,
    useMatches,
    useRouteLoaderData,
} from 'react-router';

// Third-party libraries
import { type i18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { PageDesignerProvider } from '@salesforce/storefront-next-runtime/design/react/core';
import { isDesignModeActive, isPreviewModeActive } from '@salesforce/storefront-next-runtime/design/mode';

// Middlewares
import authMiddlewareServer, { getAuth as getAuthServer } from '@/middlewares/auth.server';
import authMiddlewareClient from '@/middlewares/auth.client';
import { getPublicSessionData } from '@/middlewares/auth.utils';
import createBasketMiddleware, { basketResourceContext, type BasketSnapshot } from '@/middlewares/basket.server';
import shopperContextMiddlewareServer from '@/middlewares/shopper-context.server';
import shopperContextMiddlewareClient from '@/middlewares/shopper-context.client';
import legacyRoutesMiddlewareClient from '@/middlewares/legacy-routes.client';
import {
    performanceMetricsMiddlewareClient,
    performanceMetricsMiddlewareServer,
} from '@/middlewares/performance-metrics';
import { appConfigMiddlewareServer } from '@/middlewares/app-config.server';
import { appConfigMiddlewareClient } from '@/middlewares/app-config.client';
import { i18nextMiddleware } from '@/middlewares/i18next.server';
import { currencyMiddleware } from '@/middlewares/currency.server';
import { currencyClientMiddleware } from '@/middlewares/currency.client';
import { correlationMiddleware } from '@/middlewares/correlation.server';
import { modeDetectionMiddlewareServer, modeDetectionMiddlewareClient } from '@/middlewares/mode-detection';
import { maintenanceMiddleware } from '@/middlewares/maintenance.server';

// Providers
import AuthProvider from '@/providers/auth';
import BasketProvider from '@/providers/basket';
import { ComposeProviders } from '@/providers/compose-providers';
import { type AppConfig, ConfigProvider, getConfig } from '@/config';
import { CurrencyProvider } from '@/providers/currency';
import { CorrelationProvider } from '@/providers/correlation';
import { correlationContext } from '@/lib/correlation';
import RecommendersProvider from '@/providers/recommenders';

// Components
import { ToasterTheme } from '@/components/toast';
import { TrackingConsentBanner } from '@/components/tracking-consent-banner';

// Hooks
import { useExecutePendingAction } from '@/hooks/use-execute-pending-action';

// Lib/Utils
import type { PublicSessionData } from '@/lib/api/types';
import { i18nextContext } from '@/lib/i18next';
import { initI18next } from '@/lib/i18next.client';
import { PageViewTracker } from '@/lib/analytics/page-view-tracker';
import { initializeRegistry } from '@/lib/static-registry';
import { currencyContext } from '@/lib/currency';

// Adapters
import { EINSTEIN_ADAPTER_NAME } from '@/adapters/einstein';

// Assets
import favicon from '/favicon.ico';

// Styles
import { PageDesignerInit } from '@/page-designer-init';
import appStylesHref from './app.css?url';

// Extensions
/** @sfdc-extension-line SFDC_EXT_HYBRID_PROXY */
import { HybridProxyNavigationInterceptor } from '@/extensions/hybrid-proxy/navigation-interceptor';
/** @sfdc-extension-line SFDC_EXT_HYBRID_PROXY */
import { isProxyPath } from '@/extensions/hybrid-proxy/config';
import { TargetProviders } from '@/targets/target-providers';
import { MAINTENANCE_ERROR } from './lib/api-clients';
import { type Maintenance, maintenanceContext } from '@/lib/maintenance';

// eslint-disable-next-line react-refresh/only-export-components
export const links: LinksFunction = () => [
    { rel: 'preload', href: appStylesHref, as: 'style' },
    { rel: 'stylesheet', href: appStylesHref },
];

// eslint-disable-next-line react-refresh/only-export-components
export const middleware: MiddlewareFunction<Response>[] = [
    correlationMiddleware,
    modeDetectionMiddlewareServer,
    appConfigMiddlewareServer,
    i18nextMiddleware,
    currencyMiddleware, // Read currency cookie early
    performanceMetricsMiddlewareServer,
    maintenanceMiddleware,
    authMiddlewareServer,
    createBasketMiddleware(),
    shopperContextMiddlewareServer,
];

// eslint-disable-next-line react-refresh/only-export-components
export const clientMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>>[] = [
    // Client middleware functions have varying return types, but React Router expects Record<string, DataStrategyResult>
    // We cast through unknown to avoid type errors while maintaining runtime correctness
    appConfigMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Must run first to set config in context
    modeDetectionMiddlewareClient,
    legacyRoutesMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Checks hybrid.enabled, needs config from context
    performanceMetricsMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
    currencyClientMiddleware as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Read currency from cookie
    authMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
    shopperContextMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
];

// On the client side, initialize i18next.
// (On the server side, it's initialized elsewhere in middlewares/i18next.ts file)
// Read the language from the server-rendered HTML to avoid language detection issues
const i18nextOnClient =
    typeof window !== 'undefined' ? initI18next({ language: document.documentElement.lang || undefined }) : undefined;

// eslint-disable-next-line react-refresh/only-export-components
export const loader = ({
    context,
    request,
}: LoaderFunctionArgs): {
    // Public auth data - only non-sensitive fields, safe to serialize
    clientAuth: PublicSessionData;
    appConfig: AppConfig;
    basketSnapshot: BasketSnapshot | null;
    maintenance: Maintenance;
    locale: string;
    currency: string;
    correlationId: string;
    pageDesignerMode: 'EDIT' | 'PREVIEW' | undefined;
    // Return as function to prevent i18next instance serialization
    getI18next: () => i18n;
} => {
    const session = getAuthServer(context);

    const appConfig = getConfig(context);

    // Get i18next accessor functions from context (stored by middleware)
    const i18nextData = context.get(i18nextContext);
    if (!i18nextData) {
        throw new Error('i18next data not found in context. Ensure i18next middleware runs before loaders.');
    }

    // Call the bound functions to get locale and i18next instance
    const locale = i18nextData.getLocale();
    // On the server side, our middleware stores the translations in this i18next object
    // so we'll need to be careful not to accidentally serialize this object (to avoid bloating the html).
    const i18next = i18nextData.getI18nextInstance();

    // Currency is already resolved by middleware
    const currency = context.get(currencyContext) as string;

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

    return {
        appConfig,
        basketSnapshot,
        locale,
        currency,
        correlationId,
        maintenance,
        clientAuth,
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
    const i18next = (typeof window === 'undefined' ? data?.getI18next?.() : i18nextOnClient) as i18n;

    return (
        <html lang={i18next.language} dir={i18next.dir(i18next.language)}>
            <head>
                <meta charSet="utf-8" />
                {appConfig?.links?.preconnect?.map((origin: string) => (
                    <link key={origin} rel="preconnect" href={origin} />
                ))}
                {appConfig?.links?.prefetchDns?.map((origin: string) => (
                    <link key={origin} rel="dns-prefetch" href={origin} />
                ))}
                {appConfig?.links?.prefetch?.map((href: string) => (
                    <link key={href} rel="prefetch" href={href} />
                ))}
                <script
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                        __html: `
                        ${appConfigScript}
                    `,
                    }}
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Welcome to our web store for high performers!" />
                <link rel="icon" type="image/x-icon" href={favicon} />
                <title>NextGen PWA Kit Store</title>
                <Meta />
                <Links />
            </head>
            <body className="antialiased flex flex-col min-h-screen">
                {children}
                <ToasterTheme />
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export function ErrorBoundary({ error }: { error: unknown }) {
    // Handle maintenance mode errors
    // Error is serialized when crossing server->client boundary, so we check the string representation
    if (error && error.toString().indexOf(MAINTENANCE_ERROR) >= 0) {
        // Use React Router Navigate for smooth client-side navigation
        return <Navigate to="/maintenance" replace />;
    }

    let message = 'Oops!';
    let details: string | undefined;
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? '404' : 'Error';
        details = error.status === 404 ? 'The requested page could not be found.' : error.statusText;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details || 'An unexpected error occurred.'}</p>
            {stack && (
                <pre className="w-full p-4 overflow-x-auto">
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    );
}

export default function App({
    loaderData: { clientAuth, basketSnapshot, getI18next, currency, correlationId, pageDesignerMode },
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

    // Memoize the providers array to prevent unnecessary remounting of providers on render
    const providers = useMemo(
        () =>
            [
                [I18nextProvider, { i18n: i18next }],
                [ConfigProvider, { config: appConfig }],
                [CurrencyProvider, { value: currency }],
                [AuthProvider, { value: clientAuth }],
                [BasketProvider, { snapshot: basketSnapshot }],
                [RecommendersProvider, { adapterName: EINSTEIN_ADAPTER_NAME }],
                [CorrelationProvider, { value: correlationId }],
            ] as const,
        [correlationId, i18next, appConfig, currency, clientAuth, basketSnapshot]
    );

    let content = (
        <>
            <AuthActionExecutor />
            <PageDesignerProvider clientId="odyssey" targetOrigin="*" usid={clientAuth?.usid} mode={pageDesignerMode}>
                <PageDesignerInit />
                <Outlet />
            </PageDesignerProvider>
            <TrackingConsentBanner />
            {/* Track page views asynchronously */}
            {typeof window !== 'undefined' && <PageViewTracker />}
        </>
    );

    // @sfdc-extension-block-start SFDC_EXT_HYBRID_PROXY
    const location = useLocation();
    if (typeof window !== 'undefined' && isProxyPath(location.pathname)) {
        content = <HybridProxyNavigationInterceptor />;
    }
    // @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY

    return (
        <ComposeProviders providers={providers}>
            <TargetProviders>{content}</TargetProviders>
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
