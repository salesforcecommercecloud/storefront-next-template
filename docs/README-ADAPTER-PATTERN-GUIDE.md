# Adapter Pattern Implementation Guide

> A guide for implementing the adapter pattern in your components. The codebase uses the pattern in two places: **engagement** (analytics events — Einstein, Active Data) and **product content** (PDP modal content). This guide leads with engagement as the worked example.

## Table of Contents

1. [Introduction](#introduction)
2. [When NOT to Use the Adapter Pattern](#when-not-to-use-the-adapter-pattern)
3. [Why Use Adapters?](#why-use-adapters)
4. [Architecture Overview](#architecture-overview)
5. [Lazy Loading, Dynamic Import, and Bundle Size](#lazy-loading-dynamic-import-and-bundle-size)
6. [Core Patterns](#core-patterns)
7. [Step-by-Step Implementation](#step-by-step-implementation)
8. [Engagement Adapter Example](#engagement-adapter-example)
9. [Code Templates](#code-templates)
10. [Testing Strategies](#testing-strategies)
11. [Best Practices](#best-practices)
12. [Common Pitfalls](#common-pitfalls)
13. [Configuration Reference](#configuration-reference)

---

## Introduction

The **Adapter Pattern** is a structural design pattern that allows objects with incompatible interfaces to work together. In this application, adapters provide a unified interface for swappable third-party service implementations (Einstein, Active Data, custom solutions, etc.).

### What Problem Does It Solve?

Without adapters, your components would be tightly coupled to specific service implementations:

```ts
// ❌ Tight coupling - hard to swap services
import { EinsteinAPI } from '@/lib/einstein';

function trackPageView(event) {
    EinsteinAPI.sendActivity(event);
    // Caller is locked to Einstein
}
```

With adapters, callers depend on interfaces, not concrete implementations:

```ts
// ✅ Loose coupling - the mediator dispatches to whichever adapters are registered
const mediator = getEventMediator(getAllAdapters);
sendViewPageEvent(event, mediator, eventSiteInfo, consentPreferences);
```

---

## When NOT to Use the Adapter Pattern

The adapter pattern fits **client-side, in-browser** orchestration where the same caller may need to dispatch through different vendor SDKs. It is the wrong fit for server-side data fetching, where React Router loaders and the BFF give you a more direct path.

### Server-rendered data: use loaders, not adapters

Server-rendered data should flow through **route loaders** and a thin server-only orchestrator function. There is no client-side context, no provider, and no registry — the loader runs on the server, calls the orchestrator directly, and ships data to the route as a critical await or a deferred Promise.

The canonical example is **product recommendations**:

```ts
// src/routes/_app.cart.tsx
import { fetchProductRecommendations } from '@/lib/product/recommendations.server';

export async function loader({ context, request }: Route.LoaderArgs) {
    // Non-critical: don't await, return the Promise so the carousel suspends.
    const cartRecs = fetchProductRecommendations(
        { context, request },
        { name: 'cart-complete-the-set', currency: 'USD' }
    );
    return { cartRecs };
}
```

The route component then renders the recommendations inside a `<Suspense>` boundary using `<Await>`:

```tsx
<Suspense fallback={<ProductRecommendationSkeleton />}>
    <Await resolve={cartRecs} errorElement={null}>
        {(rec) => <ProductRecommendations data={rec} recommenderName="cart-complete-the-set" recommenderTitle="Complete the set" />}
    </Await>
</Suspense>
```

For Page Designer slots, the same orchestrator is called from the component-loader pattern (`loader.server` re-exported by the component module):

```ts
// src/components/product-recommendations/loader.ts
import { fetchProductRecommendations } from '@/lib/product/recommendations.server';

export async function loader({ componentData, context, request }) {
    const data = componentData.data ?? {};
    const name = data.recommenderName;
    if (!name) return {};
    return fetchProductRecommendations(
        { context, request },
        {
            name,
            ...(data.currency ? { currency: data.currency } : {}),
            ...(data.type ? { args: { type: data.type } } : {}),
        }
    );
}
```

A small client-driven `useRecommenders` hook still exists in `src/hooks/recommenders/use-recommenders.ts` for the rare case when a component needs to refetch in response to user action — but it calls the same `/resource/recommendations` BFF route under the hood. There is no `RecommendersAdapter`, `RecommendersProvider`, or recs-specific adapter registry.

### Why this is not adapter territory

- **Identity stays on the server.** Cookie ID, user ID, and client IP are stamped by the BFF — the browser never sees them. An adapter that ran in the browser would have to hand-roll this every call.
- **One vendor, one path.** There is one server-side recommendations vendor at a time. The choice happens at deploy time via `appConfig`, not at runtime via a registry lookup.
- **The shape returned to the carousel (`ProductSearchHit[]`) is the same shape used everywhere else.** No vendor type leaks past the orchestrator.

If you find yourself reaching for the adapter pattern for server-loaded data, stop and write a `*.server.ts` orchestrator instead. See [Data Fetching](./README-DATA.md) and [Page Designer](./README-PAGE-DESIGNER.md).

### When the adapter pattern still applies

- **Engagement / analytics events.** `EngagementAdapter`s (Einstein, Active Data) run in the browser and dispatch the same `AnalyticsEvent` to multiple vendors simultaneously. Different merchants enable different combinations.
- **Product content modals (PDP).** `ProductContentAdapter` provides optional methods for size guide, returns & warranty, BNPL, estimated delivery, etc. Each merchant plugs in their own implementation; the PDP renders whichever methods are present.
- **Customer preferences.** Similar shape to product content — a registry of optional methods that the merchant can swap.

The rule of thumb: if the work happens **in the browser**, can be **done by zero or many vendors at once**, and the choice is **per-merchant**, the adapter pattern fits. If the work happens **on the server**, has **exactly one path**, and is **selected at build time**, write a server orchestrator instead.

---

## Why Use Adapters?

### Benefits

1. **Swappable Implementations**: Switch between Einstein, Active Data, or custom services without changing component code
2. **Testability**: Mock adapters easily in tests without complex service mocking
3. **Vendor Independence**: Not locked into a single vendor's API
4. **Progressive Enhancement**: Start with a simple implementation, upgrade to advanced services later
5. **Configuration-Driven**: Change behavior via configuration, not code changes
6. **Multiple Instances**: Run different adapters simultaneously (A/B testing, fallbacks)

### Use Cases (in this codebase)

- **Engagement / analytics**: Einstein, Active Data — dispatched by the event mediator, run in parallel
- **Product content modals**: Pluggable PDP content (size guide, BNPL, estimated delivery, …)
- **Customer preferences**: Pluggable read/write of merchant-specific preference fields

### Use Cases (general)

- Payment processing (Stripe, PayPal, Apple Pay)
- Auxiliary search (Algolia, native search)
- Shipping rate quoting (FedEx, UPS, USPS)
- Auth providers (Google, Facebook, Auth0)

---

## Architecture Overview

The adapter pattern in this application consists of four key layers. The example below uses engagement (analytics) as the worked case:

```
┌─────────────────────────────────────────────────────────────┐
│                     1. Caller Layer                          │
│  (PageViewTracker, click handlers, view-recommender hooks)  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     2. Mediator / Hook Layer                 │
│  (getEventMediator, sendViewPageEvent, useProductContent…)  │
│  - Aggregates registered adapters                           │
│  - Provides clean API to callers                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     3. Provider Layer (optional)             │
│  (ProductContentProvider, CustomerPreferencesProvider)      │
│  - Lazy-loads adapter from registry                         │
│  - Provides context to hooks                                │
│  - Engagement adapters are read directly via getAllAdapters │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     4. Adapter Layer                         │
│  Registry + Adapter Implementations                          │
│  - Adapter store (per-domain Map)                           │
│  - createEinsteinAdapter, createActiveDataAdapter, mocks    │
│  - Each implements a domain-specific interface              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow (engagement)

```
PageViewTracker
   ↓ (calls)
ensureAdaptersInitialized(config)            // lazy init
   ↓ (registers via dynamic import)
engagementAdapterStore                       // Map<string, EngagementAdapter>
   ↓ (read by)
getEventMediator(getAllAdapters)
   ↓ (fan-out send)
EinsteinAdapter.sendEvent / ActiveDataAdapter.sendEvent
   ↓
navigator.sendBeacon → Einstein / Active Data endpoint
```

### Data Flow (product content)

```
PDP modal component (e.g. SizeGuide)
   ↓
useProductContentAdapter()
   ↓
ProductContentContext
   ↓
ProductContentProvider (lazy registers via dynamic import)
   ↓
getProductContentAdapter('default')
   ↓
ProductContentAdapter implementation (mock or merchant-supplied)
```

---

## Lazy Loading, Dynamic Import, and Bundle Size

Adapters use **lazy loading** and **dynamic imports** so that adapter code (and any heavy dependencies) are not in the initial JavaScript bundle. This keeps the first load small and fast; adapter code is fetched only when needed.

### Why Lazy Load Adapters?

- **Smaller initial bundle**: The main app chunk does not include Einstein, Active Data, or mock adapter implementations.
- **Faster first load**: Users download less JavaScript before the page becomes interactive.
- **Route- or feature-based loading**: Adapters that are only used on certain pages (e.g. product content on PDP, customer preferences on account) are loaded when the user reaches those flows.

### How Dynamic Import Works

Instead of top-level `import` (which pulls code into the main bundle), adapters use **dynamic `import()`** so the bundler emits a separate chunk that is loaded at runtime:

```ts
// ❌ Static import – adapter code is in the main bundle
import { initializeEngagementAdapters } from '@/lib/adapters/engagement/register';

// ✅ Dynamic import – adapter code is in a separate chunk, loaded when this runs
const { initializeEngagementAdapters } = await import('@/lib/adapters/engagement/register');
```

- **Engagement adapters** (Einstein, Active Data): The `@/lib/adapters/engagement/register` module is loaded only when `ensureAdaptersInitialized()` runs (e.g. when `PageViewTracker` records its first view). See `src/lib/adapters/engagement/initialize.ts`.
- **Product content adapter**: The product-content-mock module is loaded only when the Product Content provider mounts (e.g. on the PDP). Registration is done via `ensureProductContentAdapterRegistered()` in `src/lib/adapters/product-content/ensure-registered.ts`, which uses `await import('@/lib/adapters/product-content/mock')`.
- **Customer preferences adapter**: The customer-preferences-mock module is loaded only when the Customer Preferences provider mounts. Registration is done via `ensureCustomerPreferencesAdapterRegistered()` in `src/lib/adapters/customer-preferences/ensure-registered.ts`, which uses `await import('@/lib/adapters/customer-preferences/mock')`.

### Bundle Size Impact

| What | When it loads | Bundle impact |
|------|----------------|----------------|
| Engagement adapters (`@/lib/adapters/engagement/register`: Einstein, Active Data) | When `ensureAdaptersInitialized()` is first called (e.g. by `PageViewTracker`) | Separate chunk; not in initial bundle |
| Product content mock | When Product Content provider mounts (e.g. PDP) | Separate chunk; not in initial bundle |
| Customer preferences mock | When Customer Preferences provider mounts | Separate chunk; not in initial bundle |

Constants (e.g. adapter names) used by providers are kept in small shared modules (e.g. `product-content/store.ts`, `customer-preferences/store.ts`) so providers do not statically import the mock modules just to read a name; that would pull the mock into the main bundle and defeat lazy loading.

### Summary

- **Lazy loading**: Adapter code runs and is registered only when needed.
- **Dynamic import**: `await import('...')` ensures adapter modules are in separate chunks and loaded at runtime.
- **Bundle size**: Initial bundle stays smaller; adapter and mock code live in separate chunks that load on demand.

---

## Core Patterns

### 1. Adapter Pattern

**Purpose**: Convert one interface into another interface that callers expect.

```ts
// Define the interface your callers need
interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (event: AnalyticsEvent, siteInfo?: EventSiteInfo, consent?: ConsentPreferences) => Promise<unknown>;
}

// Implement adapters for different vendors
function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter {
    return {
        name: 'einstein',
        sendEvent: async (event) => {
            // Translate event → Einstein activity → POST via sendBeacon
        },
    };
}

function createActiveDataAdapter(config: ActiveDataConfig): EngagementAdapter {
    return {
        name: 'active-data',
        sendEvent: async (event) => {
            // Translate event → Active Data tracking pixel → fetch
        },
    };
}
```

### 2. Registry Pattern

**Purpose**: Central location to register and retrieve adapter instances. Each domain (engagement, product content, customer preferences) owns its own store and exposes a small functional API.

```ts
// src/lib/adapters/engagement/store.ts
import type { EngagementAdapter } from './types';

const engagementAdapterStore = new Map<string, EngagementAdapter>();

export function addAdapter(name: string, adapter: EngagementAdapter): void {
    engagementAdapterStore.set(name, adapter);
}

export function removeAdapter(name: string): void {
    engagementAdapterStore.delete(name);
}

export function getAdapter(name: string): EngagementAdapter | undefined {
    return engagementAdapterStore.get(name);
}

export function getAllAdapters(): EngagementAdapter[] {
    return Array.from(engagementAdapterStore.values());
}
```

The engagement store is intentionally type-specific (it holds `EngagementAdapter`s only). Product content and customer preferences each have their own analogous stores.

### 3. Provider Pattern (for adapters consumed by React components)

**Purpose**: Inject the adapter via React Context, with lazy async initialization. Used for product content and customer preferences. (Engagement adapters do not need a provider — they are read directly via `getAllAdapters` from non-React code paths and from `PageViewTracker`.)

```tsx
// src/providers/product-content.tsx
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { getProductContentAdapter, PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME } from '@/lib/adapters/product-content/store';
import { ensureProductContentAdapterRegistered } from '@/lib/adapters/product-content/ensure-registered';
import type { ProductContentAdapter } from '@/lib/adapters/product-content/types';
import type { AppConfig } from '@/types/config';

const ProductContentContext = createContext<ProductContentAdapter | undefined>(undefined);

export default function ProductContentProvider({
    children,
    adapterName = PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME,
}: PropsWithChildren<{ adapterName?: string }>) {
    const config = useConfig<AppConfig>();
    const [adapter, setAdapter] = useState<ProductContentAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            try {
                await ensureProductContentAdapterRegistered(config);
                setAdapter(getProductContentAdapter(adapterName));
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Failed to initialize product content adapter', error);
                }
            }
        };
        void initializeAdapter();
    }, [config, adapterName]);

    return <ProductContentContext.Provider value={adapter}>{children}</ProductContentContext.Provider>;
}

export const useProductContentAdapter = (): ProductContentAdapter | undefined =>
    useContext(ProductContentContext);
```

**Key Points**:
- Uses `useState` + `useEffect` for async initialization (not `useMemo`)
- Calls `ensureProductContentAdapterRegistered()` to lazy-load the implementation
- Returns `undefined` instead of throwing (graceful degradation — components render conditionally)
- Supports configurable `adapterName` so a merchant can ship multiple implementations

### 4. Strategy Pattern

**Purpose**: Define a family of algorithms (adapters), encapsulate each one, and make them interchangeable.

The adapter itself acts as a strategy that can be swapped at runtime based on configuration.

### 5. Factory Pattern

**Purpose**: Create adapter instances based on configuration using factory functions.

```ts
// src/lib/adapters/engagement/einstein.ts
import type { EngagementAdapter, EngagementAdapterConfig } from '@/lib/adapters';
import type { AnalyticsEvent } from '@salesforce/storefront-next-runtime/events';

export const EINSTEIN_ADAPTER_NAME = 'einstein' as const;

export type EinsteinConfig = EngagementAdapterConfig & {
    host: string;
    einsteinId: string;
    isProduction: boolean;
    realm: string;
};

export function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter {
    return {
        name: EINSTEIN_ADAPTER_NAME,
        sendEvent: async (event: AnalyticsEvent) => {
            // Translate AnalyticsEvent → Einstein activity payload, then POST via sendBeacon
        },
    };
}
```

**Key Points**:
- Uses factory functions instead of classes
- Returns object literals that implement the interface
- Configuration is passed at creation time and validated up-front

---

## Step-by-Step Implementation

### Step 1: Define Your Adapter Interface

Create a TypeScript interface that defines the methods your callers need.

**Location**: `src/lib/adapters/<domain>/types.ts`

```ts
/**
 * Generic adapter interface for [Your Feature]
 *
 * This interface defines the contract that all adapter implementations must follow.
 * Callers depend on this interface, not on concrete implementations.
 */
export interface YourFeatureAdapter {
    /**
     * Method description
     * @param params - Parameter description
     * @returns Return value description
     */
    yourMethod(params: YourParams): Promise<YourResult>;

    /** Optional method for initialization */
    initialize?(): Promise<void>;

    /** Optional method for cleanup */
    dispose?(): Promise<void>;
}

/**
 * Configuration type for your adapter
 */
export interface YourFeatureAdapterConfig {
    type: 'implementation-a' | 'implementation-b' | 'custom';
    options?: Record<string, unknown>;
}
```

**Real Example (Engagement)**:

```ts
// src/lib/adapters/engagement/types.ts
import type {
    AnalyticsEvent,
    ConsentCategory,
    ConsentPreferences,
    EventAdapter,
    EventSiteInfo,
} from '@salesforce/storefront-next-runtime/events';

export type EngagementAdapterConfig = {
    siteId?: string;
    consentCategory?: ConsentCategory;
    eventToggles: Record<AnalyticsEvent['eventType'], boolean>;
    [key: string]: unknown;
};

export interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (
        event: AnalyticsEvent,
        siteInfo?: EventSiteInfo,
        consentPreferences?: ConsentPreferences
    ) => Promise<unknown>;
    send?: (url: string, options?: RequestInit) => Promise<Response>;
}
```

### Step 2: Create the Adapter Registry

Create a per-domain store. Keep it small and functional — type-specific over generic.

**Location**: `src/lib/adapters/<domain>/store.ts`

```ts
import type { EngagementAdapter } from './types';

const engagementAdapterStore = new Map<string, EngagementAdapter>();

export function addAdapter(name: string, adapter: EngagementAdapter): void {
    engagementAdapterStore.set(name, adapter);
}

export function removeAdapter(name: string): void {
    engagementAdapterStore.delete(name);
}

export function getAdapter(name: string): EngagementAdapter | undefined {
    return engagementAdapterStore.get(name);
}

export function getAllAdapters(): EngagementAdapter[] {
    return Array.from(engagementAdapterStore.values());
}
```

### Step 3: Implement Your Adapters

Create concrete implementations of your adapter interface for each service.

**Location**: `src/lib/adapters/<domain>/<service-name>.ts`

**Factory Function Pattern (Recommended)**:

```ts
import type { YourFeatureAdapter, YourFeatureAdapterConfig } from './types';

export type ServiceNameConfig = YourFeatureAdapterConfig & {
    apiKey: string;
    baseUrl: string;
    // ... other service-specific config
};

/**
 * Create a [Service Name] adapter
 *
 * This factory function returns an object that implements YourFeatureAdapter.
 * The factory pattern allows for better testability and configuration validation.
 */
export function createServiceNameAdapter(config: ServiceNameConfig): YourFeatureAdapter {
    if (!config.apiKey || !config.baseUrl) {
        throw new Error('[ServiceNameAdapter] Missing required configuration');
    }

    return {
        async yourMethod(params) {
            try {
                const serviceParams = translateParams(params, config);
                const serviceResponse = await callServiceAPI(serviceParams, config);
                return translateResponse(serviceResponse);
            } catch (error) {
                console.error('[ServiceNameAdapter] Error in yourMethod:', error);
                return getDefaultResult();
            }
        },
    };
}

// Helper functions (can be exported for testing)
function translateParams(params: YourParams, config: ServiceNameConfig): ServiceAPIParams { /* … */ }
async function callServiceAPI(params: ServiceAPIParams, config: ServiceNameConfig): Promise<ServiceAPIResponse> { /* … */ }
function translateResponse(response: ServiceAPIResponse): YourResult { /* … */ }
function getDefaultResult(): YourResult { /* … */ }
```

**Class Pattern (Alternative)**:

```ts
export class ServiceNameAdapter implements YourFeatureAdapter {
    constructor(private config: ServiceNameConfig) {}

    async yourMethod(params: YourParams): Promise<YourResult> {
        // Same implementation as factory function
    }
}
```

**Why factory over class**: better config validation up-front, easier testing of helpers, better tree-shaking, and object literals compose more naturally with multiple interfaces.

### Step 4: Create Provider and Hook (for React-consumed adapters)

For adapters consumed by React components, create a Context provider and a hook that exposes the adapter.

**Location**: `src/providers/your-feature.tsx`

```tsx
import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { YourFeatureAdapter } from '@/lib/adapters/your-feature/types';
import { getYourFeatureAdapter, YOUR_FEATURE_DEFAULT_ADAPTER_NAME } from '@/lib/adapters/your-feature/store';
import { ensureYourFeatureAdapterRegistered } from '@/lib/adapters/your-feature/ensure-registered';
import type { AppConfig } from '@/types/config';

const YourFeatureContext = createContext<YourFeatureAdapter | undefined>(undefined);

export default function YourFeatureProvider({
    children,
    adapterName = YOUR_FEATURE_DEFAULT_ADAPTER_NAME,
}: PropsWithChildren<{ adapterName?: string }>) {
    const config = useConfig<AppConfig>();
    const [adapter, setAdapter] = useState<YourFeatureAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            try {
                await ensureYourFeatureAdapterRegistered(config);
                setAdapter(getYourFeatureAdapter(adapterName));
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('[YourFeatureProvider] Failed to initialize adapter:', error);
                }
            }
        };
        void initializeAdapter();
    }, [config, adapterName]);

    return <YourFeatureContext.Provider value={adapter}>{children}</YourFeatureContext.Provider>;
}

export const useYourFeatureAdapter = (): YourFeatureAdapter | undefined =>
    useContext(YourFeatureContext);
```

For adapters consumed from non-React code paths (or from React components that simply iterate all registered adapters), skip the provider and call `getAllAdapters()` from the store directly. This is what `PageViewTracker` does for engagement.

### Step 5: Initialize Adapters

Register adapter instances during application startup using **lazy** initialization. Code-load is dynamic so adapter modules stay out of the initial bundle.

**Location**: `src/lib/adapters/<domain>/initialize.ts` and `src/lib/adapters/<domain>/register.ts`

```ts
// src/lib/adapters/engagement/initialize.ts
import type { AppConfig } from '@/types/config';
import { getAllAdapters } from './store';

let adaptersInitializationPromise: Promise<void> | undefined;

/**
 * Ensures engagement adapters are initialized.
 *
 * Idempotent — safe to call multiple times.
 * If initialization is already in progress, returns the existing promise.
 *
 * Adapter initialization code is dynamically imported to keep it out of the initial bundle.
 */
export async function ensureAdaptersInitialized(appConfig: AppConfig): Promise<void> {
    if (getAllAdapters().length > 0) return;

    if (adaptersInitializationPromise) {
        try {
            await adaptersInitializationPromise;
            return;
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn('Failed to initialize engagement adapters:', error);
            }
            return;
        }
    }

    adaptersInitializationPromise = (async () => {
        const { initializeEngagementAdapters } = await import('@/lib/adapters/engagement/register');
        if (appConfig) initializeEngagementAdapters(appConfig);
    })().catch((error) => {
        adaptersInitializationPromise = undefined;
        if (import.meta.env.DEV) {
            console.warn('Failed to initialize engagement adapters:', error);
        }
        throw error;
    });

    try {
        await adaptersInitializationPromise;
    } catch {
        // Error already logged above
    }
}
```

**Adapter Registration**:

```ts
// src/lib/adapters/engagement/register.ts
import type { AppConfig } from '@/types/config';
import { addAdapter } from './store';
import { createEinsteinAdapter } from './einstein';
import { createActiveDataAdapter } from './active-data';

export function initializeEngagementAdapters(appConfig: AppConfig) {
    const engagementAdapterConfigs = appConfig?.engagement?.adapters;

    if (engagementAdapterConfigs?.einstein?.enabled) {
        try {
            addAdapter(
                'einstein',
                createEinsteinAdapter({
                    host: engagementAdapterConfigs.einstein.host || '',
                    einsteinId: engagementAdapterConfigs.einstein.einsteinId || '',
                    realm: engagementAdapterConfigs.einstein.realm || '',
                    siteId: engagementAdapterConfigs.einstein.siteId || '',
                    isProduction: engagementAdapterConfigs.einstein.isProduction || false,
                    eventToggles: engagementAdapterConfigs.einstein.eventToggles || {},
                })
            );
        } catch (error) {
            console.warn('Failed to initialize Einstein adapter:', (error as Error).message);
        }
    }

    if (engagementAdapterConfigs?.activeData?.enabled) {
        try {
            addAdapter(
                'active-data',
                createActiveDataAdapter({
                    host: engagementAdapterConfigs.activeData.host || '',
                    siteId: engagementAdapterConfigs.activeData.siteId || '',
                    locale: engagementAdapterConfigs.activeData.locale || appConfig.site.locale,
                    siteUUID: engagementAdapterConfigs.activeData.siteUUID || '',
                    eventToggles: engagementAdapterConfigs.activeData.eventToggles || {},
                })
            );
        } catch (error) {
            console.warn('Failed to initialize Active Data adapter:', (error as Error).message);
        }
    }
}
```

**Key Points**:
- Lazy: adapter code only loads when `ensureAdaptersInitialized` is first called
- Idempotent: safe to call multiple times
- Configuration-driven from `appConfig`
- Errors are caught and logged; initialization failures must not crash the app

### Step 6: Use the Adapter

For engagement, callers grab the mediator and dispatch:

```ts
import { ensureAdaptersInitialized } from '@/lib/adapters/engagement/initialize';
import { getAllAdapters } from '@/lib/adapters';

await ensureAdaptersInitialized(config);
const { createEvent, getEventMediator, sendViewPageEvent } =
    await import('@salesforce/storefront-next-runtime/events');

const mediator = getEventMediator(getAllAdapters);
if (!mediator) return;

const event = createEvent('view_page', { path, payload: { /* … */ } });
sendViewPageEvent(event, mediator, eventSiteInfo, consentPreferences);
```

For product content, components consume via the hook and render conditionally:

```tsx
function SizeGuideButton() {
    const adapter = useProductContentAdapter();
    if (!adapter?.getSizeGuide) return null;
    return <button onClick={() => /* call adapter.getSizeGuide(...) */}>Size guide</button>;
}
```

---

## Engagement Adapter Example

This section walks through the engagement (analytics) implementation end-to-end.

### File Structure

```
src/
├── lib/
│   └── adapters/
│       ├── index.ts                          # Re-exports engagement store + types + utils
│       └── engagement/
│           ├── types.ts                      # EngagementAdapter, EngagementAdapterConfig
│           ├── store.ts                      # add/remove/get/getAll
│           ├── initialize.ts                 # ensureAdaptersInitialized (lazy)
│           ├── register.ts                   # initializeEngagementAdapters
│           ├── einstein.ts                   # createEinsteinAdapter
│           ├── active-data.ts                # createActiveDataAdapter
│           ├── einstein-recommenders.ts      # EINSTEIN_RECOMMENDERS name constants
│           └── utils.ts                      # buildConsentPreferences, hasConsent
└── analytics/
    └── page-view-tracker.tsx                 # primary caller
```

### 1. Adapter Interface

```ts
// src/lib/adapters/engagement/types.ts
import type {
    AnalyticsEvent,
    ConsentCategory,
    ConsentPreferences,
    EventAdapter,
    EventSiteInfo,
} from '@salesforce/storefront-next-runtime/events';

export type EngagementAdapterConfig = {
    siteId?: string;
    consentCategory?: ConsentCategory;
    eventToggles: Record<AnalyticsEvent['eventType'], boolean>;
    [key: string]: unknown;
};

export interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (
        event: AnalyticsEvent,
        siteInfo?: EventSiteInfo,
        consentPreferences?: ConsentPreferences
    ) => Promise<unknown>;
    send?: (url: string, options?: RequestInit) => Promise<Response>;
}
```

### 2. Einstein Adapter Implementation

```ts
// src/lib/adapters/engagement/einstein.ts
import { hasConsent, type EngagementAdapter, type EngagementAdapterConfig } from '@/lib/adapters';
import type { AnalyticsEvent } from '@salesforce/storefront-next-runtime/events';

export const EINSTEIN_ADAPTER_NAME = 'einstein' as const;

export type EinsteinConfig = EngagementAdapterConfig & {
    host: string;
    einsteinId: string;
    isProduction: boolean;
    realm: string;
    siteId: string;
};

export function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter {
    if (!config.host || !config.einsteinId || !config.realm) {
        throw new Error('[EinsteinAdapter] Missing required configuration');
    }

    return {
        name: EINSTEIN_ADAPTER_NAME,
        sendEvent: async (event, siteInfo, consentPreferences) => {
            if (!config.eventToggles[event.eventType]) return;
            if (!hasConsent(consentPreferences, config.consentCategory)) return;

            const endpoint = mapEventTypeToEinsteinEndpoint(event.eventType);
            if (!endpoint) throw new Error('Unsupported event type in Einstein adapter');

            const activity = convertEventToEinsteinActivity(event, config.realm, config.isProduction);
            const url = `${config.host}/v3/activities/${config.realm}-${siteInfo?.siteId ?? config.siteId}/${endpoint}?clientId=${config.einsteinId}`;
            const payload = new Blob([JSON.stringify(activity)], { type: 'application/json' });
            navigator.sendBeacon(url, payload);
        },
    };
}
```

### 3. Active Data Adapter Implementation

```ts
// src/lib/adapters/engagement/active-data.ts
import { hasConsent, type EngagementAdapter, type EngagementAdapterConfig } from '@/lib/adapters';
import type { AnalyticsEvent } from '@salesforce/storefront-next-runtime/events';

export type ActiveDataConfig = EngagementAdapterConfig & {
    host: string;
    siteId: string;
    locale: string;
    siteUUID?: string;
    sourceCode?: string;
    siteCurrency?: string;
};

export function createActiveDataAdapter(config: ActiveDataConfig): EngagementAdapter {
    if (!config.host || !config.siteId) {
        throw new Error('[ActiveDataAdapter] Missing required configuration');
    }

    return {
        name: 'active-data',
        sendEvent: async (event, _siteInfo, consentPreferences) => {
            if (!config.eventToggles[event.eventType]) return;
            if (!hasConsent(consentPreferences, config.consentCategory)) return;
            // …translate event → Active Data tracking pixel; fire via fetch or sendBeacon…
        },
    };
}
```

### 4. Caller (PageViewTracker)

The engagement domain has no provider; callers ask the store directly.

```tsx
// src/analytics/page-view-tracker.tsx (excerpt)
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { useAuth } from '@/providers/auth';
import { useTrackingConsent } from '@/hooks/use-tracking-consent';
import { ensureAdaptersInitialized } from '@/lib/adapters/engagement/initialize';
import { getAllAdapters, buildConsentPreferences } from '@/lib/adapters';
import type { AppConfig } from '@/types/config';

export function PageViewTracker() {
    const location = useLocation();
    const config = useConfig<AppConfig>();
    const auth = useAuth();
    const { trackingConsent, isTrackingConsentEnabled } = useTrackingConsent();
    const { site, language } = useSite();

    useEffect(() => {
        if (typeof window === 'undefined' || auth === undefined) return;

        const consentPreferences = buildConsentPreferences(
            trackingConsent,
            config.engagement.analytics.trackingConsent?.consentCategories ?? [],
            isTrackingConsentEnabled
        );
        if (!consentPreferences || consentPreferences.length === 0) return;

        const trackPageView = async () => {
            await ensureAdaptersInitialized(config);
            const { createEvent, getEventMediator, sendViewPageEvent } =
                await import('@salesforce/storefront-next-runtime/events');

            const mediator = getEventMediator(getAllAdapters);
            if (!mediator) return;

            const event = createEvent('view_page', {
                path: location.pathname,
                payload: { userType: auth.userType ?? 'guest', encUserId: auth.encUserId, usid: auth.usid },
            });
            sendViewPageEvent(event, mediator, { siteId: site.id, localeId: language }, consentPreferences);
        };

        void trackPageView();
    }, [/* … */]);

    return null;
}
```

### 5. Configuration

```ts
// appConfig structure
{
    engagement: {
        adapters: {
            einstein: {
                enabled: true,
                host: 'https://api.cquotient.com',
                einsteinId: 'your-einstein-id',
                realm: 'your-realm',
                siteId: 'your-site-id',
                isProduction: true,
                eventToggles: {
                    view_page: true,
                    view_product: true,
                    view_search: true,
                    view_category: true,
                    view_recommender: true,
                    click_product_in_category: true,
                    click_product_in_search: true,
                    click_product_in_recommender: true,
                    cart_item_add: true,
                    checkout_start: true,
                    checkout_step: true,
                    view_search_suggestion: true,
                    click_search_suggestion: true,
                    wishlist_item_added: true,
                    wishlist_item_removed: true,
                    wishlist_viewed: true,
                    wishlist_item_merged: true,
                    wishlist_merged: true,
                },
            },
            activeData: {
                enabled: false,
                host: 'https://your-activedata-host.com',
                siteId: 'your-site-id',
                locale: 'en-GB',
                siteUUID: 'your-site-uuid',
                eventToggles: { /* … */ },
            },
        },
    },
}
```

#### Multi-Site Considerations

Engagement adapters are initialized once at application startup with static configuration. In a site-context storefront, the current site and locale are passed dynamically at **event-send time** via `EventSiteInfo` (resolved from the site context middleware context). See [Site Context: Engagement Data](./README-MULTI-SITE.md#engagement-data--site-context) for how site context flows to adapters.

#### Environment Variable Overrides

Most engagement adapter settings are **protected paths** — they cannot be overridden via `PUBLIC__` environment variables at runtime. Attempting to set `PUBLIC__app__engagement__adapters__einstein__*` or `PUBLIC__app__engagement__adapters__dataCloud__*` will throw an error. To change these values, update `config.server.ts` and rebuild.

The exceptions are Active Data's `host` and `siteUUID`, which **can** be overridden via environment variables:

```bash
PUBLIC__app__engagement__adapters__activeData__host=https://your-host.commercecloud.salesforce.com
PUBLIC__app__engagement__adapters__activeData__siteUUID=your-site-uuid
```

This allows deploying the same build to different environments that point to different B2C Commerce instances without rebuilding.

---

## Code Templates

### Complete Adapter Implementation Template (Factory Function)

```ts
// src/lib/adapters/<domain>/<service-name>.ts
import type { YourAdapter, YourAdapterConfig } from './types';

export type ServiceNameConfig = YourAdapterConfig & {
    apiKey: string;
    baseUrl: string;
    // ... other service-specific config
};

export function createServiceNameAdapter(config: ServiceNameConfig): YourAdapter {
    if (!config.apiKey || !config.baseUrl) {
        throw new Error('[ServiceNameAdapter] Missing required configuration');
    }

    return {
        async yourMethod(params) {
            try {
                const serviceParams = transformInput(params, config);
                const serviceResponse = await callServiceAPI(serviceParams, config);
                return transformOutput(serviceResponse);
            } catch (error) {
                console.error('[ServiceNameAdapter] Error:', error);
                return getDefaultResult();
            }
        },
    };
}

function transformInput(params: YourParams, config: ServiceNameConfig): ServiceParams { /* … */ }

async function callServiceAPI(params: ServiceParams, config: ServiceNameConfig): Promise<ServiceResponse> {
    const response = await fetch(`${config.baseUrl}/api/endpoint`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`Service API error: ${response.status}`);
    return await response.json();
}

function transformOutput(response: ServiceResponse): YourResult { /* … */ }
function getDefaultResult(): YourResult { /* … */ }
```

### Provider Template

```tsx
// src/providers/your-feature.tsx
import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { YourAdapter } from '@/lib/adapters/your-feature/types';
import { getYourFeatureAdapter, YOUR_FEATURE_DEFAULT_ADAPTER_NAME } from '@/lib/adapters/your-feature/store';
import { ensureYourFeatureAdapterRegistered } from '@/lib/adapters/your-feature/ensure-registered';
import type { AppConfig } from '@/types/config';

const YourFeatureContext = createContext<YourAdapter | undefined>(undefined);

export default function YourFeatureProvider({
    children,
    adapterName = YOUR_FEATURE_DEFAULT_ADAPTER_NAME,
}: PropsWithChildren<{ adapterName?: string }>) {
    const config = useConfig<AppConfig>();
    const [adapter, setAdapter] = useState<YourAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            try {
                await ensureYourFeatureAdapterRegistered(config);
                setAdapter(getYourFeatureAdapter(adapterName));
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('[YourFeatureProvider] Failed to initialize adapter:', error);
                }
            }
        };
        void initializeAdapter();
    }, [config, adapterName]);

    return <YourFeatureContext.Provider value={adapter}>{children}</YourFeatureContext.Provider>;
}

export const useYourFeatureAdapter = (): YourAdapter | undefined =>
    useContext(YourFeatureContext);
```

### Component Template (using the adapter hook)

```tsx
// src/components/your-component/index.tsx
import { useEffect, useState } from 'react';
import { useYourFeatureAdapter } from '@/providers/your-feature';
import type { YourParams, YourResult } from '@/lib/adapters/your-feature/types';

export function YourComponent({ params }: { params: YourParams }) {
    const adapter = useYourFeatureAdapter();
    const [data, setData] = useState<YourResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!adapter) return;
        let cancelled = false;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const result = await adapter.yourMethod(params);
                if (!cancelled) setData(result);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [adapter, params]);

    if (!adapter) return null;
    if (loading) return <div>Loading…</div>;
    if (error) return null;
    if (!data) return null;

    return <div>{/* render data */}</div>;
}
```

---

## Testing Strategies

### 1. Mock Adapter for Tests

Create a mock adapter that implements your interface for testing.

```ts
// src/lib/adapters/your-feature/__mocks__/mock-adapter.ts
import type { YourAdapter, YourParams, YourResult } from '../types';

export function createMockAdapter(mockData: YourResult): YourAdapter & { calls: YourParams[] } {
    const calls: YourParams[] = [];
    return {
        calls,
        async yourMethod(params) {
            calls.push(params);
            return mockData;
        },
    };
}
```

### 2. Component Tests with Mock Adapter

```tsx
// src/components/your-component/index.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { YourComponent } from './index';
import YourFeatureProvider from '@/providers/your-feature';
import { addAdapter } from '@/lib/adapters/your-feature/store';
import { createMockAdapter } from '@/lib/adapters/your-feature/__mocks__/mock-adapter';

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => ({ yourFeature: { adapter: { enabled: true } } }),
}));

describe('YourComponent', () => {
    beforeEach(() => {
        addAdapter('default', createMockAdapter({ /* mock result */ }));
    });

    it('renders data from adapter', async () => {
        render(
            <YourFeatureProvider>
                <YourComponent params={{ /* … */ }} />
            </YourFeatureProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Expected Content')).toBeInTheDocument();
        });
    });
});
```

### 3. Adapter Implementation Tests

```ts
// src/lib/adapters/engagement/einstein.test.ts (excerpt)
import { describe, it, expect, beforeEach } from 'vitest';
import { createEinsteinAdapter, type EinsteinConfig } from './einstein';
import type { EngagementAdapter } from '@/lib/adapters';

describe('EinsteinAdapter', () => {
    let adapter: EngagementAdapter;
    let config: EinsteinConfig;

    beforeEach(() => {
        config = {
            host: 'https://api.test.com',
            einsteinId: 'test-id',
            realm: 'test-realm',
            siteId: 'test-site',
            isProduction: false,
            eventToggles: { view_page: true /* … */ } as never,
        };
        adapter = createEinsteinAdapter(config);
    });

    it('creates adapter with valid config', () => {
        expect(adapter.name).toBe('einstein');
    });

    it('throws with invalid config', () => {
        expect(() => createEinsteinAdapter({ ...config, host: '' })).toThrow(/Missing required configuration/);
    });
});
```

---

## Best Practices

### 1. Interface Design

✅ **DO:**
- Keep interfaces focused and cohesive
- Use descriptive method names
- Include JSDoc comments
- Design for the consumer (caller), not the implementation
- Make interfaces async by default (Promise return types)

❌ **DON'T:**
- Create "god interfaces" with too many methods
- Expose implementation details
- Use implementation-specific types in interfaces
- Make breaking changes to interfaces without versioning

```ts
// ✅ Good - focused interface
interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (event: AnalyticsEvent) => Promise<unknown>;
}

// ❌ Bad - mixed concerns
interface EngagementAdapter {
    sendEvent: (event: AnalyticsEvent) => Promise<unknown>;
    fetchEinsteinToken(): Promise<string>; // Implementation detail
    updateBasket(basket: Basket): void;    // Unrelated concern
}
```

### 2. Error Handling

✅ **DO:**
- Return empty/default values for non-critical failures
- Log errors with context
- Provide fallback behavior
- Use specific error types

❌ **DON'T:**
- Let adapter errors crash the UI
- Swallow errors silently
- Expose internal error details to users

```ts
// ✅ Good - graceful degradation
async yourMethod(params: YourParams): Promise<YourResult> {
    try {
        return await this.callAPI(params);
    } catch (error) {
        console.error('[Adapter] Failed:', error);
        return getDefaultResult();
    }
}

// ❌ Bad - throws and breaks UI
async yourMethod(params: YourParams): Promise<YourResult> {
    return this.callAPI(params); // Throws on error
}
```

### 3. Lazy Initialization

✅ **DO:**
- Use `useState` + `useEffect` for async initialization
- Use `ensureAdaptersInitialized()` (or the per-domain equivalent) for lazy loading
- Initialize adapters once at app startup
- Cache adapter instances with idempotent initialization

❌ **DON'T:**
- Use `useMemo` for async operations (it can't be awaited)
- Create adapter instances in render
- Load adapters on every context read
- Initialize in component effects without proper guards

```tsx
// ✅ Good - async lazy load with useState + useEffect
export default function YourFeatureProvider({ children }: PropsWithChildren) {
    const config = useConfig<AppConfig>();
    const [adapter, setAdapter] = useState<YourAdapter | undefined>(undefined);

    useEffect(() => {
        (async () => {
            try {
                await ensureYourFeatureAdapterRegistered(config);
                setAdapter(getYourFeatureAdapter('default'));
            } catch (error) {
                if (import.meta.env.DEV) console.warn('Failed to initialize adapter:', error);
            }
        })();
    }, [config]);

    return <Context.Provider value={adapter}>{children}</Context.Provider>;
}

// ❌ Bad - useMemo can't await
export default function YourFeatureProvider({ children }: PropsWithChildren) {
    const adapter = useMemo(() => getYourFeatureAdapter('default'), []);
    return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
```

### 4. Type Safety

✅ **DO:**
- Use TypeScript interfaces for all adapters
- Type context providers properly
- Cast only at registry boundaries where necessary

❌ **DON'T:**
- Use `any` types
- Cast without validation
- Skip type definitions

### 5. Adapter Isolation

✅ **DO:**
- Keep adapters independent of each other
- Use dependency injection for shared dependencies
- Make adapters stateless when possible

❌ **DON'T:**
- Import other adapters directly
- Share global state between adapters
- Create tight coupling between adapters

### 6. Configuration

✅ **DO:**
- Use `appConfig` for configuration
- Validate configuration at startup
- Provide sensible defaults
- Document all config options
- Use configuration-driven initialization

❌ **DON'T:**
- Hardcode adapter selection
- Load config in components
- Use config without validation
- Rely solely on environment variables

```ts
// ✅ Good - configuration-driven with validation
export function initializeEngagementAdapters(appConfig: AppConfig) {
    const cfg = appConfig?.engagement?.adapters;

    if (cfg?.einstein?.enabled) {
        if (!cfg.einstein.host || !cfg.einstein.einsteinId) {
            throw new Error('[EinsteinAdapter] Missing required configuration');
        }
        try {
            addAdapter('einstein', createEinsteinAdapter({ /* … */ }));
        } catch (error) {
            console.warn('Failed to initialize Einstein adapter:', (error as Error).message);
        }
    }
}

// ❌ Bad - no validation, hardcoded values
function initializeAdapters() {
    addAdapter('einstein', createEinsteinAdapter({
        host: 'https://api.example.com',
        einsteinId: 'test-id',
    } as never));
}
```

### 7. Documentation

✅ **DO:**
- Document adapter interfaces with JSDoc
- Provide usage examples
- Document error scenarios
- Keep this guide up to date when adding adapters

❌ **DON'T:**
- Leave interfaces undocumented
- Skip example code
- Forget to update docs when changing interfaces

---

## Common Pitfalls

### 1. Creating Adapters in Render

**Problem**: Creating adapter instances during component render causes unnecessary re-creation.

```tsx
// ❌ Bad - creates new instance on every render
function YourComponent() {
    const adapter = createServiceAdapter({ /* … */ }); // Don't do this!
}
```

**Solution**: Register the adapter in the store at app initialization, then read it via the provider/hook.

### 2. Not Handling Adapter Absence

**Problem**: Assuming the adapter is always available leads to runtime errors.

```ts
// ❌ Bad - crashes if adapter not registered
export function useYourFeature() {
    return useContext(YourFeatureContext)!; // Unsafe!
}
```

**Solution**: Return `undefined` for graceful degradation. Components check and render conditionally.

```ts
// ✅ Good - graceful degradation (recommended)
export function useYourFeatureAdapter(): YourAdapter | undefined {
    return useContext(YourFeatureContext);
}
```

### 3. Leaking Implementation Details

**Problem**: Exposing service-specific details in the interface.

```ts
// ❌ Bad - exposes Einstein-specific shape
interface EngagementAdapter {
    sendEinsteinActivity(activity: EinsteinActivity): Promise<unknown>;
}
```

**Solution**: Use generic, implementation-agnostic interfaces.

```ts
// ✅ Good - generic interface
interface EngagementAdapter {
    sendEvent?: (event: AnalyticsEvent) => Promise<unknown>;
}
```

### 4. Forgetting to Register Adapters

**Problem**: Using hooks before adapters are registered causes silent no-ops or errors.

**Solution**: Use lazy initialization (`ensureAdaptersInitialized`) which the provider calls automatically.

### 5. Not Handling Async Errors

**Problem**: Letting adapter errors propagate to UI causes crashes.

```ts
// ❌ Bad - errors crash the UI
async yourMethod(params: YourParams): Promise<YourResult> {
    const response = await fetch(url); // Throws on network error
    return response.json();
}
```

**Solution**: Catch and handle errors gracefully.

```ts
// ✅ Good - handles errors
async yourMethod(params: YourParams): Promise<YourResult> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('[Adapter] Error:', error);
        return getDefaultResult();
    }
}
```

### 6. Tight Coupling Between Adapters

**Problem**: One adapter directly importing another creates tight coupling.

```ts
// ❌ Bad - tight coupling
import { createEinsteinAdapter } from './einstein';

class CompositeAdapter {
    private einstein = createEinsteinAdapter({ /* … */ });
}
```

**Solution**: Use dependency injection.

```ts
// ✅ Good - dependency injection
class CompositeAdapter implements EngagementAdapter {
    constructor(private primary: EngagementAdapter, private fallback: EngagementAdapter) {}
}
```

### 7. Missing Type Guards

**Problem**: Not validating adapter responses can cause runtime errors.

```ts
// ❌ Bad - assumes response shape
async yourMethod(params): Promise<Result[]> {
    const response = await this.api.call();
    return response.hits.map((hit) => ({ id: hit.id })); // crashes if hits is undefined
}
```

**Solution**: Validate and provide defaults.

```ts
// ✅ Good - validates response
async yourMethod(params): Promise<Result[]> {
    const response = await this.api.call();
    return (response?.hits ?? []).map((hit) => ({ id: hit?.id ?? '' }));
}
```

---

## Configuration Reference

### Configuration Structure

Configuration is driven by the `appConfig` object, typically loaded from environment variables or configuration files:

```ts
// appConfig structure
{
    engagement: {
        adapters: {
            einstein: {
                enabled: true,
                host: 'https://api.cquotient.com',
                einsteinId: 'your-einstein-id',
                realm: 'your-realm',
                siteId: 'your-site-id',
                isProduction: true,
                eventToggles: { /* per-event-type booleans */ },
            },
            activeData: {
                enabled: false,
                host: 'https://your-activedata-host.com',
                siteId: 'your-site-id',
                locale: 'en-GB',
                siteUUID: 'your-site-uuid',
                sourceCode: 'your-source-code',
                siteCurrency: 'USD',
                eventToggles: { /* per-event-type booleans */ },
            },
        },
    },
}
```

### Environment Variables (Optional)

While configuration is primarily driven by `appConfig`, you can populate it from environment variables:

```bash
# Einstein Configuration
EINSTEIN_HOST=https://api.cquotient.com
EINSTEIN_ID=your-einstein-id
EINSTEIN_REALM=your-realm
EINSTEIN_SITE_ID=your-site-id
EINSTEIN_IS_PRODUCTION=true

# Active Data Configuration (optional)
ACTIVE_DATA_HOST=https://your-activedata-host.com
ACTIVE_DATA_SITE_ID=your-site-id
ACTIVE_DATA_LOCALE=en-GB
ACTIVE_DATA_SITE_UUID=your-site-uuid
```

### Initialization Flow (engagement)

Adapters are initialized lazily when first needed:

1. `PageViewTracker` (or any other engagement caller) calls `ensureAdaptersInitialized(config)`
2. The function checks if adapters are already initialized (idempotent)
3. If not initialized, it dynamically imports `initializeEngagementAdapters` from `@/lib/adapters/engagement/register`
4. `initializeEngagementAdapters` reads from `appConfig.engagement.adapters`
5. Creates adapters using factory functions (`createEinsteinAdapter`, `createActiveDataAdapter`)
6. Registers adapters in the engagement store using `addAdapter()`
7. The caller retrieves all adapters via `getAllAdapters()` and dispatches through the event mediator

---

## Advanced Topics

### Multiple Adapter Instances

You can register multiple instances of the same interface for different use cases (e.g. one Active Data instance per region). Pick distinct names when registering:

```ts
addAdapter('active-data:us', createActiveDataAdapter({ /* US config */ }));
addAdapter('active-data:eu', createActiveDataAdapter({ /* EU config */ }));
```

`getAllAdapters()` returns all registered instances; consumers that want only one of them should look up by name with `getAdapter(name)`.

### Composite Adapters

Combine multiple adapters to create fallback chains or aggregated results:

```ts
function createCompositeAdapter(primary: EngagementAdapter, fallback: EngagementAdapter): EngagementAdapter {
    return {
        name: 'composite',
        sendEvent: async (event, siteInfo, consent) => {
            try {
                return await primary.sendEvent?.(event, siteInfo, consent);
            } catch (error) {
                console.warn('[Composite] Primary failed, using fallback');
                return fallback.sendEvent?.(event, siteInfo, consent);
            }
        },
    };
}
```

### Adapter Middleware

Add cross-cutting concerns like logging, caching, or analytics by wrapping an adapter:

```ts
function withLogging(wrapped: EngagementAdapter): EngagementAdapter {
    return {
        ...wrapped,
        name: `${wrapped.name}:logged`,
        sendEvent: async (event, siteInfo, consent) => {
            const start = Date.now();
            try {
                const result = await wrapped.sendEvent?.(event, siteInfo, consent);
                console.log(`[${wrapped.name}] sent ${event.eventType} in ${Date.now() - start}ms`);
                return result;
            } catch (error) {
                console.error(`[${wrapped.name}] error:`, error);
                throw error;
            }
        },
    };
}

addAdapter('einstein', withLogging(createEinsteinAdapter(config)));
```

---

## Summary

The adapter pattern provides:

1. **Decoupling**: Callers don't depend on specific vendor SDKs
2. **Testability**: Easy to mock and test in isolation
3. **Flexibility**: Swap implementations without code changes
4. **Maintainability**: Vendor-side changes don't ripple into callers

### Key Takeaways

- Define clean, focused interfaces
- Use a per-domain functional store (`engagement`, `product-content`, `customer-preferences`)
- Provide adapters via React Context with async initialization (when consumed by React)
- Use `useState` + `useEffect` for async init (not `useMemo`)
- Use factory functions for adapter creation (preferred over classes)
- Lazy-load adapters with `ensureAdaptersInitialized()` (or the per-domain equivalent) and dynamic imports
- Return `undefined` for graceful degradation instead of throwing
- Handle errors gracefully with default values
- Use configuration-driven initialization from `appConfig`
- Validate configuration at startup
- For server-rendered data (recommendations, etc.), prefer a `*.server.ts` orchestrator + route loader over an adapter

### Next Steps

1. Identify features that benefit from adapters (the "in-browser, multi-vendor, per-merchant" rule of thumb)
2. Define your adapter interface
3. Implement your first adapter using a factory function
4. Create a per-domain store
5. Create a provider with async initialization (if consumed by React)
6. Register the adapter via a `register.ts` module that's dynamically imported
7. Use `getAllAdapters()` (engagement-style) or the hook (provider-style) in callers
8. Write tests with mock adapters

---

## Additional Resources

- [Engagement adapters](../src/lib/adapters/engagement/) — Einstein and Active Data
- [Product content adapter](../src/lib/adapters/product-content/) — PDP modal content
- [PageViewTracker](../src/analytics/page-view-tracker.tsx) — primary engagement caller
- [Server-rendered recommendations orchestrator](../src/lib/product/recommendations.server.ts)
- [Recommendations BFF route](../src/routes/resource.recommendations.ts)
- [Product Recommendations component (loader)](../src/components/product-recommendations/loader.ts)
- [Data fetching guide](./README-DATA.md)
- [Page Designer guide](./README-PAGE-DESIGNER.md)
