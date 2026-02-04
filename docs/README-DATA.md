# Data Retrieval

This project implements a _composable Salesforce Commerce Cloud reference storefront_ in the form of a **server-rendered single-page application** (SPA). That means that only the first direct request to a route is processed and responded to by the server. All subsequent navigations are routed on the client and only trigger requests for data and/or additionally required assets.

One key to understanding our server-rendered SPA architecture lies in recognizing what actually constitutes _the server_ within our [composable storefront](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime) architecture. In traditional Commerce Cloud storefronts, based on SiteGenesis or SFRA, the B2C Commerce platform itself acts as the server. In contrast, composable storefronts are rendered and delivered by the [Managed Runtime](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/mrt-overview.html) (MRT), with the B2C Commerce platform acting solely as a data source (whereby the data is usually provided using SCAPI).

## Server-Side API Fan-Out

This project is built on **[React Router v7](https://reactrouter.com/)**, leveraging its [framework mode](https://reactrouter.com/start/modes#framework) to provide a structured foundation for routing and data handling. The reason we deliberately use React Router in framework mode lies in its flexibility to implement complex data fetching patterns, such as the potential separation of server/client data flows.

> [!IMPORTANT]
> **However, for our out-of-the-box implementation we made this fundamental architectural decision:** In our proposed architecture, the Managed Runtime is not only used as a simple proxy but as a **data orchestration layer**. Using React Router’s [server data loading](https://reactrouter.com/start/framework/data-loading#server-data-loading) functionality, we are able to **aggregate parallel and sequential SCAPI requests into a single request** to MRT and progressively stream the response to the client. This means that **all (actual) API requests are executed on the server** (i.e., MRT).

A solid understanding of this architectural decision is essential, as it directly impacts both the structure and the bundling of the application code as well as cross-cutting concerns such as performance, security, and authentication.

> [!NOTE]
> This approach requires trade-offs for subsequent navigations (additional hop through the server, potential Lambda cold starts), but offers a pragmatic balance of various performance characteristics (initial load time, bundle size, network efficiency on weak connections). Additionally, a consistent server-loading approach anticipates the stabilization of [React Server Components](https://react.dev/reference/rsc/server-components) support in [React Router](https://reactrouter.com/how-to/react-server-components) and associated patterns like full server-side rendering of subsequent navigations.

## Framework Patterns

In its framework mode, React Router not only supports our intended data retrieval flow. It also enables the use of advanced React techniques during server-side rendering, such as data streaming. This allows for fine-grained control over which data must be available at specific points in the markup generation process, and which data can instead be streamed from the server to the client to be seamlessly integrated during/after client-side hydration.

React Router introduces standardized patterns for loading and managing data:

- **[Loaders](#loaders)** [🔗](https://reactrouter.com/start/framework/data-loading): Functions tied to routes that fetch data before rendering, ensuring views have the required state upfront.
- **[Deferred Data](#deferred-data)** [🔗](https://reactrouter.com/how-to/suspense): Support for streaming data into components, enabling faster initial rendering with incremental updates.
- **[Actions](#actions)** [🔗](https://reactrouter.com/start/framework/actions): Handle mutations (e.g., form submissions) and return updated state back into the routing context.
- **Error Boundaries** [🔗](https://reactrouter.com/how-to/error-boundary): Route-level error handling for failed loaders or actions, isolating failures without breaking the full app.
- **Revalidation**: Automatic or programmatic re-fetching of route data when navigation or mutations occur.

These and other patterns enforce consistency across the codebase, reduce boilerplate, and align data lifecycles tightly with navigation.

## Conventions

### Loaders

> [!IMPORTANT]
> **To enforce an exclusive [server data loading](https://reactrouter.com/start/framework/data-loading#server-data-loading) flow, our project _mandates_ a specific pattern:** every UI route **must only** export a [`loader`](https://reactrouter.com/start/framework/route-module#loader) function.

Only this absence of any [client data loading](https://reactrouter.com/start/framework/data-loading#client-data-loading) patterns (e.g., [`clientLoader`](https://reactrouter.com/start/framework/route-module#clientloader)) guarantees the intended behavior, where both initial requests and subsequent navigations resolve their data on the server.

---

#### Example

In this simple example, data is loaded in a **not recommended** rendering-blocking / awaited manner.

> [!CAUTION]
> While this pattern makes accessing data easy — since the component ultimately receives the fully resolved data — this render-blocking approach can **severely impact your site’s performance**, especially when dealing with slow or large data requests. React Router provides patterns to better address this, e.g., through [deferred data](#deferred-data) loading, which allow parts of the UI to render before all data is available.

<details>
<summary>❌ Render-blocking / awaited loader</summary>

```typescript jsx
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperCustomers, ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';

type YourPageData = {
    customer: ShopperCustomers.schemas['Customer'];
    basket: ShopperBasketsV2.schemas['Basket'];
};

export async function loader({ params: { customerId }, context }: LoaderFunctionArgs): YourPageData {
    const clients = createApiClients(context);
    return {
        customer: await clients.shopperCustomers
            .getCustomer({
                params: {
                    path: {
                        customerId,
                    },
                },
            })
            .then(({ data }) => data),
        basket: await clients.shopperBasketsV2
            .getBasket({
                params: {
                    path: { basketId }, // <-- `basketId` is required
                },
            })
            .then(({ data }) => data),
    };
}

export default function YourPage({ loaderData }: { loaderData: YourPageData }) {
    return (
        <div>
            <h1>Customer: {customerData.firstName} {customerData.lastName}</h1>
            <h2>Basket Items: {basketData.productItems?.length ?? 0}</h2>
        </div>
    );
}
```

</details>

---

### Deferred Data

One of the framework’s major strengths is its support for **data streaming** combined with [`<Suspense/>`](https://react.dev/reference/react/Suspense) boundaries. This combination enables highly fine-grained control points for rendering behavior and a wide range of performance optimizations.

By flexibly mixing streamed (incrementally resolved) and awaited data — potentially with differing behavior between server and client even — developers gain access to a broad spectrum of approaches. However, this richness of options also introduces complexity, which can be both a blessing and a challenge.

> [!TIP]
> The following examples illustrate possible approaches to handling deferred data. Anticipating the key takeaway: our general recommendation is to **stream as much data as possible from the server to the client** during server-side rendering, and to **consistently rely on non-blocking data retrieval** for all subsequent client-side navigations. Our few examples cannot be exhaustive given the wide variety of real-world requirements. The [official documentation for `<Suspense/>`](https://react.dev/reference/react/Suspense) highlights several other interesting optimization opportunities and is highly recommended reading for every developer.

---

#### Example #1

The following example builds on the case from before. Instead of fetching the data in a render-blocking manner and passing the resolved values to the component, two promises are passed into the component now. In the case of server-side rendering, this has the additional advantage that data fetching can begin in parallel with the rendering process. As a result, both data and the markup skeleton are streamed to the client simultaneously and can, in the best case, be processed almost at the same time.

<details>
<summary>⚠️ Streaming data without <code>Suspense</code> boundary</summary>

```typescript jsx
import { use } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperCustomers, ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';

type YourPageData = {
    customer: Promise<ShopperCustomers.schemas['Customer']>;
    basket: Promise<ShopperBasketsV2.schemas['Basket']>;
};

export function loader({ params: { customerId }, context }: LoaderFunctionArgs): YourPageData {
    const clients = createApiClients(context);
    return {
        customer: clients.shopperCustomers
            .getCustomer({
                params: {
                    path: {
                        customerId,
                    },
                },
            })
            .then(({ data }) => data),
        basket: clients.shopperBasketsV2
            .getBasket({
                params: {
                    path: { basketId }, // <-- `basketId` is required
                },
            })
            .then(({ data }) => data),
    };
}

export default function YourPage({ loaderData }: { loaderData: YourPageData }) {
    const customerData = use(loaderData.customer);
    const basketData = use(loaderData.basket);

    return (
        <div>
            <h1>Customer: {customerData.firstName} {customerData.lastName}</h1>
            <h2>Basket Items: {basketData.productItems?.length ?? 0}</h2>
        </div>
    );
}
```

</details>

---

The example above uses React 19’s [`use`](https://react.dev/reference/react/use) API to resolve two promises directly in the route component. While this works in React Router, every developer should be aware of the implications of this supposed solution:

1. The component calling `use` suspends while the `Promise` passed to it is pending.
2. The presence of a [`<Suspense/>`](https://react.dev/reference/react/Suspense) boundary is **required** for `use` to actually work with pending promises. If the component that calls `use` is wrapped in a `<Suspense/>` boundary, a given fallback will be displayed until the `Promise` is resolved. Once the `Promise` is resolved, the fallback is replaced by the rendered components using the data returned by the `use` API.
3. Likewise, handling any rejections strictly requires the presence of an [error boundary](https://reactrouter.com/how-to/error-boundary). If the `Promise` passed to `use` is rejected, the fallback of the nearest error boundary will be displayed.

In React Router v7’s framework mode, both a default top-level `<Suspense/>` boundary and an error boundary are already provided, but a few additional tweaks are necessary for an actually good user experience:

1. To prevent using `use` within a page from immediately suspending the entire page and thereby blocking its whole display, we introduced a `<Suspense/>` boundary at the root layout’s [`<Outlet/>`](https://reactrouter.com/api/components/Outlet) level. This allows, for example, the header and footer sections of our layout to be rendered independently of the page’s main content, which may be suspended.
2. But that’s only the first step on the way to a truly meaningful/attractive user experience. We also offer a [`createPage`](https://github.com/SalesforceCommerceCloud/storefront-next/tree/main/packages/template-retail-rsc-app/src/components/create-page) HOC/helper for easily creating a page component, including suspense fallback.

---

#### Example #2.1

This slightly modified example compared to Example #1 uses the `createPage` helper mentioned above to create a `<Suspense/>` boundary that is active while the two promises are being resolved and displays a defined skeleton fallback during that time.

<details>
<summary>⚠️ Streaming data with a single (implicit) <code>Suspense</code> boundary</summary>

```typescript jsx
// Keep the imports and the loaders from Example #1
// ...
import { createPage } from '@/components/create-page';

const YourPageView = ({ loaderData }: { loaderData: YourPageData }) => {
    const customerData = use(loaderData.customer);
    const basketData = use(loaderData.basket);

    return (
        <div>
            <h1>Customer: {customerData.firstName} {customerData.lastName}</h1>
            <h2>Basket Items: {basketData.productItems?.length ?? 0}</h2>
        </div>
    );
};

export default createPage<YourPageData>({
    component: YourPageView,
    fallback: <YourPageSkeleton />,
});
```

</details>

---

#### Example #2.2

To illustrate what exactly happens in Example #2.1, here’s a virtually identical example using React’s `<Suspense/>` and React Router’s `<Await/>` directly.

<details>
<summary>⚠️ Streaming data with a single (explicit) <code>Suspense</code> boundary</summary>

```typescript jsx
// Keep the imports and the loaders from Example #1
// ...
import { Suspense } from 'react';
import { Await } from 'react-router';

const YourPageView = ({
    customer: customerData,
    basket: basketData,
}: {
    customer: ShopperCustomers.schemas['Customer'];
    basket: ShopperBasketsV2.schemas['Basket'];
}) => {
    return (
        <div>
            <h1>Customer: {customerData.firstName} {customerData.lastName}</h1>
            <h2>Basket Items: {basketData.productItems?.length ?? 0}</h2>
        </div>
    );
};

export default function YourPage({ loaderData: { customer, basket } }: { loaderData: YourPageData }) {
    return (
        <Suspense fallback={<YourPageSkeleton />}>
            <Await resolve={Promise.all([customer, basket])}>
                {([c, b]) => <YourPageView customer={c} basket={b} />}
            </Await>
        </Suspense>
    );
}
```

</details>

---

#### Example #3

This insight into the inner workings of `createPage` brings us to the most granular and therefore preferable solution:

<details>
<summary>✅️ Streaming data with multiple <code>Suspense</code> boundaries</summary>

```typescript jsx
// Keep the imports and the loaders from Example #1
// ...
import { Suspense } from 'react';
import { Await } from 'react-router';

export default function YourPage({ loaderData: { customer, basket } }: { loaderData: YourPageData }) {
    return (
        <div>
            <Suspense fallback={<YourPageCustomerSkeleton />}>
                <Await resolve={customer}>
                    {(customerData) => <h1>Customer: {customerData.firstName} {customerData.lastName}</h1>}
                </Await>
            </Suspense>
            <Suspense fallback={<YourPageBasketSkeleton />}>
                <Await resolve={basket}>
                    {(basketData) => <h2>Basket Items: {basketData.productItems?.length ?? 0}</h2>}
                </Await>
            </Suspense>
        </div>
    );
}
```

</details>

---

### Actions

> [!IMPORTANT]
> **To enforce an exclusive [server data loading](https://reactrouter.com/start/framework/data-loading#server-data-loading) flow, similar to [loaders](#loaders), our project _mandates_ a comparable pattern for actions as well:** only the definition of server [`action`](https://reactrouter.com/start/framework/actions#server-actions) exports/methods is permitted in route modules.

### SCAPI Clients

Developers who are already familiar with the predecessor framework [PWA Kit](https://github.com/SalesforceCommerceCloud/pwa-kit) will likely already be familiar with the RESTful [B2C Commerce APIs](https://developer.salesforce.com/docs/commerce/commerce-api) (SCAPI) and how they were accessed through various SDK layers.

For Storefront Next, we explicitly decided against a rather heavyweight additional layer such as `commerce-sdk-react`. Instead, we provide the lightweight SCAPI client from `@salesforce/storefront-next-runtime/scapi`. This client is generated from OpenAPI specifications and provides full type safety for all SCAPI operations.
