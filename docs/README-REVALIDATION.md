# Revalidation Control

After any navigation or data mutation, [React Router](https://reactrouter.com/) re-runs the loaders for **every active route** by default, so the UI stays consistent without manual cache invalidation. This keeps data fresh, but it also means a single mutation can re-fetch data it never touched. On a commerce storefront, where loaders fan out to multiple data sources like SCAPI or Einstein, and pages nest several layers deep, those wasted re-fetches cost you twice: every one is a real backend API call that consumes rate-limited capacity (a **scale** problem that compounds with traffic), and each re-run adds latency to the interaction that triggered it (a **performance** problem the shopper feels). Both grow with the depth of your route tree, not with what actually changed.

A [`shouldRevalidate`](https://reactrouter.com/start/framework/route-module#shouldrevalidate) function exported at the route level is the opt-out. This guide explains when revalidation fires, the backend-scale and user-facing costs it incurs, and how to gate it correctly.

> [!NOTE]
> For the mechanics of loaders, actions, and fetchers that this guide builds on, see [Data Fetching](README-DATA.md).

## When revalidation fires

React Router revalidates loaders after **every navigation and action submission** by default. An action is a [`<Form>`](https://reactrouter.com/api/components/Form), [`useSubmit`](https://reactrouter.com/api/hooks/useSubmit), or [`fetcher.submit()`](https://reactrouter.com/api/hooks/useFetcher), and an imperative [`useRevalidator().revalidate()`](https://reactrouter.com/api/hooks/useRevalidator) triggers it too. When it does, it re-runs **every loader in the active set**, not just the loader tied to the route that handled the change. The active set is the union of:

1. **The matched route chain** — every nested layout loader from the root down through the leaf route for the current URL.
2. **Active resource fetchers** — any [resource route](README-DATA.md#resource-routes) loaded with `fetcher.load()` whose component is still mounted, regardless of which route fired the action. When one is mounted in the shared shell (header/footer) it's active on every page; this guide calls those **shell fetchers**.
3. **Open overlays** — modals, drawers, and sheets are mounted lazily, so they're not in the active set on a fresh page load. But once the shopper opens one, any resource fetcher it loads joins the active set for as long as it stays open. See [Overlays widen the active set](#overlays-widen-the-active-set).

An **action submission re-runs the whole active set** unconditionally. A **navigation** runs the same set through React Router's default heuristic, which already skips loaders whose route params and URL didn't change. So the navigation cases you still need to gate are the ones where the URL changed but the loader's data didn't (see [Navigation](#navigation-skip-re-fetch-when-only-query-params-change)). This guide focuses on the action axis, where the over-fetch is largest.

```
              one action (e.g. add-to-cart)
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
root loader          app layout loader        leaf loader        ← matched chain
(session, config)    (navigation)             (e.g. cart page)
     │
     ▼
mini-cart fetcher                                                ← shell fetcher
(basket + products)
     │
     ▼
quick-add modal fetcher.                                         ← open overlay
(product details)

All of these re-run by default, including the ones the action never touched.
```

Whether a route revalidates is decided by **whether it exports a `loader`**, not by how its file is named. A route that exports only an `action` is a pure trigger: it fires revalidation but has nothing of its own to revalidate. A route that exports a `loader` participates whenever it is active, even if it also exports an `action`.

### Overlays widen the active set

Modals, drawers, and sheets are the easiest source of mounted fetchers to overlook, because they aren't there on a fresh page load; they mount only when the shopper opens them. Reason about the active set in the *open* state, where an overlay can contribute in two independent ways:

- **As a target** — it loads a resource fetcher on open (for example, a quick-add modal that pulls full product details). That fetcher joins the active set and is revalidated by **any** action on the page while the overlay is open, not just actions inside it. A modal that only displays data and submits nothing is still re-fetched when a sibling action fires, such as a mini-cart quantity change in the header.
- **As a trigger** — it contains an action-submitting control (an add-to-cart `<Form>`, a save button). That submission revalidates **every** active loader and fetcher on the page (the layout chain, the shell fetchers, and any other open overlay's fetchers), whether or not the overlay loads anything itself.

An overlay needs only one of these roles to matter. When a single overlay does both, loading product data on open *and* submitting add-to-cart from inside itself, it both widens the active set and triggers the revalidation that re-fetches it.

> [!IMPORTANT]
> A raw client call does **not** complete a route action or a navigation, so it triggers **zero** loader revalidation. This covers a [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) in a click handler, a SCAPI client call, and a `fetcher.load()` against a resource route. A control that looks like a mutation (a wishlist heart, an inline favorite) only causes revalidation if it submits via `fetcher.submit` / `<Form>` / `useSubmit`, navigates, or calls `revalidate()`.

## The two costs: backend scale and user-facing performance

Each piece is correct on its own: the loader fetches what its route needs, and the action mutates what it should. The cost emerges from the *composition*, where the "revalidate everything" default doesn't distinguish what the action changed. A wasteful re-run is paid twice, on two independent axes.

### Backend scale

Every unjustified revalidation is a *real* round-trip to the backend. A loader that re-runs re-issues all of its SCAPI and Einstein calls, even when nothing it reads has changed. That consumes backend capacity and counts against SCAPI rate limits, and it does so for traffic the store gains nothing from.

The magnitude is a product, not a constant:

```
wasted backend calls ≈ wasteful re-runs per action
                      × calls each loader fans out to
                      × actions per session
                      × concurrent shoppers
```

- **It scales with route-tree depth, not change surface.** Adding a nested layout loader or mounting a new persistent fetcher widens the fan-out for *every* action on *every* page that mounts it.
- **It scales with calls per loader.** A loader that issues one cached read adds little when it re-runs needlessly. A loader that fans out to several SCAPI calls plus an Einstein recommendation request multiplies that whole set on every wasteful re-run, so the same defect can be negligible on one route and massive on another.
- **No deduplication.** Two active loaders reading the same resource fire two separate SCAPI requests; nothing consolidates them.
- **It compounds with traffic.** A single shopper's redundant re-run is cheap. The same re-run on a high-traffic page (PLP, PDP, cart), across every concurrent shopper firing the gesture many times a session, is what turns a quiet inefficiency into a backend-scalability problem during peak load.

### User-facing performance

- **No data-level targeting.** You opt out per route, never per field. If half the route's data changed, the whole loader re-runs anyway.
- **Deep loaders pay full latency on every re-run.** A loader that fetches an entity, then dependent data, then enrichment (a sequential waterfall) pays its entire critical-path time on each re-run. That latency lands on the interaction that triggered the action, so the shopper feels it as input lag ([INP](https://web.dev/articles/inp)).
- **Fetcher submissions multiply it.** Each independent fetcher submission triggers a full revalidation, so a page with several inline edits hits the backend in bursts.

## Two ways a re-run is wasteful

For each pairing of an action with an active loader, a re-run is justified **only if both** are true: the action's result touches the loader's data (*overlap*), **and** the new value is reachable only by re-running that loader (*availability*). Two ways the pairing fails:

### No overlap

The action's result has nothing to do with the loader's data, yet the loader re-runs. On the cart page, add-to-cart returns a basket; the same loader also fetches Einstein recommendations ("you may also like", "recently viewed"), which read neither the basket nor anything the action changed, but they re-fetch from Einstein on every add. They can't be affected by the action, yet they pay the full re-fetch.

### Overlap, but the value is already available

The action's result *does* touch the loader's data, so the re-run looks justified, but a [context provider](README-STATE.md) in the subtree may already hold the new value. Add-to-cart returns the updated basket, and the basket provider is updated immediately from that action result, so the cart badge and mini-cart are already correct. A basket-reading loader that then re-runs re-fetches a basket the provider already holds. The action and loader are about the same entity, which is exactly why this case slips past review.

> [!WARNING]
> Don't gate off a re-run that is itself the sync mechanism. If the provider refills from what the loader returns, and the action result alone never reaches the consumers, then the revalidation is required. The test: right after the action, does the freshest copy live in the action result already propagated into the subtree (→ redundant, gate it off), or only in what the loader produces (→ required, keep it)? Decide by reading the provider and its consumer, not by matching entity names.

## Gating With `shouldRevalidate`

The fix is never "turn revalidation off everywhere." It's a per-route `shouldRevalidate` that opts **in** only when the action's result carries the data this loader reads. Its arguments tell you what kind of revalidation is being requested:

- `currentUrl` / `nextUrl` — for navigations.
- `formAction` / `actionResult` — for action submissions.
- `defaultShouldRevalidate` — React Router's default decision; return it to defer.

### Navigation: skip re-fetch when only query params change

When a loader consumes URL search parameters to fetch its data, it re-runs with the new parameters on the next navigation anyway, so you don't need to revalidate when only those params change. This example uses category, price range, and sort filters:

```typescript
// src/routes/products.tsx
import type { LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "all";
  const minPrice = url.searchParams.get("minPrice") || "0";
  const maxPrice = url.searchParams.get("maxPrice") || "1000";
  const sort = url.searchParams.get("sort") || "relevance";

  // Loader naturally handles query params - no revalidation needed
  const products = await fetch(
    `https://api.example.com/products?category=${category}&minPrice=${minPrice}&maxPrice=${maxPrice}&sort=${sort}`,
  ).then((r) => r.json());

  return { products, filters: { category, minPrice, maxPrice, sort } };
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  actionStatus,
  actionResult,
}: ShouldRevalidateFunctionArgs): boolean {
  // currentUrl and nextUrl are URL objects - read .pathname directly
  if (currentUrl.pathname !== nextUrl.pathname) {
    // Revalidate when navigating to a different route
    return true;
  }

  // Revalidate if an action modified product data (e.g., inventory update).
  // Match any 2xx, not just 200, so a 201/204 mutation still revalidates.
  if (actionStatus !== undefined && actionStatus >= 200 && actionStatus < 300 && actionResult?.productsModified) {
    return true;
  }

  // Don't revalidate for query param changes - loader handles them naturally
  // This prevents redundant fetches when filters change
  return false;
}
```

> [!TIP]
> When your loader consumes URL search parameters to fetch data, returning `false` for query parameter changes prevents double-fetching. The loader executes with the new parameters on the next navigation anyway.

### Actions: opt in only when the result carries your data

For action submissions, inspect `actionResult` and re-run **only** when it carries the data this loader reads. The template's mini-cart resource route shows the adequate shape. It re-runs only when an action actually returned a basket, so unrelated submissions (wishlist, locale, email verification) skip the SCAPI round-trip:

```typescript
// src/routes/resource.basket-products.ts
export const shouldRevalidate: ShouldRevalidateFunction = ({ formAction, actionResult, defaultShouldRevalidate }) => {
  // Action submissions: opt in only when the action returned a basket payload.
  if (formAction) {
    return Boolean((actionResult as { basket?: { basketId?: string } } | undefined)?.basket?.basketId);
  }
  // Navigation or imperative revalidate(): defer to the default.
  return defaultShouldRevalidate;
};
```

> [!CAUTION]
> Judge a gate by its adequacy, not its presence. A `shouldRevalidate` that only checks whether `formAction` is set, without inspecting whether the result touched its data, still re-runs on *every* action. The adequate shape is the inverse: opt in only when `actionResult` carries this loader's data, so unrelated submissions are skipped. A gate that handles today's actions can still miss one you add later.

### Cache shell data that never changes per shopper

Some loaders fetch data that no shopper action can change, such as the navigation menu. Return `false` unconditionally so it loads once and is never re-fetched:

```typescript
// src/routes/_app.tsx
export function shouldRevalidate() {
  return false;
}
```

## What `shouldRevalidate` cannot do

These limits are inherent to React Router's model, and they're why the discipline above matters:

- **Per-route granularity, not per-field.** You can't revalidate only the price and not the reviews; the whole loader re-runs or it doesn't.
- **No deduplication** across loaders that read the same resource.
- **The opt-out is manual and per-route.** Every route needs its own correct `shouldRevalidate`; miss one and you over-fetch silently.
- **No per-resource SWR cache.** React Router does keep the previous loader data on screen while a re-run is in flight, so revalidation doesn't force a fallback: `useLoaderData` returns the prior value and the pending state is opt-in via `useNavigation` / `revalidator.state`. But there's no resource-level cache like React Query: each re-run still hits the backend, and any UI that does branch on the pending state shows lag on a slow backend. Use [optimistic UI](README-STATE.md) to mask it where the mutation is likely to succeed.

## Related

- [Data Fetching](README-DATA.md) — loaders, actions, fetchers, and resource routes.
- [State Management](README-STATE.md) — context providers and optimistic UI that keep the subtree in sync without a loader re-run.
- [Performance Best Practices](README-PERFORMANCE.md) — the full set of storefront performance guides.
- [`shouldRevalidate` reference](https://reactrouter.com/start/framework/route-module#shouldrevalidate) on reactrouter.com.
