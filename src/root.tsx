// React
import { type PropsWithChildren, Suspense, useMemo, useRef } from 'react';

// Assets
import favicon from '/favicon.ico';

// React Router
import {
    type ClientLoaderFunctionArgs,
    type DataStrategyResult,
    isRouteErrorResponse,
    Links,
    type LoaderFunctionArgs,
    Meta,
    type MiddlewareFunction,
    Outlet,
    Scripts,
    ScrollRestoration,
    type UIMatch,
    useLocation,
    useMatches,
    useRouteLoaderData,
} from 'react-router';

// Third-party libraries
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { type i18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { PageDesignerProvider } from '@salesforce/storefront-next-runtime/design/react/core';
import { isDesignModeActive, isPreviewModeActive } from '@salesforce/storefront-next-runtime/design/mode';

// Middlewares
import authMiddlewareServer, { getAuth as getAuthServer } from '@/middlewares/auth.server';
import authMiddlewareClient, { getAuth as getAuthClient } from '@/middlewares/auth.client';
import basketMiddlewareClient, { getBasket } from '@/middlewares/basket.client';
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

// Providers
import AuthProvider, { bootstrapAuth } from '@/providers/auth';
import BasketProvider from '@/providers/basket';
import { ComposeProviders } from '@/providers/compose-providers';
import { ConfigProvider, getConfig, type AppConfig } from '@/config';
import { CurrencyProvider } from '@/providers/currency';
import RecommendersProvider from '@/providers/recommenders';

// Components
import Header from '@/components/header';
import CategoryNavigationMenuMega from '@/components/navigation-menu-mega';
import Footer from '@/components/footer';
import { ToasterTheme } from '@/components/toast';
import { TrackingConsentBanner } from '@/components/tracking-consent-banner';
import { PageDesignerStyles } from './page-designer-styles';

// Hooks
import { useExecutePendingAction } from '@/hooks/use-execute-pending-action';

// Lib/Utils
import type { SessionData } from '@/lib/api/types';
import { fetchCategory } from '@/lib/api/categories';
import { i18nextContext } from '@/lib/i18next';
import { initI18next } from '@/lib/i18next.client';
import { PageViewTracker } from '@/lib/analytics/page-view-tracker';
import { initializeRegistry } from '@/lib/static-registry';
import { currencyContext } from '@/lib/currency';

// Adapters
import { EINSTEIN_ADAPTER_NAME } from '@/adapters/einstein';

// Styles
import './app.css';

// Extensions
/** @sfdc-extension-line SFDC_EXT_HYBRID_PROXY */
import { HybridProxyNavigationInterceptor } from '@/extensions/hybrid-proxy/navigation-interceptor';
/** @sfdc-extension-line SFDC_EXT_HYBRID_PROXY */
import { isProxyPath } from '@/extensions/hybrid-proxy/config';
import { PluginProviders } from '@/plugins/plugin-providers';

// On the client side, initialize i18next.
// (On the server side, it's initialized elsewhere in middlewares/i18next.ts file)
// Read the language from the server-rendered HTML to avoid language detection issues
const i18nextOnClient =
    typeof window !== 'undefined' ? initI18next({ language: document.documentElement.lang || undefined }) : undefined;

// eslint-disable-next-line react-refresh/only-export-components
export const middleware: MiddlewareFunction<Response>[] = [
    appConfigMiddlewareServer,
    i18nextMiddleware,
    currencyMiddleware, // Read currency cookie early
    performanceMetricsMiddlewareServer,
    authMiddlewareServer,
    shopperContextMiddlewareServer,
];

// eslint-disable-next-line react-refresh/only-export-components
export const clientMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>>[] = [
    // Client middleware functions have varying return types, but React Router expects Record<string, DataStrategyResult>
    // We cast through unknown to avoid type errors while maintaining runtime correctness
    appConfigMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Must run first to set config in context
    legacyRoutesMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Checks hybrid.enabled, needs config from context
    performanceMetricsMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
    currencyClientMiddleware as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>, // Read currency from cookie
    authMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
    basketMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
    shopperContextMiddlewareClient as unknown as MiddlewareFunction<Record<string, DataStrategyResult>>,
];

// eslint-disable-next-line react-refresh/only-export-components
export const loader = ({
    context,
    request,
}: LoaderFunctionArgs): {
    root: Promise<ShopperProducts.schemas['Category']>;
    subs: Promise<ShopperProducts.schemas['Category'][]>;
    auth: () => SessionData; // Use a function to prevent state serialization
    appConfig: AppConfig;
    locale: string;
    currency: string;
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

    // Load the root category and its sub categories information
    const rootCategoryPromise = fetchCategory(context, 'root', 1);

    // Load each second-level sub categories tree as well, in case the resolved root-level category has any sub
    // categories. We then base this composed second-level promise on the initial root category promise to allow
    // for parallel loading and streaming of the two main promises.
    const subCategoriesPromise = rootCategoryPromise.then((rootCategory: ShopperProducts.schemas['Category']) =>
        Promise.all(
            rootCategory.categories?.reduce(
                (
                    acc: Promise<ShopperProducts.schemas['Category']>[],
                    subCategory: ShopperProducts.schemas['Category']
                ) => {
                    if (
                        typeof subCategory.onlineSubCategoriesCount === 'number' &&
                        subCategory.onlineSubCategoriesCount > 0
                    ) {
                        acc.push(fetchCategory(context, subCategory.id, 2));
                    }
                    return acc;
                },
                []
            ) ?? []
        )
    );

    return {
        root: rootCategoryPromise,
        subs: subCategoriesPromise,
        appConfig,
        locale,
        currency,
        // Wrap these returned objects with a function, to avoid React Router serialization
        auth: () => session,
        getI18next: () => i18next,
        pageDesignerMode: isDesignModeActive(request) ? 'EDIT' : isPreviewModeActive(request) ? 'PREVIEW' : undefined,
    };
};

// eslint-disable-next-line react-refresh/only-export-components
export const clientLoader = ({
    context,
}: ClientLoaderFunctionArgs): {
    auth: () => SessionData;
    basket: ShopperBasketsV2.schemas['Basket'];
    currency: string;
} => {
    const currency = context.get(currencyContext) as string;

    return {
        auth: () => getAuthClient(context),
        basket: getBasket(context),
        currency,
    };
};
clientLoader.hydrate = true as const;

// This creates a union type where properties unique to either loader are optional
// Properties present in both loaders remain required
type ServerLoaderData = ReturnType<typeof loader>;
type ClientLoaderData = Awaited<ReturnType<typeof clientLoader>>;
type LoaderData = Partial<ServerLoaderData> &
    Partial<ClientLoaderData> &
    // Properties present in both should remain required
    Pick<ServerLoaderData & ClientLoaderData, keyof ServerLoaderData & keyof ClientLoaderData>;

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
    loaderData: { root, subs, auth, basket, getI18next, pageDesignerMode, currency },
}: {
    loaderData: LoaderData;
}) {
    const i18next = (typeof window === 'undefined' ? getI18next?.() : i18nextOnClient) as i18n;
    // We're only loading the root and sub categories from the server on the very first navigation. These refs ensure
    // that the initial data/promises don't get overwritten/removed on subsequent client-side navigations.
    const refRoot = useRef<Promise<ShopperProducts.schemas['Category']> | undefined>(undefined);
    const refSubs = useRef<Promise<ShopperProducts.schemas['Category'][]> | undefined>(undefined);
    if (root && subs) {
        refRoot.current = root;
        refSubs.current = subs;
    }

    // We're using the location information to force our outlet-level `<Suspense/>` boundary to re-mount on every
    // navigation, so every time it's a new boundary without a resolved state. Because otherwise, once resolved,
    // React's default behavior would prevent the boundary from going back to pending state. To be compatible with
    // the `createPage` higher order utility component, we use the `pageKey` from the loader data if available,
    // otherwise we simply fall back to information from the current location.
    const location = useLocation();
    const match = useMatches().at(-1) as UIMatch<{ pageKey?: string }>;
    const pageKey = match?.loaderData?.pageKey ?? `${location.pathname}${location.search}${location.hash}`;

    // Get app configuration from server loader data (initial load) or window.__APP_CONFIG__ (client nav)
    // This ensures config is read from MRT environment variables (via middleware), not baked at build time
    const serverData = useRouteLoaderData('root');
    const appConfig = serverData?.appConfig || (typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined);

    let isProxy = false;
    // @sfdc-extension-block-start SFDC_EXT_HYBRID_PROXY
    if (typeof window !== 'undefined' && isProxyPath(location.pathname)) {
        isProxy = true;
    }
    // @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY

    if (!appConfig) {
        throw new Error('App configuration not available - check server loader and window.__APP_CONFIG__');
    }

    // **Important:** As intentionally we are not using a `HydrateFallback` at this root layout level, we have to deal
    // with the behavior that the initial rendering during hydration is executed **before** the `clientMiddleware` and
    // the `clientLoader` (which is annotated with `hydrate=true`) execute.
    //
    // For app config: We set it via <ConfigProvider> below to ensure it's available during the initial render cycle,
    // before the client middleware runs. This prevents timing issues when components access config during hydration.
    //
    // For auth: During initial hydration (before clientLoader runs), auth?.() returns undefined.
    // We fall back to a bootstrap auth value derived from cookies (on the client) so that hydration
    // has access to auth data. Once clientLoader runs and provides session data, that loader-based
    // value becomes the single source of truth.
    const loaderSession = auth?.();
    const sessionData = loaderSession ?? bootstrapAuth;

    // Initialize Page Designer components
    initializeRegistry();

    // Currency is always provided by loader (which reads from middleware)
    if (!currency) {
        throw new Error('Currency is required but not provided by loader');
    }
    const currentCurrency = currency;

    // Memoize the providers array to prevent unnecessary remounting of providers on render
    const providers = useMemo(
        () =>
            [
                [I18nextProvider, { i18n: i18next }],
                [ConfigProvider, { config: appConfig }],
                [CurrencyProvider, { value: currentCurrency }],
                [AuthProvider, { value: sessionData }],
                [BasketProvider, { value: basket }],
                [RecommendersProvider, { adapterName: EINSTEIN_ADAPTER_NAME }],
            ] as const,
        [i18next, appConfig, currentCurrency, sessionData, basket]
    );

    let content = (
        <>
            <AuthActionExecutor />
            <Header>
                <CategoryNavigationMenuMega resolve={refRoot.current} defer={refSubs.current} />
            </Header>
            <PageDesignerProvider clientId="odyssey" targetOrigin="*" usid={sessionData?.usid} mode={pageDesignerMode}>
                <PageDesignerStyles />
                <main className="flex-grow pt-8">
                    {/* Outlet-level `<Suspense/>` boundary to contain pending promises. */}
                    {/* This at least prevents suspended components without a suggested local `<Suspense/>` boundary from further affecting global layout sections. */}
                    <Suspense key={pageKey} fallback={null}>
                        <Outlet />
                    </Suspense>
                </main>
            </PageDesignerProvider>
            <Footer />
            <TrackingConsentBanner />
            {/* Track page views asynchronously */}
            {typeof window !== 'undefined' && <PageViewTracker />}
        </>
    );

    // @sfdc-extension-block-start SFDC_EXT_HYBRID_PROXY
    if (isProxy) {
        content = <HybridProxyNavigationInterceptor />;
    }
    // @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY

    return (
        <ComposeProviders providers={providers}>
            <PluginProviders>{content}</PluginProviders>
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
