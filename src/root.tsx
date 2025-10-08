import { type PropsWithChildren, Suspense, useRef } from 'react';
import favicon from '/favicon.ico';
import {
    type ClientLoaderFunction,
    type ClientLoaderFunctionArgs,
    isRouteErrorResponse,
    Links,
    type LoaderFunction,
    type LoaderFunctionArgs,
    Meta,
    type MiddlewareFunction,
    Outlet,
    Scripts,
    ScrollRestoration,
    type UIMatch,
    useLocation,
    useMatches,
} from 'react-router';
import type { ShopperBasketsTypes, ShopperProductsTypes } from 'commerce-sdk-isomorphic';
// @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
import StoreLocatorProvider from '@/extensions/store-locator/providers/store-locator';
import authMiddlewareServer, { getAuth as getAuthServer } from '@/middlewares/auth.server';
import authMiddlewareClient, { getAuth as getAuthClient } from '@/middlewares/auth.client';
import basketMiddlewareClient, { getBasket } from '@/middlewares/basket.client';
import {
    performanceMetricsMiddlewareServer,
    performanceMetricsMiddlewareClient,
} from '@/middlewares/performance-metrics';
import AuthProvider from '@/providers/auth';
import BasketProvider from '@/providers/basket';
import type { SessionData } from '@/lib/api/types';
import createClient from '@/lib/scapi';
import Header from '@/components/header';
import CategoryNavigationMenuMega from '@/components/navigation-menu-mega';
import Footer from '@/components/footer';
import { Toaster } from '@/components/toast';
import Loading from '@/components/loading';
import './app.css';

// eslint-disable-next-line react-refresh/only-export-components
export const middleware: MiddlewareFunction<Response>[] = [performanceMetricsMiddlewareServer, authMiddlewareServer];

// eslint-disable-next-line react-refresh/only-export-components
export const clientMiddleware: MiddlewareFunction<void>[] = [
    performanceMetricsMiddlewareClient,
    authMiddlewareClient,
    basketMiddlewareClient,
];

const getCategoryData = (
    client: ReturnType<typeof createClient>,
    id: string,
    levels: ShopperProductsTypes.GetCategoryLevelsEnum
): Promise<ShopperProductsTypes.Category> =>
    client.ShopperProducts.getCategory({
        parameters: {
            id,
            levels,
        },
    });

// eslint-disable-next-line react-refresh/only-export-components
export const loader: LoaderFunction = ({
    context,
}: LoaderFunctionArgs): {
    root: Promise<ShopperProductsTypes.Category>;
    subs: Promise<ShopperProductsTypes.Category[]>;
    auth: () => SessionData; // Use a function to prevent state serialization
} => {
    const session = getAuthServer(context);
    const client = createClient(context);

    // Load the root category and its sub categories information
    const rootCategoryPromise = getCategoryData(client, 'root', 1);

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
                        acc.push(getCategoryData(client, subCategory.id, 2));
                    }
                    return acc;
                },
                []
            ) ?? []
        )
    );
    return { root: rootCategoryPromise, subs: subCategoriesPromise, auth: () => session };
};

// eslint-disable-next-line react-refresh/only-export-components
export const clientLoader: ClientLoaderFunction = ({
    context,
}: ClientLoaderFunctionArgs): {
    auth: () => SessionData;
    basket: () => ShopperBasketsTypes.Basket;
} => {
    return {
        auth: () => getAuthClient(context),
        basket: () => getBasket(context),
    };
};
clientLoader.hydrate = true as const;

// Managed Runtime will provide a BUNDLE_ID
let bundleId = 'local';
if (import.meta.env?.SSR) {
    bundleId = process.env.BUNDLE_ID || 'local';
}
const bundlePath = `/mobify/bundle/${bundleId}/client/`;

export function Layout({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <script
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                        __html: `
                        window._BUNDLE_ID = ${JSON.stringify(bundleId)};
                        window._BUNDLE_PATH = ${JSON.stringify(bundlePath)};
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
                <Loading />
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
    let details = 'An unexpected error occurred.';
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? '404' : 'Error';
        details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details}</p>
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
        basket?: () => ShopperBasketsTypes.Basket;
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

    return (
        <AuthProvider value={auth?.()}>
            <BasketProvider value={basket?.()}>
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
    );
}
