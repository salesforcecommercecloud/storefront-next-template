# Adapter Pattern Implementation Guide

> A comprehensive guide for implementing the adapter pattern in your components, based on the product recommendations system.

## Table of Contents

1. [Introduction](#introduction)
2. [Why Use Adapters?](#why-use-adapters)
3. [Architecture Overview](#architecture-overview)
4. [Lazy Loading, Dynamic Import, and Bundle Size](#lazy-loading-dynamic-import-and-bundle-size)
5. [Core Patterns](#core-patterns)
6. [Step-by-Step Implementation](#step-by-step-implementation)
7. [Product Recommendations Example](#product-recommendations-example)
8. [Code Templates](#code-templates)
9. [Testing Strategies](#testing-strategies)
10. [Best Practices](#best-practices)
11. [Common Pitfalls](#common-pitfalls)
12. [Configuration Reference](#configuration-reference)

---

## Introduction

The **Adapter Pattern** is a structural design pattern that allows objects with incompatible interfaces to work together. In this application, adapters provide a unified interface for swappable third-party service implementations (Einstein, Active Data, custom solutions, etc.).

### What Problem Does It Solve?

Without adapters, your components would be tightly coupled to specific service implementations:

```tsx
// ❌ Tight coupling - hard to swap services
import { EinsteinAPI } from '@/lib/einstein';

function ProductRecommendations() {
    const recommendations = EinsteinAPI.getRecommendations();
    // Component is locked to Einstein
}
```

With adapters, components depend on interfaces, not concrete implementations:

```tsx
// ✅ Loose coupling - easy to swap services
import { useRecommenders } from '@/hooks/use-recommenders';

function ProductRecommendations() {
    const { getRecommendations } = useRecommenders();
    // Component works with any adapter (Einstein, Active Data, etc.)
}
```

---

## Why Use Adapters?

### Benefits

1. **Swappable Implementations**: Switch between Einstein, Active Data, or custom services without changing component code
2. **Testability**: Mock adapters easily in tests without complex service mocking
3. **Vendor Independence**: Not locked into a single vendor's API
4. **Progressive Enhancement**: Start with a simple implementation, upgrade to advanced services later
5. **Configuration-Driven**: Change behavior via configuration, not code changes
6. **Multiple Instances**: Run different adapters simultaneously (A/B testing, fallbacks)

### Use Cases

- **Product Recommendations**: Einstein, Active Data, rule-based engines
- **Payment Processing**: Stripe, PayPal, Apple Pay
- **Analytics**: Google Analytics, Adobe Analytics, custom tracking
- **Search**: Elasticsearch, Algolia, native search
- **Shipping**: FedEx, UPS, USPS
- **Authentication**: OAuth providers (Google, Facebook, Auth0)

---

## Architecture Overview

The adapter pattern in this application consists of four key layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     1. Component Layer                       │
│  (ProductRecommendations, Payment, Analytics, etc.)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     2. Hook Layer                            │
│  (useRecommenders, usePayment, useAnalytics)                │
│  - Consumes context from provider                           │
│  - Provides clean API to components                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     3. Provider Layer                        │
│  (RecommendersProvider, PaymentProvider)                    │
│  - Lazy-loads adapter from registry                         │
│  - Manages adapter lifecycle                                │
│  - Provides context to hooks                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     4. Adapter Layer                         │
│  Registry + Adapter Implementations                          │
│  - AdapterStore (global registry)                           │
│  - EinsteinAdapter, ActiveDataAdapter, etc.                 │
│  - Implements common interface                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Component
   ↓ (calls)
Hook (useRecommenders)
   ↓ (reads from)
Context (RecommendersContext)
   ↓ (provides)
Provider (RecommendersProvider)
   ↓ (fetches from)
Registry (AdapterStore)
   ↓ (returns)
Adapter Instance (EinsteinAdapter)
   ↓ (calls)
External API (Einstein SCAPI)
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

```typescript
// ❌ Static import – adapter code is in the main bundle
import { initializeEngagementAdapters } from '@/adapters';

// ✅ Dynamic import – adapter code is in a separate chunk, loaded when this runs
const { initializeEngagementAdapters } = await import('@/adapters');
```

- **Engagement adapters** (Einstein, Active Data): The `@/adapters` module is loaded only when `ensureAdaptersInitialized()` runs (e.g. when a provider that needs engagement adapters first mounts). See `src/lib/adapters/initialize-adapters.ts`.
- **Product content adapter**: The product-content-mock module is loaded only when the Product Content provider mounts (e.g. on the PDP). Registration is done via `ensureProductContentAdapterRegistered()` in `src/lib/adapters/ensure-product-content-adapter.ts`, which uses `await import('@/adapters/product-content-mock')`.
- **Customer preferences adapter**: The customer-preferences-mock module is loaded only when the Customer Preferences provider mounts. Registration is done via `ensureCustomerPreferencesAdapterRegistered()` in `src/lib/adapters/ensure-customer-preferences-adapter.ts`, which uses `await import('@/adapters/customer-preferences-mock')`.

### Bundle Size Impact

| What | When it loads | Bundle impact |
|------|----------------|----------------|
| Engagement adapters (`@/adapters`: Einstein, Active Data) | When `ensureAdaptersInitialized()` is first called (e.g. by a provider that uses engagement adapters) | Separate chunk; not in initial bundle |
| Product content mock | When Product Content provider mounts (e.g. PDP) | Separate chunk; not in initial bundle |
| Customer preferences mock | When Customer Preferences provider mounts | Separate chunk; not in initial bundle |

Constants (e.g. adapter names) used by providers are kept in small shared modules (e.g. `product-content-store.ts`, `customer-preferences-store.ts`) so providers do not statically import the mock modules just to read a name; that would pull the mock into the main bundle and defeat lazy loading.

### Summary

- **Lazy loading**: Adapter code runs and is registered only when needed (when the corresponding provider or initialization runs).
- **Dynamic import**: `await import('...')` ensures adapter modules are in separate chunks and loaded at runtime.
- **Bundle size**: Initial bundle stays smaller; adapter and mock code live in separate chunks that load on demand.

---

## Core Patterns

### 1. Adapter Pattern

**Purpose**: Convert one interface into another interface that clients expect.

```typescript
// Define the interface your components need
interface RecommendersAdapter {
    getRecommendations(context: RecommenderContext): Promise<Product[]>;
}

// Implement adapters for different services
class EinsteinAdapter implements RecommendersAdapter {
    async getRecommendations(context: RecommenderContext): Promise<Product[]> {
        // Translate to Einstein API format
        const einsteinData = await einsteinAPI.recommend(context.recommenderType);
        // Translate Einstein response to your interface
        return transformEinsteinProducts(einsteinData);
    }
}

class ActiveDataAdapter implements RecommendersAdapter {
    async getRecommendations(context: RecommenderContext): Promise<Product[]> {
        // Translate to Active Data API format
        const activeDataResponse = await activeDataAPI.getRecommendations(context);
        // Translate Active Data response to your interface
        return transformActiveDataProducts(activeDataResponse);
    }
}
```

### 2. Registry Pattern

**Purpose**: Central location to register and retrieve adapter instances.

```typescript
// src/lib/adapters/adapter-store.ts
import type { EngagementAdapter } from './types';

// Global engagement adapter store
// The main purpose of this store is to store the instances of adapters that were created
const engagementAdapterStore = new Map<string, EngagementAdapter>();

/**
 * Add an engagement adapter to the adapter store
 */
export function addAdapter(name: string, adapter: EngagementAdapter): void {
    engagementAdapterStore.set(name, adapter);
}

/**
 * Remove an engagement adapter from the adapter store
 */
export function removeAdapter(name: string): void {
    engagementAdapterStore.delete(name);
}

/**
 * Get an engagement adapter from the adapter store
 */
export function getAdapter(name: string): EngagementAdapter | undefined {
    return engagementAdapterStore.get(name);
}

/**
 * Get all engagement adapters from the adapter store
 */
export function getAllAdapters(): EngagementAdapter[] {
    return Array.from(engagementAdapterStore.values());
}
```

**Note**: The current implementation uses a functional API with a type-specific store for `EngagementAdapter`. For a more generic approach that supports multiple adapter types, you could extend this pattern with a generic class-based store.

### 3. Provider Pattern

**Purpose**: Inject dependencies via React Context, enabling lazy async initialization.

```typescript
// src/providers/recommenders.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAdapter } from '@/lib/adapters';
import { ensureAdaptersInitialized } from '@/lib/adapters/initialize-adapters';
import { useConfig } from '@/config';
import type { RecommendersAdapter } from '@/hooks/recommenders/use-recommenders';

const RecommendersContext = createContext<RecommendersAdapter | undefined>(undefined);

type RecommendersProviderProps = {
    children: ReactNode;
    adapterName?: string;
};

export function RecommendersProvider({ 
    children, 
    adapterName = 'einstein' 
}: RecommendersProviderProps) {
    const config = useConfig();
    const [adapter, setAdapter] = useState<RecommendersAdapter | undefined>(undefined);

    useEffect(() => {
        // Ensure adapters are initialized before trying to get the adapter
        const initializeAdapter = async () => {
            try {
                await ensureAdaptersInitialized(config);
                // Get the adapter from the global registry after initialization
                const initializedAdapter = getAdapter(adapterName) as RecommendersAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                // Silently handle initialization errors - recommendations will simply not display
                if (import.meta.env.DEV) {
                    console.warn('Failed to initialize recommenders adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return (
        <RecommendersContext.Provider value={adapter}>
            {children}
        </RecommendersContext.Provider>
    );
}

/**
 * Hook to access the recommenders adapter from context
 * @returns The recommenders adapter, or undefined if not yet initialized or not available
 * Note: Returns undefined during async initialization. Components should handle this gracefully.
 */
export function useRecommendersAdapter(): RecommendersAdapter | undefined {
    const adapter = useContext(RecommendersContext);
    // Return undefined if adapter is not yet initialized - this is expected during async initialization
    // Components using this hook should check for undefined and handle gracefully
    return adapter;
}
```

**Key Points**:
- Uses `useState` + `useEffect` for async initialization (not `useMemo`)
- Calls `ensureAdaptersInitialized()` to lazy-load adapters
- Returns `undefined` instead of throwing errors (graceful degradation)
- Supports configurable `adapterName` prop

### 4. Strategy Pattern

**Purpose**: Define a family of algorithms (adapters), encapsulate each one, and make them interchangeable.

The adapter itself acts as a strategy that can be swapped at runtime based on configuration.

### 5. Factory Pattern

**Purpose**: Create adapter instances based on configuration using factory functions.

```typescript
// src/adapters/einstein.ts
import type { EngagementAdapter, EngagementAdapterConfig } from '@/lib/adapters';
import type { RecommendersAdapter } from '@/hooks/recommenders/use-recommenders';

export type EinsteinConfig = EngagementAdapterConfig & {
    host: string;
    einsteinId: string;
    isProduction: boolean;
    realm: string;
};

/**
 * Create an Einstein adapter that implements both EngagementAdapter and RecommendersAdapter interfaces
 */
export function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter & RecommendersAdapter {
    return {
        name: 'einstein',
        
        // EngagementAdapter methods
        sendEvent: async (event: AnalyticsEvent) => {
            // Implementation for sending events
        },
        
        // RecommendersAdapter methods
        getRecommenders: async () => {
            // Implementation for getting recommenders
        },
        getRecommendations: async (recommenderName, products, args) => {
            // Implementation for getting recommendations
        },
        getZoneRecommendations: async (zoneName, products, args) => {
            // Implementation for zone recommendations
        },
    };
}
```

**Key Points**:
- Uses factory functions instead of classes
- Returns object literals that implement interfaces
- Single adapter can implement multiple interfaces
- Configuration is passed at creation time

---

## Step-by-Step Implementation

### Step 1: Define Your Adapter Interface

Create a TypeScript interface that defines the methods your components need.

**Location**: `src/lib/adapters/types.ts`

```typescript
/**
 * Generic adapter interface for [Your Feature]
 *
 * This interface defines the contract that all adapter implementations must follow.
 * Components depend on this interface, not on concrete implementations.
 */
export interface YourFeatureAdapter {
    /**
     * Method description
     * @param params - Parameter description
     * @returns Return value description
     */
    yourMethod(params: YourParams): Promise<YourResult>;

    /**
     * Optional method for initialization
     */
    initialize?(): Promise<void>;

    /**
     * Optional method for cleanup
     */
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

**Real Example (Product Recommendations)**:

```typescript
// src/lib/adapters/types.ts
import type { AnalyticsEvent, EventAdapter } from '@salesforce/storefront-next-runtime/events';

/**
 * Configuration for adapters
 */
export type EngagementAdapterConfig = {
    siteId: string;
    eventToggles: Record<AnalyticsEvent['eventType'], boolean>;
    [key: string]: any;
};

/**
 * Interface for engagement adapters
 */
export interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (event: AnalyticsEvent) => Promise<unknown>;
    send?: (url: string, options?: RequestInit) => Promise<Response>;
}

// src/hooks/recommenders/use-recommenders.ts
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Union type for products from either Shopper Products API or Shopper Search API
 */
export type Product = ShopperProducts.schemas['Product'] | ShopperSearch.schemas['ProductSearchHit'];

/**
 * Recommendation response from Einstein
 */
export type Recommendation = {
    recoUUID?: string;
    recommenderName?: string;
    displayMessage?: string;
    recs?: EnrichedRecommendation[];
    recommenders?: RecommenderInfo[];
};

/**
 * Generic Recommenders Adapter Interface
 */
export interface RecommendersAdapter {
    /**
     * Get a list of available recommenders
     */
    getRecommenders(): Promise<Recommendation>;

    /**
     * Get recommendations by recommender name
     */
    getRecommendations(
        recommenderName: string,
        products?: Product[],
        args?: Record<string, unknown>
    ): Promise<Recommendation>;

    /**
     * Get recommendations for a specific zone
     */
    getZoneRecommendations(
        zoneName: string,
        products?: Product[],
        args?: Record<string, unknown>
    ): Promise<Recommendation>;
}
```

### Step 2: Create the Adapter Registry

Create a global registry to store adapter instances.

**Location**: `src/lib/adapters/adapter-store.ts`

```typescript
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
import type { EngagementAdapter } from './types';

// Global engagement adapter store
// The main purpose of this store is to store the instances of adapters that were created
const engagementAdapterStore = new Map<string, EngagementAdapter>();

/**
 * Add an engagement adapter to the adapter store
 */
export function addAdapter(name: string, adapter: EngagementAdapter): void {
    engagementAdapterStore.set(name, adapter);
}

/**
 * Remove an engagement adapter from the adapter store
 */
export function removeAdapter(name: string): void {
    engagementAdapterStore.delete(name);
}

/**
 * Get an engagement adapter from the adapter store
 */
export function getAdapter(name: string): EngagementAdapter | undefined {
    return engagementAdapterStore.get(name);
}

/**
 * Get all engagement adapters from the adapter store
 */
export function getAllAdapters(): EngagementAdapter[] {
    return Array.from(engagementAdapterStore.values());
}
```

**Note**: The current implementation uses a functional API with a type-specific store. This keeps the API simple and type-safe. For a more generic approach, you could extend this with a generic class-based store.

### Step 3: Implement Your Adapters

Create concrete implementations of your adapter interface for each service.

**Location**: `src/adapters/[service-name].ts`

**Factory Function Pattern (Recommended)**:

```typescript
import type { YourFeatureAdapter, YourFeatureAdapterConfig } from '@/lib/adapters/types';

/**
 * Configuration for [Service Name] adapter
 */
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
    // Validate configuration
    if (!config.apiKey || !config.baseUrl) {
        throw new Error('[ServiceNameAdapter] Missing required configuration');
    }

    return {
        async yourMethod(params: YourParams): Promise<YourResult> {
            try {
                // 1. Translate your params to service API format
                const serviceParams = translateParams(params, config);

                // 2. Call the service API
                const serviceResponse = await callServiceAPI(serviceParams, config);

                // 3. Translate service response to your interface
                const result = translateResponse(serviceResponse);

                return result;
            } catch (error) {
                console.error('[ServiceNameAdapter] Error in yourMethod:', error);
                // Return empty/default value instead of throwing to prevent UI breakage
                return getDefaultResult();
            }
        },
    };
}

// Helper functions (can be exported for testing)
function translateParams(params: YourParams, config: ServiceNameConfig): ServiceAPIParams {
    // Transform your params to service-specific format
    return {
        // ...service-specific mapping
    };
}

async function callServiceAPI(params: ServiceAPIParams, config: ServiceNameConfig): Promise<ServiceAPIResponse> {
    // Make the actual API call
    const response = await fetch(`${config.baseUrl}/api/endpoint`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        throw new Error(`Service API error: ${response.status}`);
    }

    return await response.json();
}

function translateResponse(response: ServiceAPIResponse): YourResult {
    // Transform service response to your interface
    return {
        // ...your interface mapping
    };
}

function getDefaultResult(): YourResult {
    // Return safe default value
    return {
        // ...default values
    };
}
```

**Class Pattern (Alternative)**:

```typescript
export class ServiceNameAdapter implements YourFeatureAdapter {
    private config: ServiceNameConfig;

    constructor(config: ServiceNameConfig) {
        this.config = config;
    }

    async yourMethod(params: YourParams): Promise<YourResult> {
        // Same implementation as factory function
    }
}
```

**Note**: The factory function pattern is preferred because it:
- Allows for better configuration validation
- Makes testing easier (can test helper functions independently)
- Enables better tree-shaking
- Supports object literal returns that implement interfaces

**Real Example (Einstein Adapter)**:

```typescript
// src/adapters/einstein.ts
import type { EngagementAdapter, EngagementAdapterConfig } from '@/lib/adapters';
import type { RecommendersAdapter, Recommendation, Product } from '@/hooks/recommenders/use-recommenders';
import type { AnalyticsEvent } from '@salesforce/storefront-next-runtime/events';

export const EINSTEIN_ADAPTER_NAME = 'einstein' as const;

export type EinsteinConfig = EngagementAdapterConfig & {
    host: string;
    einsteinId: string;
    isProduction: boolean;
    realm: string;
};

/**
 * Create an Einstein adapter that implements both EngagementAdapter and RecommendersAdapter interfaces
 */
export function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter & RecommendersAdapter {
    // Validate configuration
    if (!config.host || !config.einsteinId || !config.realm) {
        throw new Error('[EinsteinAdapter] Missing required configuration');
    }

    return {
        name: EINSTEIN_ADAPTER_NAME,

        // EngagementAdapter methods
        sendEvent: async (event: AnalyticsEvent): Promise<unknown> => {
            // Don't send events that are not enabled for this adapter
            if (!config.eventToggles[event.eventType]) {
                return Promise.resolve({});
            }

            // Map event type to Einstein endpoint and send
            const endpoint = mapEventTypeToEinsteinEndpoint(event.eventType);
            if (!endpoint) {
                throw new Error('Unsupported event type in Einstein adapter');
            }

            const activity = convertEventToEinsteinActivity(event, config.realm, config.isProduction);
            const targetEndpointUrl = `${config.host}/v3/activities/${config.realm}-${config.siteId}/${endpoint}?clientId=${config.einsteinId}`;
            const payload = new Blob([JSON.stringify(activity)], { type: 'application/json' });

            const success = navigator.sendBeacon(targetEndpointUrl, payload);
            return Promise.resolve({ success });
        },

        // RecommendersAdapter methods
        getRecommenders: async (): Promise<Recommendation> => {
            // Implementation for getting available recommenders
            // ...
        },
        
        getRecommendations: async (
            recommenderName: string,
            products?: Product[],
            args?: Record<string, unknown>
        ): Promise<Recommendation> => {
            // Implementation for getting recommendations
            // ...
        },
        
        getZoneRecommendations: async (
            zoneName: string,
            products?: Product[],
            args?: Record<string, unknown>
        ): Promise<Recommendation> => {
            // Implementation for zone-based recommendations
            // ...
        },
    };
}
```

### Step 4: Create Provider and Hook

Create a React Context provider and custom hook to inject the adapter into your components.

**Location**: `src/providers/your-feature.tsx`

```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAdapter } from '@/lib/adapters';
import { ensureAdaptersInitialized } from '@/lib/adapters/initialize-adapters';
import { useConfig } from '@/config';
import type { YourFeatureAdapter } from '@/lib/adapters/types';

/**
 * Context for YourFeature adapter
 */
const YourFeatureContext = createContext<YourFeatureAdapter | undefined>(undefined);

type YourFeatureProviderProps = {
    children: ReactNode;
    adapterName?: string;
};

/**
 * Provider component that supplies the YourFeature adapter to the component tree
 *
 * This provider lazy-loads the adapter from the global registry with async initialization.
 * The adapter should be registered during application initialization via ensureAdaptersInitialized().
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <YourFeatureProvider>
 *       <YourComponent />
 *     </YourFeatureProvider>
 *   );
 * }
 * ```
 */
export function YourFeatureProvider({ 
    children, 
    adapterName = 'yourFeature' 
}: YourFeatureProviderProps) {
    const config = useConfig();
    const [adapter, setAdapter] = useState<YourFeatureAdapter | undefined>(undefined);

    useEffect(() => {
        // Ensure adapters are initialized before trying to get the adapter
        const initializeAdapter = async () => {
            try {
                await ensureAdaptersInitialized(config);
                // Get the adapter from the global registry after initialization
                const initializedAdapter = getAdapter(adapterName) as YourFeatureAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                // Silently handle initialization errors - feature will simply not work
                if (import.meta.env.DEV) {
                    console.warn('[YourFeatureProvider] Failed to initialize adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return (
        <YourFeatureContext.Provider value={adapter}>
            {children}
        </YourFeatureContext.Provider>
    );
}

/**
 * Hook to access the YourFeature adapter from context
 *
 * @returns The YourFeature adapter, or undefined if not yet initialized or not available
 * Note: Returns undefined during async initialization. Components should handle this gracefully.
 *
 * @example
 * ```tsx
 * function YourComponent() {
 *   const adapter = useYourFeatureAdapter();
 *   
 *   if (!adapter) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   const handleAction = async () => {
 *     const result = await adapter.yourMethod(params);
 *   };
 * }
 * ```
 */
export function useYourFeatureAdapter(): YourFeatureAdapter | undefined {
    const adapter = useContext(YourFeatureContext);
    // Return undefined if adapter is not yet initialized - this is expected during async initialization
    // Components using this hook should check for undefined and handle gracefully
    return adapter;
}
```

**Note**: For a higher-level hook that manages state internally, see the "Two-Layer Hook Pattern" section below.

**Real Example (Recommenders Provider)**:

```typescript
// src/providers/recommenders.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { RecommendersAdapter } from '@/hooks/recommenders/use-recommenders';
import { getAdapter } from '@/lib/adapters';
import { ensureAdaptersInitialized } from '@/lib/adapters/initialize-adapters';
import { EINSTEIN_ADAPTER_NAME } from '@/adapters/einstein';
import { useConfig } from '@/config';

const RecommendersContext = createContext<RecommendersAdapter | undefined>(undefined);

type RecommendersProviderProps = {
    children: ReactNode;
    adapterName?: string;
};

/**
 * Provider for recommendations adapter
 *
 * Retrieves the adapter from the global adapter registry (lazily initialized).
 * The adapter is expected to implement both EngagementAdapter (for analytics events)
 * and RecommendersAdapter (for fetching recommendations).
 *
 * Currently only Einstein adapter is supported, which is registered via
 * initializeEngagementAdapters() when adapters are initialized.
 */
const RecommendersProvider = ({ 
    children, 
    adapterName = EINSTEIN_ADAPTER_NAME 
}: RecommendersProviderProps) => {
    const config = useConfig();
    const [adapter, setAdapter] = useState<RecommendersAdapter | undefined>(undefined);

    useEffect(() => {
        // Ensure adapters are initialized before trying to get the adapter
        const initializeAdapter = async () => {
            try {
                await ensureAdaptersInitialized(config);
                // Get the adapter from the global registry after initialization
                const initializedAdapter = getAdapter(adapterName) as RecommendersAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                // Silently handle initialization errors - recommendations will simply not display
                if (import.meta.env.DEV) {
                    console.warn('Failed to initialize recommenders adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return <RecommendersContext.Provider value={adapter}>{children}</RecommendersContext.Provider>;
};

/**
 * Hook to access the recommenders adapter from context
 * @returns The recommenders adapter, or undefined if not yet initialized or not available
 * Note: Returns undefined during async initialization. Components should handle this gracefully.
 */
export const useRecommendersAdapter = (): RecommendersAdapter | undefined => {
    const adapter = useContext(RecommendersContext);
    // Return undefined if adapter is not yet initialized - this is expected during async initialization
    // Components using this hook should check for undefined and handle gracefully
    return adapter;
};

export default RecommendersProvider;
```

### Step 5: Initialize Adapters

Register your adapter instances during application startup using lazy initialization.

**Location**: `src/lib/adapters/initialize-adapters.ts` and `src/adapters/index.ts`

**Lazy Initialization Pattern**:

```typescript
// src/lib/adapters/initialize-adapters.ts
import type { AppConfig } from '@/config';
import { getAllAdapters } from './adapter-store';

let adaptersInitializationPromise: Promise<void> | undefined;

/**
 * Ensures engagement adapters are initialized.
 *
 * This function handles the lazy initialization of engagement adapters.
 * The function is idempotent - it's safe to call multiple times.
 * If initialization is already in progress, it returns the existing promise.
 *
 * Adapter initialization code (Einstein, etc.) is dynamically imported to keep it out of the initial bundle.
 *
 * @param appConfig - The application configuration needed to initialize adapters
 * @returns Promise that resolves when adapters are initialized, or undefined on error
 */
export async function ensureAdaptersInitialized(appConfig: AppConfig): Promise<void> {
    // Early exit: check if adapters are already initialized
    if (getAllAdapters().length > 0) {
        return;
    }

    // If initialization is already in progress, wait for it
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

    // Start initialization with lazy loading
    adaptersInitializationPromise = (async () => {
        // Dynamically import adapter initialization code to keep it out of initial bundle
        const { initializeEngagementAdapters } = await import('@/adapters');

        // Initialize adapters only if config is available
        if (appConfig) {
            initializeEngagementAdapters(appConfig);
        }
    })().catch((error) => {
        // Clear promise on error to allow retry
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

```typescript
// src/adapters/index.ts
import type { AppConfig } from '@/config';
import { createEinsteinAdapter } from './einstein';
import { addAdapter } from '@/lib/adapters';
import { createActiveDataAdapter } from './active-data';

/**
 * Initialize engagement adapters.
 *
 * Uses properties defined in appConfig.engagement.adapters to set up default adapters.
 *
 * This is the place to modify when adding new engagement adapters to the system.
 */
export function initializeEngagementAdapters(appConfig: AppConfig) {
    const engagementAdapterConfigs = appConfig?.engagement?.adapters;

    // Register default adapters
    if (engagementAdapterConfigs?.einstein?.enabled) {
        try {
            addAdapter(
                'einstein',
                createEinsteinAdapter({
                    host: engagementAdapterConfigs.einstein.host || '',
                    einsteinId: engagementAdapterConfigs.einstein.einsteinId || '',
                    realm: engagementAdapterConfigs.einstein.realm || '',
                    siteId: engagementAdapterConfigs.einstein.siteId || appConfig.commerce.api.siteId,
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
                    siteId: engagementAdapterConfigs.activeData.siteId || appConfig.commerce.api.siteId,
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
- Uses lazy initialization with dynamic imports
- Idempotent (safe to call multiple times)
- Configuration-driven from `appConfig`
- Handles errors gracefully without crashing
- Keeps adapter code out of initial bundle

### Step 6: Create Feature Hook (Two-Layer Pattern)

For better developer experience, create a high-level hook that manages state internally.

**Location**: `src/hooks/your-feature/use-your-feature.ts`

```typescript
import { useState, useCallback } from 'react';
import { useYourFeatureAdapter } from '@/providers/your-feature';

export const useYourFeature = (isEnabled: boolean = true) => {
    const adapter = useYourFeatureAdapter();
    const [data, setData] = useState<YourResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const yourMethod = useCallback(async (params: YourParams) => {
        if (!isEnabled || !adapter) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await adapter.yourMethod(params);
            setData(result);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            console.error('[useYourFeature] Error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [adapter, isEnabled]);

    return {
        data,
        isLoading,
        error,
        isEnabled: isEnabled && !!adapter,
        yourMethod,
    };
};
```

### Step 7: Use in Components

Now you can use your adapter in components via the high-level hook.

```tsx
import { useYourFeature } from '@/hooks/your-feature/use-your-feature';

export function YourComponent() {
    const { yourMethod, data, isLoading, error } = useYourFeature();

    const handleAction = async () => {
        try {
            await yourMethod({ /* params */ });
        } catch (error) {
            // Error is already handled by the hook
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!data) return null;

    return (
        <div>
            <button onClick={handleAction} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Fetch Data'}
            </button>
            <div>{/* Render data */}</div>
        </div>
    );
}
```

**Real Example (Product Recommendations Component)**:

```tsx
// src/components/product-recommendations/index.tsx
import { useEffect, useRef, useMemo } from 'react';
import { useRecommenders } from '@/hooks/recommenders/use-recommenders';
import ProductCarousel from '@/components/product-carousel/carousel';
import { ProductRecommendationSkeleton } from '@/components/product/skeletons';

export interface ProductRecommendationsProps {
    recommenderName?: string;
    recommenderTitle?: string;
    recommenderType?: 'recommender' | 'zone';
    products?: Product[];
    args?: Record<string, unknown>;
}

export default function ProductRecommendations({
    recommenderName,
    recommenderTitle,
    recommenderType = 'recommender',
    products,
    args,
}: ProductRecommendationsProps) {
    const { getRecommendations, getZoneRecommendations, recommendations, isLoading, error } = useRecommenders(true);

    // Track the last fetch to prevent duplicate calls
    const lastFetchRef = useRef<{
        recommenderName: string;
        recommenderType?: string;
        productsKey?: string;
        argsKey?: string;
    } | null>(null);

    // Create stable keys for dependency tracking
    const productsKey = useMemo(() => {
        if (!products || products.length === 0) return '';
        return products.map((p) => p.id || p.productId || '').join(',');
    }, [products]);

    const argsKey = useMemo(() => {
        if (!args) return '';
        return JSON.stringify(args);
    }, [args]);

    // Fetch recommendations when component mounts or dependencies change
    useEffect(() => {
        if (!recommenderName) {
            return;
        }

        // Skip if we've already fetched with these exact parameters
        const lastFetch = lastFetchRef.current;
        if (
            lastFetch &&
            lastFetch.recommenderName === recommenderName &&
            lastFetch.recommenderType === recommenderType &&
            lastFetch.productsKey === productsKey &&
            lastFetch.argsKey === argsKey
        ) {
            return;
        }

        // Mark that we're fetching with these parameters
        lastFetchRef.current = {
            recommenderName,
            recommenderType,
            productsKey,
            argsKey,
        };

        if (recommenderType === 'zone') {
            void getZoneRecommendations(recommenderName, products, args);
        } else {
            void getRecommendations(recommenderName, products, args);
        }
    }, [recommenderName, recommenderType, productsKey, argsKey, getRecommendations, getZoneRecommendations]);

    // Early return if no recommender configured
    if (!recommenderName || !recommenderTitle) {
        return null;
    }

    // Early return if error occurred
    if (error) {
        return null;
    }

    // Show loading state
    if (isLoading) {
        return (
            <div>
                <ProductRecommendationSkeleton title={recommenderTitle} />
            </div>
        );
    }

    // Only show recommendations if they match this recommender
    const recommendationsMatch = recommendations?.recommenderName === recommenderName;
    const productRecs = recommendationsMatch ? recommendations?.recs : undefined;

    if (!productRecs || productRecs.length === 0) {
        return null;
    }

    return (
        <div>
            <ProductCarousel 
                products={productRecs} 
                title={recommendations.displayMessage || recommenderTitle} 
            />
        </div>
    );
}
```

**Key Points**:
- Uses high-level `useRecommenders` hook that manages state internally
- Handles loading and error states automatically
- Supports both recommender-based and zone-based recommendations
- Prevents duplicate fetches with dependency tracking
- Gracefully handles missing adapters (returns null instead of crashing)

---

## Two-Layer Hook Pattern

The codebase uses a **two-layer hook pattern** that separates low-level adapter access from high-level feature logic:

### Layer 1: Adapter Hook (Low-Level)

Provides direct access to the adapter instance from context. Returns `undefined` if not initialized.

```typescript
// src/providers/your-feature.tsx
export function useYourFeatureAdapter(): YourAdapter | undefined {
    return useContext(YourFeatureContext);
}
```

**Use when:**
- You need direct access to adapter methods
- You want to manage state yourself
- You need fine-grained control over when methods are called

### Layer 2: Feature Hook (High-Level)

Provides a complete feature API with built-in state management, loading states, and error handling.

```typescript
// src/hooks/your-feature/use-your-feature.ts
export const useYourFeature = (isEnabled: boolean = true) => {
    const adapter = useYourFeatureAdapter();
    const [data, setData] = useState<YourResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const yourMethod = useCallback(async (params: YourParams) => {
        if (!isEnabled || !adapter) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await adapter.yourMethod(params);
            setData(result);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [adapter, isEnabled]);

    return {
        data,
        isLoading,
        error,
        isEnabled: isEnabled && !!adapter,
        yourMethod,
    };
};
```

**Use when:**
- You want automatic state management
- You need loading and error states
- You want a simpler component API
- You're building standard UI components

### Benefits

1. **Separation of Concerns**: Adapter access is separate from feature logic
2. **Reusability**: Feature hooks can be used across multiple components
3. **Testability**: Can test adapter hooks and feature hooks independently
4. **Flexibility**: Components can choose the level of abstraction they need

---

## Product Recommendations Example

This section provides a detailed walkthrough of the product recommendations implementation.

### Architecture

```
ProductRecommendations Component
  ↓
useRecommenders Hook
  ↓
RecommendersContext
  ↓
RecommendersProvider
  ↓
AdapterStore.get('recommenders')
  ↓
EinsteinAdapter | ActiveDataAdapter
  ↓
Einstein SCAPI | Active Data API
```

### File Structure

```
src/
├── lib/
│   └── adapters/
│       ├── types.ts                    # Adapter interfaces
│       └── adapter-store.ts            # Global registry
├── adapters/
│   ├── einstein.ts                     # Einstein implementation
│   └── active-data.ts                  # Active Data implementation
├── providers/
│   └── recommenders.tsx                # Provider + hooks
├── hooks/
│   └── use-recommenders.ts             # Re-export for convenience
└── components/
    └── product-recommendations/
        ├── index.tsx                   # Main component
        └── product-card.tsx            # Sub-component
```

### 1. Adapter Interfaces

```typescript
// src/lib/adapters/types.ts
import type { AnalyticsEvent, EventAdapter } from '@salesforce/storefront-next-runtime/events';

/**
 * Configuration for adapters
 */
export type EngagementAdapterConfig = {
    siteId: string;
    eventToggles: Record<AnalyticsEvent['eventType'], boolean>;
    [key: string]: any;
};

/**
 * Interface for engagement adapters
 */
export interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (event: AnalyticsEvent) => Promise<unknown>;
    send?: (url: string, options?: RequestInit) => Promise<Response>;
}

// src/hooks/recommenders/use-recommenders.ts
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Union type for products from either Shopper Products API or Shopper Search API
 */
export type Product = ShopperProducts.schemas['Product'] | ShopperSearch.schemas['ProductSearchHit'];

/**
 * Recommendation response from Einstein
 */
export type Recommendation = {
    recoUUID?: string;
    recommenderName?: string;
    displayMessage?: string;
    recs?: EnrichedRecommendation[];
    recommenders?: RecommenderInfo[];
};

/**
 * Generic Recommenders Adapter Interface
 */
export interface RecommendersAdapter {
    /**
     * Get a list of available recommenders
     */
    getRecommenders(): Promise<Recommendation>;

    /**
     * Get recommendations by recommender name
     */
    getRecommendations(
        recommenderName: string,
        products?: Product[],
        args?: Record<string, unknown>
    ): Promise<Recommendation>;

    /**
     * Get recommendations for a specific zone
     */
    getZoneRecommendations(
        zoneName: string,
        products?: Product[],
        args?: Record<string, unknown>
    ): Promise<Recommendation>;
}
```

### 2. Einstein Adapter Implementation

```typescript
// src/adapters/einstein.ts
import type { EngagementAdapter, EngagementAdapterConfig } from '@/lib/adapters';
import type { RecommendersAdapter, Recommendation, Product } from '@/hooks/recommenders/use-recommenders';
import type { AnalyticsEvent } from '@salesforce/storefront-next-runtime/events';

export const EINSTEIN_ADAPTER_NAME = 'einstein' as const;

export type EinsteinConfig = EngagementAdapterConfig & {
    host: string;
    einsteinId: string;
    isProduction: boolean;
    realm: string;
};

/**
 * Create an Einstein adapter that implements both EngagementAdapter and RecommendersAdapter interfaces
 */
export function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter & RecommendersAdapter {
    // Validate configuration
    if (!config.host || !config.einsteinId || !config.realm) {
        throw new Error('[EinsteinAdapter] Missing required configuration');
    }

    return {
        name: EINSTEIN_ADAPTER_NAME,

        // EngagementAdapter methods
        sendEvent: async (event: AnalyticsEvent): Promise<unknown> => {
            // Don't send events that are not enabled for this adapter
            if (!config.eventToggles[event.eventType]) {
                return Promise.resolve({});
            }

            // Map event type to Einstein endpoint and send
            const endpoint = mapEventTypeToEinsteinEndpoint(event.eventType);
            if (!endpoint) {
                throw new Error('Unsupported event type in Einstein adapter');
            }

            const activity = convertEventToEinsteinActivity(event, config.realm, config.isProduction);
            const targetEndpointUrl = `${config.host}/v3/activities/${config.realm}-${config.siteId}/${endpoint}?clientId=${config.einsteinId}`;
            const payload = new Blob([JSON.stringify(activity)], { type: 'application/json' });

            const success = navigator.sendBeacon(targetEndpointUrl, payload);
            return Promise.resolve({ success });
        },

        // RecommendersAdapter methods
        getRecommenders: async (): Promise<Recommendation> => {
            // Implementation for getting available recommenders
            // ...
        },
        
        getRecommendations: async (
            recommenderName: string,
            products?: Product[],
            args?: Record<string, unknown>
        ): Promise<Recommendation> => {
            // Implementation for getting recommendations
            // Calls Einstein API and transforms response
            // ...
        },
        
        getZoneRecommendations: async (
            zoneName: string,
            products?: Product[],
            args?: Record<string, unknown>
        ): Promise<Recommendation> => {
            // Implementation for zone-based recommendations
            // ...
        },
    };
}
```

### 3. Active Data Adapter Implementation

```typescript
// src/adapters/active-data.ts
import type { EngagementAdapter, EngagementAdapterConfig } from '@/lib/adapters';
import type { AnalyticsEvent } from '@salesforce/storefront-next-runtime/events';

export type ActiveDataConfig = EngagementAdapterConfig & {
    host: string;
    locale: string;
    siteUUID?: string;
    sourceCode?: string;
    siteCurrency?: string;
};

/**
 * Create an Active Data adapter
 *
 * Alternative implementation using Active Data service for engagement tracking.
 */
export function createActiveDataAdapter(config: ActiveDataConfig): EngagementAdapter {
    // Validate configuration
    if (!config.host || !config.siteId) {
        throw new Error('[ActiveDataAdapter] Missing required configuration');
    }

    return {
        name: 'active-data',
        
        sendEvent: async (event: AnalyticsEvent): Promise<unknown> => {
            // Don't send events that are not enabled for this adapter
            if (!config.eventToggles[event.eventType]) {
                return Promise.resolve({});
            }

            // Implementation for sending events to Active Data
            // ...
        },
    };
}
```

### 4. Provider and Hooks

**Provider (Low-Level Adapter Access)**:

```typescript
// src/providers/recommenders.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { RecommendersAdapter } from '@/hooks/recommenders/use-recommenders';
import { getAdapter } from '@/lib/adapters';
import { ensureAdaptersInitialized } from '@/lib/adapters/initialize-adapters';
import { EINSTEIN_ADAPTER_NAME } from '@/adapters/einstein';
import { useConfig } from '@/config';

const RecommendersContext = createContext<RecommendersAdapter | undefined>(undefined);

type RecommendersProviderProps = {
    children: ReactNode;
    adapterName?: string;
};

export function RecommendersProvider({ 
    children, 
    adapterName = EINSTEIN_ADAPTER_NAME 
}: RecommendersProviderProps) {
    const config = useConfig();
    const [adapter, setAdapter] = useState<RecommendersAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            try {
                await ensureAdaptersInitialized(config);
                const initializedAdapter = getAdapter(adapterName) as RecommendersAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Failed to initialize recommenders adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return <RecommendersContext.Provider value={adapter}>{children}</RecommendersContext.Provider>;
}

/**
 * Hook to access the recommenders adapter from context
 * @returns The recommenders adapter, or undefined if not yet initialized
 */
export function useRecommendersAdapter(): RecommendersAdapter | undefined {
    return useContext(RecommendersContext);
}
```

**High-Level Feature Hook**:

```typescript
// src/hooks/recommenders/use-recommenders.ts
import { useState, useCallback } from 'react';
import { useRecommendersAdapter } from '@/providers/recommenders';
import type { Product, Recommendation } from './use-recommenders';

export const useRecommenders = (isEnabled: boolean = true) => {
    const adapter = useRecommendersAdapter();
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation>({});
    const [error, setError] = useState<Error | null>(null);

    const getRecommendations = useCallback(
        async (recommenderName: string, products?: Product[], args?: Record<string, unknown>) => {
            if (!isEnabled || !adapter) return;

            setIsLoading(true);
            setError(null);

            try {
                // Fetch recommendations from adapter
                const reco = await adapter.getRecommendations(recommenderName, products, args);
                
                // Enrich with product details if needed
                // ...
                
                setRecommendations(reco);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch recommendations'));
            } finally {
                setIsLoading(false);
            }
        },
        [adapter, isEnabled]
    );

    return {
        isLoading,
        isEnabled: isEnabled && !!adapter,
        recommendations,
        error,
        getRecommendations,
        getZoneRecommendations,
        getRecommenders,
    };
};
```

### 5. Component Usage

```tsx
// src/components/product-recommendations/index.tsx
import { useEffect, useRef, useMemo } from 'react';
import { useRecommenders } from '@/hooks/recommenders/use-recommenders';
import ProductCarousel from '@/components/product-carousel/carousel';
import { ProductRecommendationSkeleton } from '@/components/product/skeletons';

export interface ProductRecommendationsProps {
    recommenderName?: string;
    recommenderTitle?: string;
    recommenderType?: 'recommender' | 'zone';
    products?: Product[];
    args?: Record<string, unknown>;
}

export default function ProductRecommendations({
    recommenderName,
    recommenderTitle,
    recommenderType = 'recommender',
    products,
    args,
}: ProductRecommendationsProps) {
    const { getRecommendations, getZoneRecommendations, recommendations, isLoading, error } = useRecommenders(true);

    // Track the last fetch to prevent duplicate calls
    const lastFetchRef = useRef<{
        recommenderName: string;
        recommenderType?: string;
        productsKey?: string;
        argsKey?: string;
    } | null>(null);

    // Create stable keys for dependency tracking
    const productsKey = useMemo(() => {
        if (!products || products.length === 0) return '';
        return products.map((p) => p.id || p.productId || '').join(',');
    }, [products]);

    const argsKey = useMemo(() => {
        if (!args) return '';
        return JSON.stringify(args);
    }, [args]);

    // Fetch recommendations when component mounts or dependencies change
    useEffect(() => {
        if (!recommenderName) return;

        // Skip if we've already fetched with these exact parameters
        const lastFetch = lastFetchRef.current;
        if (
            lastFetch &&
            lastFetch.recommenderName === recommenderName &&
            lastFetch.recommenderType === recommenderType &&
            lastFetch.productsKey === productsKey &&
            lastFetch.argsKey === argsKey
        ) {
            return;
        }

        lastFetchRef.current = { recommenderName, recommenderType, productsKey, argsKey };

        if (recommenderType === 'zone') {
            void getZoneRecommendations(recommenderName, products, args);
        } else {
            void getRecommendations(recommenderName, products, args);
        }
    }, [recommenderName, recommenderType, productsKey, argsKey, getRecommendations, getZoneRecommendations]);

    if (!recommenderName || !recommenderTitle) return null;
    if (error) return null;
    if (isLoading) return <ProductRecommendationSkeleton title={recommenderTitle} />;

    const recommendationsMatch = recommendations?.recommenderName === recommenderName;
    const productRecs = recommendationsMatch ? recommendations?.recs : undefined;

    if (!productRecs || productRecs.length === 0) return null;

    return (
        <div>
            <ProductCarousel 
                products={productRecs} 
                title={recommendations.displayMessage || recommenderTitle} 
            />
        </div>
    );
}
```

### 6. Initialization

**Lazy Initialization Helper**:

```typescript
// src/lib/adapters/initialize-adapters.ts
import type { AppConfig } from '@/config';
import { getAllAdapters } from './adapter-store';

let adaptersInitializationPromise: Promise<void> | undefined;

/**
 * Ensures engagement adapters are initialized.
 *
 * This function handles the lazy initialization of engagement adapters.
 * The function is idempotent - it's safe to call multiple times.
 */
export async function ensureAdaptersInitialized(appConfig: AppConfig): Promise<void> {
    // Early exit: check if adapters are already initialized
    if (getAllAdapters().length > 0) {
        return;
    }

    // If initialization is already in progress, wait for it
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

    // Start initialization with lazy loading
    adaptersInitializationPromise = (async () => {
        // Dynamically import adapter initialization code to keep it out of initial bundle
        const { initializeEngagementAdapters } = await import('@/adapters');

        if (appConfig) {
            initializeEngagementAdapters(appConfig);
        }
    })();

    await adaptersInitializationPromise;
}
```

**Adapter Registration**:

```typescript
// src/adapters/index.ts
import type { AppConfig } from '@/config';
import { createEinsteinAdapter } from './einstein';
import { addAdapter } from '@/lib/adapters';
import { createActiveDataAdapter } from './active-data';

/**
 * Initialize engagement adapters.
 *
 * Uses properties defined in appConfig.engagement.adapters to set up default adapters.
 */
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
                    siteId: engagementAdapterConfigs.einstein.siteId || appConfig.commerce.api.siteId,
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
                    siteId: engagementAdapterConfigs.activeData.siteId || appConfig.commerce.api.siteId,
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

### 7. Configuration

Configuration is driven by `appConfig` object, typically loaded from environment variables or configuration files:

```typescript
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
                    // ... other event types
                },
            },
            activeData: {
                enabled: false,
                host: 'https://your-activedata-host.com',
                siteId: 'your-site-id',
                locale: 'en-US',
                siteUUID: 'your-site-uuid',
                eventToggles: {
                    // ... event toggles
                },
            },
        },
    },
}
```

---

## Code Templates

### Complete Adapter Implementation Template (Factory Function)

```typescript
// src/adapters/[service-name].ts
import type { YourAdapter, YourAdapterConfig, Params, Result } from '@/lib/adapters/types';

export type ServiceNameConfig = YourAdapterConfig & {
    apiKey: string;
    baseUrl: string;
    // ... other service-specific config
};

/**
 * Create a [Service Name] adapter
 *
 * This factory function returns an object that implements YourAdapter.
 * The factory pattern allows for better testability and configuration validation.
 */
export function createServiceNameAdapter(config: ServiceNameConfig): YourAdapter {
    // Validate configuration
    if (!config.apiKey || !config.baseUrl) {
        throw new Error('[ServiceNameAdapter] Missing required configuration');
    }

    return {
        async yourMethod(params: Params): Promise<Result> {
            try {
                // 1. Transform input
                const serviceParams = transformInput(params, config);

                // 2. Call external service
                const serviceResponse = await callServiceAPI(serviceParams, config);

                // 3. Transform output
                const result = transformOutput(serviceResponse);

                return result;
            } catch (error) {
                console.error('[ServiceNameAdapter] Error:', error);
                // Return default value instead of throwing to prevent UI breakage
                return getDefaultResult();
            }
        },
    };
}

// Helper functions (can be exported for testing)
function transformInput(params: Params, config: ServiceNameConfig): ServiceParams {
    return {
        // Map your interface to service API
    };
}

async function callServiceAPI(params: ServiceParams, config: ServiceNameConfig): Promise<ServiceResponse> {
    const response = await fetch(`${config.baseUrl}/api/endpoint`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        throw new Error(`Service API error: ${response.status}`);
    }

    return await response.json();
}

function transformOutput(response: ServiceResponse): Result {
    return {
        // Map service API to your interface
    };
}

function getDefaultResult(): Result {
    // Return safe default value
    return {
        // ...default values
    };
}
```

### Alternative: Class-Based Adapter Template

```typescript
// src/adapters/[service-name].ts
import type { YourAdapter, Params, Result } from '@/lib/adapters/types';

export type ServiceNameConfig = {
    apiKey: string;
    baseUrl: string;
};

/**
 * [Service Name] adapter implementation (class-based)
 */
export class ServiceNameAdapter implements YourAdapter {
    private config: ServiceNameConfig;

    constructor(config: ServiceNameConfig) {
        this.config = config;
    }

    async yourMethod(params: Params): Promise<Result> {
        try {
            // Implementation
        } catch (error) {
            console.error('[ServiceNameAdapter] Error:', error);
            return getDefaultResult();
        }
    }
}

// Factory function wrapper
export function createServiceNameAdapter(config: ServiceNameConfig): YourAdapter {
    return new ServiceNameAdapter(config);
}
```

### Provider Template

```typescript
// src/providers/your-feature.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAdapter } from '@/lib/adapters';
import { ensureAdaptersInitialized } from '@/lib/adapters/initialize-adapters';
import { useConfig } from '@/config';
import type { YourAdapter } from '@/lib/adapters/types';

const YourFeatureContext = createContext<YourAdapter | undefined>(undefined);

type YourFeatureProviderProps = {
    children: ReactNode;
    adapterName?: string;
};

export function YourFeatureProvider({ 
    children, 
    adapterName = 'yourFeature' 
}: YourFeatureProviderProps) {
    const config = useConfig();
    const [adapter, setAdapter] = useState<YourAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            try {
                await ensureAdaptersInitialized(config);
                const initializedAdapter = getAdapter(adapterName) as YourAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('[YourFeatureProvider] Failed to initialize adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return (
        <YourFeatureContext.Provider value={adapter}>
            {children}
        </YourFeatureContext.Provider>
    );
}

/**
 * Hook to access the YourFeature adapter from context
 * @returns The YourFeature adapter, or undefined if not yet initialized
 */
export function useYourFeatureAdapter(): YourAdapter | undefined {
    return useContext(YourFeatureContext);
}
```

### Component Template (Using High-Level Hook)

```tsx
// src/components/your-component/index.tsx
import { useEffect, useRef, useMemo } from 'react';
import { useYourFeature } from '@/hooks/your-feature/use-your-feature';
import type { YourParams } from '@/lib/adapters/types';

export function YourComponent({ params }: { params: YourParams }) {
    const { yourMethod, data, isLoading, error } = useYourFeature();
    const lastFetchRef = useRef<string | null>(null);

    // Create stable key for dependency tracking
    const paramsKey = useMemo(() => JSON.stringify(params), [params]);

    useEffect(() => {
        // Skip if we've already fetched with these exact parameters
        if (lastFetchRef.current === paramsKey) {
            return;
        }

        lastFetchRef.current = paramsKey;
        void yourMethod(params);
    }, [paramsKey, yourMethod, params]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!data) return null;

    return (
        <div>
            {/* Render your data */}
        </div>
    );
}
```

### Component Template (Using Low-Level Adapter Hook)

```tsx
// src/components/your-component/index.tsx
import { useEffect, useState } from 'react';
import { useYourFeatureAdapter } from '@/providers/your-feature';
import type { YourParams, YourResult } from '@/lib/adapters/types';

export function YourComponent({ params }: { params: YourParams }) {
    const adapter = useYourFeatureAdapter();
    const [data, setData] = useState<YourResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!adapter) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const result = await adapter.yourMethod(params);
                setData(result);
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Unknown error');
                setError(error);
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [adapter, params]);

    if (!adapter) return <div>Initializing...</div>;
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!data) return null;

    return (
        <div>
            {/* Render your data */}
        </div>
    );
}
```

---

## Testing Strategies

### 1. Mock Adapter for Tests

Create a mock adapter that implements your interface for testing.

```typescript
// src/adapters/__mocks__/mock-adapter.ts
import type { YourAdapter, Params, Result } from '@/lib/adapters/types';

export class MockAdapter implements YourAdapter {
    private mockData: Result;
    public calls: Params[] = [];

    constructor(mockData: Result) {
        this.mockData = mockData;
    }

    async yourMethod(params: Params): Promise<Result> {
        // Record call for assertions
        this.calls.push(params);

        // Return mock data
        return this.mockData;
    }

    // Helper to verify calls
    getCallCount(): number {
        return this.calls.length;
    }

    getLastCall(): Params | undefined {
        return this.calls[this.calls.length - 1];
    }
}
```

### 2. Component Tests with Mock Adapter

```tsx
// src/components/your-component/__tests__/index.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { YourComponent } from '../index';
import { YourFeatureProvider } from '@/providers/your-feature';
import { addAdapter } from '@/lib/adapters';
import { MockAdapter } from '@/adapters/__mocks__/mock-adapter';
import { resetAdaptersInitialization } from '@/lib/adapters/initialize-adapters';

// Mock the config
vi.mock('@/config', () => ({
    useConfig: () => ({
        engagement: {
            adapters: {
                yourFeature: {
                    enabled: true,
                },
            },
        },
    }),
}));

describe('YourComponent', () => {
    beforeEach(() => {
        // Reset initialization state
        resetAdaptersInitialization();
        
        // Register mock adapter before each test
        const mockAdapter = new MockAdapter({
            // mock result data
        });
        addAdapter('yourFeature', mockAdapter);
    });

    afterEach(() => {
        // Clean up after each test
        // Note: The actual implementation doesn't have a clear() method
        // You may need to implement cleanup in your tests
    });

    it('should render data from adapter', async () => {
        render(
            <YourFeatureProvider>
                <YourComponent />
            </YourFeatureProvider>
        );

        // Wait for data to load
        await waitFor(() => {
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });

        // Assert rendered data
        expect(screen.getByText('Expected Content')).toBeInTheDocument();
    });

    it('should handle errors gracefully', async () => {
        // Register error-throwing mock adapter
        const errorAdapter = new MockAdapter(null);
        errorAdapter.yourMethod = async () => {
            throw new Error('Service error');
        };
        addAdapter('yourFeature', errorAdapter);

        render(
            <YourFeatureProvider>
                <YourComponent />
            </YourFeatureProvider>
        );

        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument();
        });
    });
});
```

### 3. Adapter Implementation Tests

```typescript
// src/adapters/__tests__/einstein.test.ts
import { createEinsteinAdapter } from '../einstein';
import type { EinsteinConfig } from '../einstein';

describe('EinsteinAdapter', () => {
    let adapter: ReturnType<typeof createEinsteinAdapter>;
    let config: EinsteinConfig;

    beforeEach(() => {
        config = {
            host: 'https://api.test.com',
            einsteinId: 'test-id',
            realm: 'test-realm',
            siteId: 'test-site',
            isProduction: false,
            eventToggles: {
                view_page: true,
                view_product: true,
                // ... other event types
            },
        };
        adapter = createEinsteinAdapter(config);
    });

    it('should create adapter with valid config', () => {
        expect(adapter).toBeDefined();
        expect(adapter.name).toBe('einstein');
    });

    it('should throw error with invalid config', () => {
        expect(() => {
            createEinsteinAdapter({
                ...config,
                host: '', // Missing required field
            });
        }).toThrow('[EinsteinAdapter] Missing required configuration');
    });

    it('should fetch recommendations', async () => {
        // Mock the underlying API calls
        // ...

        const result = await adapter.getRecommendations('home-recommendations');

        expect(result).toBeDefined();
        // Assert result structure
    });

    it('should handle errors gracefully', async () => {
        // Mock API to throw error
        // ...

        const result = await adapter.getRecommendations('home-recommendations');

        // Should return safe default instead of throwing
        expect(result).toBeDefined();
    });
});
```

### 4. Integration Tests

```typescript
// src/app/__tests__/integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../app';
import { addAdapter } from '@/lib/adapters';
import { createEinsteinAdapter } from '@/adapters/einstein';
import { resetAdaptersInitialization } from '@/lib/adapters/initialize-adapters';

// Mock the config
vi.mock('@/config', () => ({
    useConfig: () => ({
        engagement: {
            adapters: {
                einstein: {
                    enabled: true,
                    host: 'https://api.test.com',
                    einsteinId: 'test-id',
                    realm: 'test-realm',
                    siteId: 'test-site',
                    isProduction: false,
                    eventToggles: {},
                },
            },
        },
    }),
}));

describe('App Integration', () => {
    beforeAll(() => {
        resetAdaptersInitialization();
        
        // Initialize real adapter (or mock if needed)
        const adapter = createEinsteinAdapter({
            host: 'https://api.test.com',
            einsteinId: 'test-id',
            realm: 'test-realm',
            siteId: 'test-site',
            isProduction: false,
            eventToggles: {},
        });
        addAdapter('einstein', adapter);
    });

    it('should render app with recommendations', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('You May Also Like')).toBeInTheDocument();
        });
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
- Design for the consumer (component), not the implementation
- Make interfaces async by default (Promise return types)

❌ **DON'T:**
- Create "god interfaces" with too many methods
- Expose implementation details
- Use implementation-specific types in interfaces
- Make breaking changes to interfaces without versioning

```typescript
// ✅ Good - focused interface
interface RecommendersAdapter {
    getRecommendations(context: RecommenderContext): Promise<Product[]>;
}

// ❌ Bad - mixed concerns
interface RecommendersAdapter {
    getRecommendations(context: RecommenderContext): Promise<Product[]>;
    fetchEinsteinToken(): Promise<string>; // Implementation detail
    handleShoppingCart(cart: Cart): void;  // Unrelated concern
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

```typescript
// ✅ Good - graceful degradation
async getRecommendations(context: RecommenderContext): Promise<Product[]> {
    try {
        const response = await this.callAPI(context);
        return this.transformResponse(response);
    } catch (error) {
        console.error('[Adapter] Failed to fetch recommendations:', error);
        // Return empty array so UI still renders
        return [];
    }
}

// ❌ Bad - throws and breaks UI
async getRecommendations(context: RecommenderContext): Promise<Product[]> {
    const response = await this.callAPI(context); // Throws on error
    return this.transformResponse(response);
}
```

### 3. Lazy Initialization

✅ **DO:**
- Use `useState` + `useEffect` for async initialization
- Use `ensureAdaptersInitialized()` for lazy loading
- Initialize adapters once at app startup
- Cache adapter instances with idempotent initialization

❌ **DON'T:**
- Use `useMemo` for async operations (it doesn't work)
- Create adapter instances in render
- Load adapters on every context read
- Initialize in component effects without proper guards

```typescript
// ✅ Good - async lazy load with useState + useEffect
export function YourFeatureProvider({ children }: { children: ReactNode }) {
    const config = useConfig();
    const [adapter, setAdapter] = useState<YourAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            try {
                await ensureAdaptersInitialized(config);
                const initializedAdapter = getAdapter('yourFeature') as YourAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Failed to initialize adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config]);

    return <Context.Provider value={adapter}>{children}</Context.Provider>;
}

// ❌ Bad - useMemo doesn't work for async operations
export function YourFeatureProvider({ children }: { children: ReactNode }) {
    const adapter = useMemo(() => {
        // This won't work - useMemo can't handle async
        return adapterStore.get<YourAdapter>('yourFeature');
    }, []);
    return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
```

### 4. Type Safety

✅ **DO:**
- Use TypeScript interfaces for all adapters
- Validate adapter registration with generics
- Type context providers properly

❌ **DON'T:**
- Use `any` types
- Cast without validation
- Skip type definitions

```typescript
// ✅ Good - type-safe
export function useYourFeature(): YourAdapter {
    const adapter = useContext(YourFeatureContext);
    if (!adapter) {
        throw new Error('useYourFeature must be used within YourFeatureProvider');
    }
    return adapter;
}

// ❌ Bad - unsafe
export function useYourFeature() {
    return useContext(YourFeatureContext) as any;
}
```

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
- Use `appConfig` object for configuration
- Validate configuration at startup
- Provide sensible defaults
- Document all config options
- Use configuration-driven initialization

❌ **DON'T:**
- Hardcode adapter selection
- Load config in components
- Use config without validation
- Rely solely on environment variables

```typescript
// ✅ Good - configuration-driven with validation
export function initializeEngagementAdapters(appConfig: AppConfig) {
    const engagementAdapterConfigs = appConfig?.engagement?.adapters;

    if (engagementAdapterConfigs?.einstein?.enabled) {
        // Validate required fields
        if (!engagementAdapterConfigs.einstein.host || !engagementAdapterConfigs.einstein.einsteinId) {
            throw new Error('[EinsteinAdapter] Missing required configuration');
        }

        try {
            addAdapter(
                'einstein',
                createEinsteinAdapter({
                    host: engagementAdapterConfigs.einstein.host,
                    einsteinId: engagementAdapterConfigs.einstein.einsteinId,
                    realm: engagementAdapterConfigs.einstein.realm || '',
                    siteId: engagementAdapterConfigs.einstein.siteId || appConfig.commerce.api.siteId,
                    isProduction: engagementAdapterConfigs.einstein.isProduction || false,
                    eventToggles: engagementAdapterConfigs.einstein.eventToggles || {},
                })
            );
        } catch (error) {
            console.warn('Failed to initialize Einstein adapter:', (error as Error).message);
        }
    }
}

// ❌ Bad - no validation, hardcoded values
function initializeAdapters() {
    const adapter = createEinsteinAdapter({
        host: 'https://api.example.com', // Hardcoded
        einsteinId: 'test-id', // Hardcoded
        // Missing validation
    });
    addAdapter('einstein', adapter);
}
```

### 7. Documentation

✅ **DO:**
- Document adapter interfaces with JSDoc
- Provide usage examples
- Document error scenarios
- Keep README up to date

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
    const adapter = new ServiceAdapter(); // Don't do this!
    // ...
}
```

**Solution**: Use lazy initialization with `useState` + `useEffect` in providers.

```tsx
// ✅ Good - reuses single instance with async initialization
export function YourFeatureProvider({ children }: { children: ReactNode }) {
    const config = useConfig();
    const [adapter, setAdapter] = useState<YourAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            await ensureAdaptersInitialized(config);
            const initializedAdapter = getAdapter('yourFeature') as YourAdapter | undefined;
            setAdapter(initializedAdapter);
        };

        void initializeAdapter();
    }, [config]);

    return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
```

### 2. Not Handling Adapter Absence

**Problem**: Assuming adapter is always available leads to runtime errors.

```typescript
// ❌ Bad - crashes if adapter not registered
export function useYourFeature() {
    return useContext(YourFeatureContext)!; // Unsafe!
}
```

**Solution**: Return `undefined` for graceful degradation, or check and provide helpful error messages.

```typescript
// ✅ Good - graceful degradation (recommended)
export function useYourFeatureAdapter(): YourAdapter | undefined {
    const adapter = useContext(YourFeatureContext);
    // Return undefined if adapter is not yet initialized - this is expected during async initialization
    // Components using this hook should check for undefined and handle gracefully
    return adapter;
}

// ✅ Alternative - throws error (use when adapter is required)
export function useYourFeature(): YourAdapter {
    const adapter = useContext(YourFeatureContext);
    if (!adapter) {
        throw new Error(
            'useYourFeature must be used within YourFeatureProvider. ' +
            'Ensure the adapter is registered via ensureAdaptersInitialized().'
        );
    }
    return adapter;
}
```

### 3. Leaking Implementation Details

**Problem**: Exposing service-specific details in the interface.

```typescript
// ❌ Bad - exposes Einstein-specific details
interface RecommendersAdapter {
    getEinsteinRecommendations(einsteinParams: EinsteinParams): Promise<Product[]>;
}
```

**Solution**: Use generic, implementation-agnostic interfaces.

```typescript
// ✅ Good - generic interface
interface RecommendersAdapter {
    getRecommendations(context: RecommenderContext): Promise<Product[]>;
}
```

### 4. Forgetting to Register Adapters

**Problem**: Using hooks before adapters are registered causes errors.

```typescript
// ❌ Bad - adapter not registered yet
function App() {
    return (
        <YourFeatureProvider> {/* Adapter not in store! */}
            <YourComponent />
        </YourFeatureProvider>
    );
}
```

**Solution**: Use lazy initialization with `ensureAdaptersInitialized()` which is called automatically by providers.

```typescript
// ✅ Good - lazy initialization in provider
export function YourFeatureProvider({ children }: { children: ReactNode }) {
    const config = useConfig();
    const [adapter, setAdapter] = useState<YourAdapter | undefined>(undefined);

    useEffect(() => {
        const initializeAdapter = async () => {
            try {
                // ensureAdaptersInitialized() handles registration automatically
                await ensureAdaptersInitialized(config);
                const initializedAdapter = getAdapter('yourFeature') as YourAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Failed to initialize adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config]);

    return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
```

### 5. Not Handling Async Errors

**Problem**: Letting adapter errors propagate to UI causes crashes.

```typescript
// ❌ Bad - errors crash the UI
async getRecommendations(context: RecommenderContext): Promise<Product[]> {
    const response = await fetch(url); // Throws on network error
    return response.json();
}
```

**Solution**: Catch and handle errors gracefully.

```typescript
// ✅ Good - handles errors
async getRecommendations(context: RecommenderContext): Promise<Product[]> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('[Adapter] Error fetching recommendations:', error);
        return []; // Graceful fallback
    }
}
```

### 6. Tight Coupling Between Adapters

**Problem**: One adapter directly importing another creates tight coupling.

```typescript
// ❌ Bad - tight coupling
import { EinsteinAdapter } from './einstein';

class CompositeAdapter implements YourAdapter {
    private einstein = new EinsteinAdapter(); // Direct dependency
}
```

**Solution**: Use dependency injection.

```typescript
// ✅ Good - dependency injection
class CompositeAdapter implements YourAdapter {
    constructor(
        private recommenders: RecommendersAdapter,
        private engagement: EngagementAdapter
    ) {}
}

// In initialization code
const einstein = new EinsteinAdapter();
const composite = new CompositeAdapter(einstein, einstein);
```

### 7. Missing Type Guards

**Problem**: Not validating adapter responses can cause runtime errors.

```typescript
// ❌ Bad - assumes response shape
async getRecommendations(context: RecommenderContext): Promise<Product[]> {
    const response = await this.api.call();
    return response.hits.map(hit => ({ // Can crash if hits is undefined
        productId: hit.productId,
    }));
}
```

**Solution**: Validate and provide defaults.

```typescript
// ✅ Good - validates response
async getRecommendations(context: RecommenderContext): Promise<Product[]> {
    const response = await this.api.call();
    return (response?.hits || []).map(hit => ({
        productId: hit?.productId || '',
        productName: hit?.productName || '',
        price: hit?.price || 0,
    }));
}
```

---

## Configuration Reference

### Configuration Structure

Configuration is driven by the `appConfig` object, which is typically loaded from environment variables or configuration files:

```typescript
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
                },
            },
            activeData: {
                enabled: false,
                host: 'https://your-activedata-host.com',
                siteId: 'your-site-id',
                locale: 'en-US',
                siteUUID: 'your-site-uuid',
                sourceCode: 'your-source-code',
                siteCurrency: 'USD',
                eventToggles: {
                    // ... event toggles
                },
            },
        },
    },
}
```

### Environment Variables (Optional)

While configuration is primarily driven by `appConfig`, you can use environment variables to populate it:

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
ACTIVE_DATA_LOCALE=en-US
ACTIVE_DATA_SITE_UUID=your-site-uuid
```

### Initialization Flow

Adapters are initialized lazily when first needed:

1. Component renders with `RecommendersProvider`
2. Provider calls `ensureAdaptersInitialized(config)`
3. Function checks if adapters are already initialized (idempotent)
4. If not initialized, dynamically imports `initializeEngagementAdapters`
5. `initializeEngagementAdapters` reads from `appConfig.engagement.adapters`
6. Creates adapters using factory functions (`createEinsteinAdapter`, etc.)
7. Registers adapters in the global store using `addAdapter()`
8. Provider retrieves adapter from store and sets it in context

---

## Advanced Topics

### Multiple Adapter Instances

You can register multiple instances of the same interface for different use cases:

```typescript
// Different adapters for different recommender types
const pdpAdapter = new EinsteinAdapter({ recommenderType: 'pdp' });
const homeAdapter = new EinsteinAdapter({ recommenderType: 'home' });

adapterStore.register('recommenders:pdp', pdpAdapter);
adapterStore.register('recommenders:home', homeAdapter);

// Use specific adapter in component
const pdpRecommenders = adapterStore.get<RecommendersAdapter>('recommenders:pdp');
```

### Composite Adapters

Combine multiple adapters to create fallback chains or aggregated results:

```typescript
class CompositeRecommendersAdapter implements RecommendersAdapter {
    constructor(
        private primary: RecommendersAdapter,
        private fallback: RecommendersAdapter
    ) {}

    async getRecommendations(context: RecommenderContext): Promise<Product[]> {
        try {
            // Try primary first
            const results = await this.primary.getRecommendations(context);
            if (results.length > 0) {
                return results;
            }
        } catch (error) {
            console.warn('[CompositeAdapter] Primary failed, using fallback');
        }

        // Fallback
        return this.fallback.getRecommendations(context);
    }
}

// Initialize
const einstein = new EinsteinAdapter();
const activeData = new ActiveDataAdapter({ /* config */ });
const composite = new CompositeRecommendersAdapter(einstein, activeData);
adapterStore.register('recommenders', composite);
```

### Adapter Middleware

Add cross-cutting concerns like logging, caching, or analytics:

```typescript
class LoggingAdapter implements RecommendersAdapter {
    constructor(private wrapped: RecommendersAdapter) {}

    async getRecommendations(context: RecommenderContext): Promise<Product[]> {
        console.log('[LoggingAdapter] Fetching recommendations:', context);
        const start = Date.now();

        try {
            const results = await this.wrapped.getRecommendations(context);
            console.log(`[LoggingAdapter] Fetched ${results.length} products in ${Date.now() - start}ms`);
            return results;
        } catch (error) {
            console.error('[LoggingAdapter] Error:', error);
            throw error;
        }
    }
}

// Wrap adapter with middleware
const einstein = new EinsteinAdapter();
const logged = new LoggingAdapter(einstein);
adapterStore.register('recommenders', logged);
```

---

## Summary

The adapter pattern provides:

1. **Decoupling**: Components don't depend on specific services
2. **Testability**: Easy to mock and test in isolation
3. **Flexibility**: Swap implementations without code changes
4. **Maintainability**: Changes to services don't affect components

### Key Takeaways

- Define clean, focused interfaces
- Use a functional API for the adapter store (or extend with generic class-based store)
- Provide adapters via React Context with async initialization
- Use `useState` + `useEffect` for async initialization (not `useMemo`)
- Implement two-layer hook pattern: low-level adapter hook + high-level feature hook
- Use factory functions for adapter creation (preferred over classes)
- Lazy-load adapters with `ensureAdaptersInitialized()` and dynamic imports
- Return `undefined` for graceful degradation instead of throwing errors
- Handle errors gracefully with default values
- Use configuration-driven initialization from `appConfig`
- Validate configuration at startup
- Document interfaces and usage
- Test with mock adapters

### Next Steps

1. Identify features that could benefit from adapters
2. Define your adapter interfaces
3. Implement your first adapter using factory function pattern
4. Create provider with async initialization
5. Create two-layer hooks (adapter hook + feature hook)
6. Register adapter via `initializeEngagementAdapters()` or similar
7. Use high-level hook in components
8. Write tests with mock adapters

---

## Additional Resources

- [Product Recommendations Implementation](./src/components/product-recommendations/)
- [Einstein Adapter](./src/adapters/einstein.ts)
- [Adapter Store](./src/lib/adapters/adapter-store.ts)
- [Adapter Types](./src/lib/adapters/types.ts)
- [Recommenders Provider](./src/providers/recommenders.tsx)

---

**Questions or Issues?**

If you have questions about implementing adapters or encounter issues, please:
1. Review the examples in this guide
2. Check the existing adapter implementations
3. Consult the test files for usage patterns
4. Open an issue for bugs or unclear documentation

Happy coding! 🚀
