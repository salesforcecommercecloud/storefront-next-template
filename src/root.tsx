import { type PropsWithChildren, Suspense, useRef } from 'react';
import favicon from '/favicon.ico';
import {
    type ClientLoaderFunction,
    type ClientLoaderFunctionArgs,
    type DataStrategyResult,
    isRouteErrorResponse,
    Links,
    type LoaderFunction,
    type LoaderFunctionArgs,
    Meta,
    type MiddlewareFunction,
    Outlet,
    ScrollRestoration,
    type UIMatch,
    useLocation,
    useMatches,
    useRouteLoaderData,
} from 'react-router';
import { Scripts } from '@salesforce/vite-plugin-odyssey/react-router/Scripts';
import type { ShopperBasketsTypes, ShopperProductsTypes } from 'commerce-sdk-isomorphic';
// @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
import StoreLocatorProvider from '@/extensions/store-locator/providers/store-locator';
import authMiddlewareServer, { getAuth as getAuthServer } from '@/middlewares/auth.server';
import authMiddlewareClient, { getAuth as getAuthClient } from '@/middlewares/auth.client';
import basketMiddlewareClient, { getBasket } from '@/middlewares/basket.client';
import {
    performanceMetricsMiddlewareClient,
    performanceMetricsMiddlewareServer,
} from '@/middlewares/performance-metrics';
import { appConfigMiddlewareServer } from '@/middlewares/app-config.server';
import { appConfigMiddlewareClient } from '@/middlewares/app-config.client';
import AuthProvider from '@/providers/auth';
import BasketProvider from '@/providers/basket';
import type { SessionData } from '@/lib/api/types';
import { fetchCategory } from '@/lib/api/categories';
import Header from '@/components/header';
import CategoryNavigationMenuMega from '@/components/navigation-menu-mega';
import Footer from '@/components/footer';
import { Toaster } from '@/components/toast';
import { ConfigProvider, getConfig, type AppConfig } from '@/config';
import './app.css';
import { getCookie } from '@/lib/cookies.client';

// eslint-disable-next-line react-refresh/only-export-components
export const middleware: MiddlewareFunction<Response>[] = [
    appConfigMiddlewareServer,
    performanceMetricsMiddlewareServer,
    authMiddlewareServer,
];

// eslint-disable-next-line react-refresh/only-export-components
export const clientMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>>[] = [
    appConfigMiddlewareClient, // Must run first to set config in context
    performanceMetricsMiddlewareClient,
    authMiddlewareClient,
    basketMiddlewareClient,
];

// eslint-disable-next-line react-refresh/only-export-components
export const loader: LoaderFunction = ({
    context,
}: LoaderFunctionArgs): {
    root: Promise<ShopperProductsTypes.Category>;
    subs: Promise<ShopperProductsTypes.Category[]>;
    auth: () => SessionData; // Use a function to prevent state serialization
    appConfig: AppConfig;
} => {
    const session = getAuthServer(context);

    const appConfig = getConfig(context);

    // Load the root category and its sub categories information
    const rootCategoryPromise = fetchCategory(context, 'root', 1);

    // Load each second-level sub categories tree as well, in case the resolved root-level category has any sub
    // categories. We then base this composed second-level promise on the initial root category promise to allow
    // for parallel loading and streaming of the two main promises.
    const subCategoriesPromise = rootCategoryPromise.then((rootCategory: ShopperProductsTypes.Category) =>
        Promise.all(
            rootCategory.categories?.reduce(
                (acc: Promise<ShopperProductsTypes.Category>[], subCategory: ShopperProductsTypes.Category) => {
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
        auth: () => session,
        appConfig,
    };
};

// eslint-disable-next-line react-refresh/only-export-components
export const clientLoader: ClientLoaderFunction = ({
    context,
}: ClientLoaderFunctionArgs): {
    auth: () => SessionData;
    basket: ShopperBasketsTypes.Basket;
} => ({
    auth: () => getAuthClient(context),
    basket: getBasket(context),
});
clientLoader.hydrate = true as const;

export function Layout({ children }: PropsWithChildren) {
    const matches = useMatches();
    const rootMatch = matches.find((m) => m.id === 'root');
    const appConfig = (rootMatch?.data as { appConfig?: AppConfig })?.appConfig;
    const appConfigScript = appConfig ? `window.__APP_CONFIG__ = ${JSON.stringify(appConfig)};` : '';

    return (
        <html lang="en">
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
                <Toaster richColors expand position="top-right" />
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
    loaderData: { root, subs, auth, basket },
}: {
    loaderData: {
        root?: Promise<ShopperProductsTypes.Category>;
        subs?: Promise<ShopperProductsTypes.Category[]>;
        auth: () => SessionData;
        basket?: ShopperBasketsTypes.Basket;
    };
}) {
    // We're only loading the root and sub categories from the server on the very first navigation. These refs ensure
    // that the initial data/promises don't get overwritten/removed on subsequent client-side navigations.
    const refRoot = useRef<Promise<ShopperProductsTypes.Category> | undefined>(undefined);
    const refSubs = useRef<Promise<ShopperProductsTypes.Category[]> | undefined>(undefined);
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
    // For auth/session:  Right now - For security reasons related
    // to serialized data left inside the document body - we intentionally don't serialize the session/auth data on the
    // server to pass it down to the client, but only derive it from the related session/auth cookie within the client
    // middleware. But as that client middleware hasn't executed yet during initial hydration, we unfortunately have to
    // explicitly do the session/auth extraction from the cookie here as well.
    let sessionData = auth?.();
    if (!sessionData && typeof window !== 'undefined') {
        sessionData = getCookie('__sfdc_auth');
    }

    return (
        <ConfigProvider config={appConfig}>
            <AuthProvider value={sessionData}>
                <BasketProvider value={basket}>
                    {/* @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */}
                    <StoreLocatorProvider>
                        <Header>
                            <CategoryNavigationMenuMega resolve={refRoot.current} defer={refSubs.current} />
                        </Header>
                        <main className="flex-grow pt-8">
                            {/* Outlet-level `<Suspense/>` boundary to contain pending promises. */}
                            {/* This at least prevents suspended components without a suggested local `<Suspense/>` boundary from further affecting global layout sections. */}
                            <Suspense key={pageKey} fallback={null}>
                                <Outlet />
                            </Suspense>
                        </main>
                        <Footer />
                        {/* @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */}
                    </StoreLocatorProvider>
                </BasketProvider>
            </AuthProvider>
        </ConfigProvider>
    );
}
