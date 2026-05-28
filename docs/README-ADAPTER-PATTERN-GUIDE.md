# Engagement Adapter Pattern Guide

> How the adapter pattern is used for analytics and product recommendations (Einstein, Active Data).

## Overview

The **adapter pattern** decouples UI components from specific analytics/recommendation service implementations. Components call a generic interface; the adapter translates those calls into the vendor's API.

In this codebase the adapter pattern is used exclusively for **engagement** — analytics event tracking and product recommendations. Two adapters ship out of the box:

| Adapter | Purpose | Config key |
|---------|---------|------------|
| **Einstein** | Product recommendations + analytics events | `engagement.adapters.einstein` |
| **Active Data** | Analytics event tracking | `engagement.adapters.activeData` |

Both implement the same `EngagementAdapter` interface and are registered in a shared store.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Component Layer                          │
│  (ProductRecommendations, PageViewTracker, etc.)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Hook Layer                               │
│  (useRecommenders)                                          │
│  - Reads adapter from React Context                         │
│  - Provides clean API to components                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Provider Layer                           │
│  (RecommendersProvider in root.tsx)                         │
│  - Calls ensureAdaptersInitialized() on mount              │
│  - Provides adapter instance via Context                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Adapter Layer                            │
│  Store (Map<string, EngagementAdapter>)                     │
│  + Factory functions (createEinsteinAdapter, etc.)          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Component → useRecommenders() → RecommendersProvider → AdapterStore → EinsteinAdapter → SCAPI
```

---

## File Structure

```
src/lib/adapters/
├── index.ts                        # Re-exports store, types, utils
└── engagement/
    ├── types.ts                    # EngagementAdapter interface, EngagementAdapterConfig
    ├── store.ts                    # addAdapter, getAdapter, getAllAdapters, removeAdapter
    ├── einstein.ts                 # createEinsteinAdapter factory
    ├── active-data.ts              # createActiveDataAdapter factory
    ├── register.ts                 # initializeEngagementAdapters (reads config, creates + registers)
    ├── initialize.ts               # ensureAdaptersInitialized (idempotent, lazy-loads register.ts)
    └── utils.ts                    # hasConsent helper

src/providers/recommenders.tsx      # RecommendersProvider (Context + async init)
src/hooks/recommenders/
└── use-recommenders.ts             # useRecommenders hook (product recs API)
```

---

## Key Concepts

### 1. Adapter Interface

All engagement adapters implement `EngagementAdapter` (extends `EventAdapter` from the runtime SDK):

```typescript
// src/lib/adapters/engagement/types.ts
export interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (event: AnalyticsEvent, siteInfo?: EventSiteInfo, consentPreferences?: ConsentPreferences) => Promise<unknown>;
    send?: (url: string, options?: RequestInit) => Promise<Response>;
}
```

Einstein additionally implements `RecommendersAdapter` for product recommendations.

### 2. Adapter Store (Registry)

A simple `Map<string, EngagementAdapter>` with functional accessors:

```typescript
addAdapter('einstein', adapter);           // Register
getAdapter('einstein');                     // Retrieve by name
getAllAdapters();                           // All registered adapters
removeAdapter('einstein');                  // Unregister
```

### 3. Lazy Initialization

Adapter code is dynamically imported to stay out of the initial bundle:

```typescript
// src/lib/adapters/engagement/initialize.ts
export async function ensureAdaptersInitialized(appConfig: AppConfig): Promise<void> {
    if (getAllAdapters().length > 0) return;  // Already done
    const { initializeEngagementAdapters } = await import('./register');
    initializeEngagementAdapters(appConfig);
}
```

This is called by `RecommendersProvider` on mount. The dynamic `import()` means the Einstein/Active Data implementation modules are code-split into a separate chunk.

### 4. Factory Functions

Each adapter is created via a factory (not a class):

```typescript
// src/lib/adapters/engagement/einstein.ts
export function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter & RecommendersAdapter { ... }

// src/lib/adapters/engagement/active-data.ts
export function createActiveDataAdapter(config: ActiveDataConfig): EngagementAdapter { ... }
```

### 5. Provider + Hook

```typescript
// src/providers/recommenders.tsx
export function RecommendersProvider({ children, adapterName = 'einstein' }) {
    const config = useConfig<AppConfig>();
    const [adapter, setAdapter] = useState<RecommendersAdapter | undefined>(undefined);

    useEffect(() => {
        const init = async () => {
            await ensureAdaptersInitialized(config);
            setAdapter(getAdapter(adapterName) as RecommendersAdapter | undefined);
        };
        void init();
    }, [config, adapterName]);

    return <RecommendersContext.Provider value={adapter}>{children}</RecommendersContext.Provider>;
}
```

Components call `useRecommenders()` which reads from this context.

---

## Configuration

Adapters are configured in `config.server.ts` under `engagement.adapters`:

```typescript
engagement: {
    adapters: {
        einstein: {
            enabled: true,
            host: 'https://api.cquotient.com',
            einsteinId: '<your-einstein-id>',
            siteId: '<your-site-id>',
            realm: '<realm>',
            isProduction: false,
            consentCategory: 'C0004',
            eventToggles: { viewProduct: true, addToCart: true, ... },
        },
        activeData: {
            enabled: true,
            host: '<host>',
            siteUUID: '<uuid>',
            consentCategory: 'C0002',
            eventToggles: { viewProduct: true, addToCart: true, ... },
        },
    },
},
```

If an adapter's `enabled` flag is `false`, it is not registered.

---

## Testing

### Mocking Adapters in Tests

```typescript
import { addAdapter, removeAdapter } from '@/lib/adapters';

const mockAdapter: EngagementAdapter & RecommendersAdapter = {
    name: 'mock-einstein',
    sendEvent: vi.fn().mockResolvedValue(undefined),
    getRecommenders: vi.fn().mockResolvedValue([]),
    getRecommendations: vi.fn().mockResolvedValue([]),
    getZoneRecommendations: vi.fn().mockResolvedValue([]),
};

beforeEach(() => addAdapter('einstein', mockAdapter));
afterEach(() => removeAdapter('einstein'));
```

### Testing Initialization

```typescript
import { resetAdaptersInitialization } from '@/lib/adapters/engagement/initialize';

afterEach(() => resetAdaptersInitialization());  // Clear cached promise for clean state
```

---

## Adding a New Engagement Adapter

1. Create `src/lib/adapters/engagement/your-adapter.ts` with a factory function returning `EngagementAdapter`
2. Register it in `src/lib/adapters/engagement/register.ts` inside `initializeEngagementAdapters()`
3. Add configuration under `engagement.adapters.yourAdapter` in `config.server.ts`
4. If it provides recommendations, also implement `RecommendersAdapter`

