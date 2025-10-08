# Data Retrieval

This project is built on **[React Router v7](https://reactrouter.com/)**, leveraging its [framework mode](https://reactrouter.com/start/modes#framework) to provide a structured foundation for routing and data handling. The framework mode has a strong influence on how data is retrieved and managed across the application. The reason we deliberately use React Router in framework mode lies in a fundamental architectural decision:

> [!NOTE]
> This project implements a composable Salesforce Commerce Cloud reference storefront as an initially **server-rendered single-page application** (SPA). Initially server-rendered means that only the first direct request to a route is processed and responded to by the server. All subsequent navigations are routed on the client and only trigger requests for data and/or assets, which can typically be served from a CDN even instead of its canonical source/API. This architectural choice was made to **clearly separate and optimize server-side and client-side data flows**.

A solid understanding of this architectural decision is essential, as it directly impacts both the structure of the application code and cross-cutting concerns such as authentication.

## Skip the Server Hop

> [!IMPORTANT]
> The key to understanding our server-rendered SPA architecture lies in recognizing what actually constitutes _the server_ for a [composable storefront](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime). In traditional Commerce Cloud storefronts based on SiteGenesis or SFRA, the B2C Commerce platform itself acts as the server. In contrast, composable storefronts are delivered by the [Managed Runtime](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/mrt-overview.html) (MRT), with the B2C Commerce platform acting solely as a data source. **Thus, the driving factor behind this architecture is the reduction of additional server hops to MRT achieved by directly contacting the B2C Commerce server on subsequent navigations.**

## Framework Patterns

In its framework mode, React Router not only supports our intended server/client split in the data retrieval flow. It also enables the use of advanced React techniques during server-side rendering, such as data streaming. This allows for fine-grained control over which data must be available at specific points in the markup generation process, and which data can instead be streamed from the server to the client to be seamlessly integrated during/after client-side hydration.

React Router introduces standardized patterns for loading and managing data:

- **[Loaders](#loaders)** [🔗](https://reactrouter.com/start/framework/data-loading): Functions tied to routes that fetch data before rendering, ensuring views have the required state upfront.
- **[Deferred Data](#deferred-data)** [🔗](https://reactrouter.com/how-to/suspense): Support for streaming data into components, enabling faster initial rendering with incremental updates.
- **[Actions](#actions)** [🔗](https://reactrouter.com/start/framework/actions): Handle mutations (e.g., form submissions) and return updated state back into the routing context.
- **Error Boundaries** [🔗](https://reactrouter.com/how-to/error-boundary): Route-level error handling for failed loaders or actions, isolating failures without breaking the full app.
- **Client Data** [🔗](https://reactrouter.com/how-to/client-data): Allows data fetching and mutation directly in the browser using `clientLoader` / `clientAction`, optionally hydrating from server-side data, caching client-side, skipping server hops for navigation, etc.
- **Revalidation**: Automatic or programmatic re-fetching of route data when navigation or mutations occur.

These and other patterns enforce consistency across the codebase, reduce boilerplate, and align data lifecycles tightly with navigation.

## Conventions

### Loaders

> [!IMPORTANT]
> **To enforce a _strict server/client data flow split_, our project _mandates_ a specific pattern:** every UI route **must** export both a [`loader`](https://reactrouter.com/start/framework/data-loading#server-data-loading) and a [`clientLoader`](https://reactrouter.com/start/framework/data-loading#client-data-loading) function. Only this server/client loader duality guarantees the intended behavior, where initial requests resolve their data on the server while subsequent navigations resolve data exclusively on the client.

In the React Router framework, [`loader`](https://reactrouter.com/start/framework/route-module#loader) and [`clientLoader`](https://reactrouter.com/start/framework/route-module#clientloader) are fixed API entry points. Per our convention, in each UI route module you have to **default**-export the React page component and the **named exports** `loader`/`clientLoader`.

---

#### Example

In this simple example, data is loaded in an identical manner on both the server and the client — in this specific case, in a **not recommended** rendering-blocking / awaited manner.

> [!CAUTION]
> While this pattern makes accessing data easy — since the component ultimately receives the fully resolved data — this render-blocking approach can **severely impact your site’s performance**, especially when dealing with slow or large data requests. React Router provides patterns to better address this, e.g., through [deferred data](#deferred-data) loading, which allow parts of the UI to render before all data is available.

<details>
<summary>❌ Render-blocking / awaited loaders</summary>

```typescript jsx
import type { ClientLoaderFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type { ShopperCustomersTypes, ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';

type YourPageData = {
    customer: ShopperCustomersTypes.Customer;
    basket: ShopperBasketsTypes.Basket;
};

async function getPageData({ params: { customerId }, context }: LoaderFunctionArgs): Promise<YourPageData> {
    const client = createClient(context);
    return {
        customer: await client.ShopperCustomers.getCustomer({
            parameters: {
                customerId,
            },
        }),
        basket: await client.ShopperBaskets.getBasket({
            parameters: {
                basketId: '...', // <-- `basketId` is required
            },
        }),
    };
}

export function loader(args: LoaderFunctionArgs): Promise<YourPageData> {
    return getPageData(args);
}

export function clientLoader(args: ClientLoaderFunctionArgs): Promise<YourPageData> {
    return getPageData(args);
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
import type { ClientLoaderFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type { ShopperCustomersTypes, ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';

type YourPageData = {
    customer: Promise<ShopperCustomersTypes.Customer>;
    basket: Promise<ShopperBasketsTypes.Basket>;
};

function getPageData({ params: { customerId }, context }: LoaderFunctionArgs): YourPageData {
    const client = createClient(context);
    return {
        customer: client.ShopperCustomers.getCustomer({
            parameters: {
                customerId,
            },
        }),
        basket: client.ShopperBaskets.getBasket({
            parameters: {
                basketId: '...', // <-- `basketId` is required
            },
        }),
    };
}

export function loader(args: LoaderFunctionArgs): YourPageData {
    return getPageData(args);
}

export function clientLoader(args: ClientLoaderFunctionArgs): YourPageData {
    return getPageData(args);
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
2. But that’s only the first step on the way to a truly meaningful/attractive user experience. We also offer a [`createPage`](https://github.com/SalesforceCommerceCloud/SFCC-Odyssey/tree/main/packages/template-retail-rsc-app/src/components/create-page) HOC/helper for easily creating a page component, including suspense fallback.

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
    customer: ShopperCustomersTypes.Customer;
    basket: ShopperBasketsTypes.Basket;
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
> **To enforce a _strict server/client data flow split_, similar to [loaders](#loaders), our project _mandates_ a specific pattern for actions as well:** only the definition of [`clientAction`](https://reactrouter.com/start/framework/actions#client-actions) exports/methods is permitted.

### SCAPI Fetch Service

Developers who are already familiar with the predecessor framework [PWA Kit](https://github.com/SalesforceCommerceCloud/pwa-kit) will likely already be familiar with the [`commerce-sdk-isomorphic`](https://github.com/SalesforceCommerceCloud/commerce-sdk-isomorphic) and/or its React-specific extension [`commerce-sdk-react`](https://github.com/SalesforceCommerceCloud/pwa-kit/tree/develop/packages/commerce-sdk-react). The isomorphic SDK abstracts aspects such as access to and prior authentication with the RESTful [B2C Commerce APIs](https://developer.salesforce.com/docs/commerce/commerce-api) (SCAPI) in a JavaScript framework-agnostic manner.

For Odyssey, we explicitly decided against a rather heavyweight additional layer such as `commerce-sdk-react`. Instead, we provide the comparatively extremely lightweight SCAPI Fetch Service ([`@/lib/scapi`](https://github.com/SalesforceCommerceCloud/SFCC-Odyssey/blob/main/packages/template-retail-rsc-app/src/lib/scapi.ts)). This abstracts access to the underlying `commerce-sdk-isomorphic` using a [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), so that aspects such as dynamic loading of necessary SDK resources are handled in a completely transparent way for the consumer.

## Performance Metrics

The application includes a built-in performance monitoring system that tracks and visualizes server-side and client-side operation timings. This feature helps developers understand request performance, identify bottlenecks, and optimize parallelization opportunities.

### Configuration

Performance metrics are controlled through feature flags in `odyssey.config.json`:

```json
{
  "performance": {
    "metrics": {
      "serverPerformanceMetricsEnabled": true,
      "clientPerformanceMetricsEnabled": true,
      "serverTimingHeaderEnabled": false
    }
  }
}
```

#### Feature Flags

- **`serverPerformanceMetricsEnabled`** (default: `true`)
  - Enables performance tracking for server-side operations (SSR, API calls, authentication)
  - Logs detailed metrics after each server-side request completes

- **`clientPerformanceMetricsEnabled`** (default: `true`)
  - Enables performance tracking for client-side operations
  - Logs metrics for client-side navigations and API calls

- **`serverTimingHeaderEnabled`** (default: `false`)
  - When enabled, adds a [`Server-Timing`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing) HTTP header to responses
  - ⚠️ **Warning**: This **blocks** the response until all operations complete. Only enable for development/debugging.

### What Gets Tracked

The performance metrics system automatically tracks:

- **SSR Operations**: Total rendering time and middleware execution
- **Authentication**: Guest login, token refresh, and user authentication operations
- **API Calls**: All SCAPI requests with their class and method names
- **Timing Details**: Start time, end time, duration, and parallelization statistics

### Visualization Output

When enabled, performance metrics are logged to the console with a rich visualization showing:

1. **Header Section**: Request ID, URL, and total duration
2. **Timeline Visualization**: Visual bar chart showing when operations started, their duration, and overlap
3. **Time Markers**: Timeline scale showing milliseconds at regular intervals
4. **Operations List**: Each operation with its icon, name, duration, and timing range
5. **Summary Statistics**: Total operations, duration, sum of all operations, and parallelization percentage
6. **Category Breakdown**: Grouped statistics by operation type (AUTH, SSR, APICALL)

#### Example Output

```
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
🚀 Request server-1759770484104
📍 http://localhost:5173/
⏱️ 1409.27ms
⚠️  SSR timing shows total processing time. With streaming enabled, UI renders progressively before completion.
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

Name                                        Duration    Timeline
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
                                                     0ms            282ms            564ms            846ms            1127ms            1409ms

⚡ ssr.total                                1409.27ms ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 0→1409ms
⚡ ssr.middleware                            693.77ms ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0→694ms
🔐 auth.guestLogin                          657.18ms ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0→657ms
🔐 auth.loginGuestUser                      656.71ms ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1→657ms
🌐 apiCall.ShopperProducts.getCategory      437.84ms ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░ 693→1130ms
🌐 apiCall.ShopperSearch.productSearch      716.09ms ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 693→1409ms
🌐 apiCall.ShopperProducts.getCategory      230.08ms ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓░░░ 1131→1362ms
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

📊 Summary:
   Total Operations: 7
   Total Duration: 1409.27ms
   Sum of All Operations: 4800.94ms
   Parallelization: 70.6%

📈 Breakdown by Category:
   ⚡ SSR: 2 ops, 2103.04ms total, 1051.52ms avg
   🔐 AUTH: 2 ops, 1313.89ms total, 656.95ms avg
   🌐 APICALL: 3 ops, 1384.01ms total, 461.34ms avg

════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
```

> [!TIP]
> The timeline visualization makes it easy to spot operations that could be parallelized. Look for operations with gaps in the timeline bars or those that start after others complete.

### Tracked Operation Types

Operations are categorized and displayed with distinct icons:

- **⚡ SSR**: Server-side rendering operations
- **🔐 AUTH**: Authentication and authorization operations  
- **🌐 APICALL**: Salesforce Commerce API calls
- **💻 CLIENT**: Client-side operations

### Best Practices

1. **Development Only**: Keep metrics enabled during development to identify performance issues early
2. **Production**: Consider disabling or sampling metrics in production to reduce overhead
3. **Server-Timing Header**: Only enable `serverTimingHeaderEnabled` during debugging, as it blocks responses
4. **Review Regularly**: Check the timeline visualization periodically to ensure operations remain optimized
