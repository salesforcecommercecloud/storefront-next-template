# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Quick Command Reference:** See [AGENTS.md](./AGENTS.md) for agent-optimized command outputs and platform version information.

## Overview

This is a storefront template for Salesforce Commerce Cloud built with React Router v7, React 19, Tailwind CSS v4, and Commerce Cloud SCAPI integration.

## Essential Commands

> **Tip:** Use agent-optimized test commands (e.g., `pnpm test:agent`) for condensed output. See [AGENTS.md](./AGENTS.md) for complete command reference.

```bash
# Development
pnpm dev                        # Start dev server at http://localhost:5173
pnpm build                      # Build for production
pnpm push                       # Deploy to Commerce Cloud Managed Runtime

# Testing
pnpm test:agent                 # Unit tests (condensed output)
pnpm test                       # Unit tests (verbose)
pnpm test-storybook:interaction:agent  # Interaction tests (condensed)
pnpm test-storybook:a11y:agent         # A11y tests (condensed)

# Code Quality
pnpm lint                       # Run ESLint
pnpm typecheck                  # TypeScript type checking

# Storybook
pnpm storybook                  # Start Storybook dev server at :6006
```

## Architecture

### Core Technologies
- **React 19.2.3**
- **React Router 7.12.0** with file-based routing
- **Tailwind CSS 4.1.13** with design tokens
- **Node.js 24+** (managed via Volta)
- **pnpm** for package management
- **Vite 7.1.7** for build tooling
- **Vitest 4.0.18** for unit testing
- **Storybook 10.0.6** for component development

### Key Architectural Patterns

#### 1. Adapter Pattern for Data Fetching
Components use adapters to abstract third-party service implementations (Einstein, Active Data, custom). This enables:
- Swappable implementations without changing component code
- Configuration-driven behavior changes
- Easy testing via adapter mocks
- Multiple simultaneous instances (A/B testing, fallbacks)

**Structure:**
```
Component → Hook → Provider → Adapter Registry → Concrete Adapter
```

**Key Files:**
- `src/lib/adapter-registry/` - Adapter registration and lifecycle
- `src/hooks/use-*.ts` - Hooks consuming adapter context
- `src/providers/*-provider.tsx` - Providers managing adapter instances

See `docs/README-ADAPTER-PATTERN-GUIDE.md` for implementation details.

#### 2. Page Designer Integration
Components decorated with `@Component`, `@AttributeDefinition`, and `@RegionDefinition` are Page Designer components that can be configured in Commerce Cloud Page Designer.

**Decorators:**
- `@Component(typeId, metadata)` - Registers component with Page Designer
- `@AttributeDefinition(config)` - Defines configurable component properties
- `@RegionDefinition(regions)` - Defines component regions for nested content

**Example:**
```typescript
@Component('hero', { name: 'Hero Banner' })
@RegionDefinition([])
export class HeroMetadata {
    @AttributeDefinition({ type: 'string' })
    title?: string;
}
```

Metadata is extracted via `pnpm generate:cartridge` and synced to Page Designer.

#### 3. Configuration System
All settings defined in `config.server.ts` can be overridden via environment variables with `PUBLIC__` prefix.

**Syntax:**
```bash
PUBLIC__app__site__locale=en-GB    # Maps to config.app.site.locale
```

**Usage:**
- In components: `useConfig()` hook
- In loaders/actions: `getConfig(context)` function
- Client-side: `window.__APP_CONFIG__`

**Security:**
- `PUBLIC__` prefix → Exposed to browser (client IDs, feature flags, locales)
- No prefix → Server-only (secrets, private keys, credentials)

See `docs/README-CONFIG.md` for complete documentation.

#### 4. File-Based Routing
Routes are defined in `src/routes/` using React Router v7 conventions:

```
src/routes/
├── _app.tsx                    # Root layout
├── _app._index.tsx             # Homepage (/)
├── _app.product.$productId.tsx # Product detail (/product/:productId)
└── _app.category.$categoryId.tsx # Category (/category/:categoryId)
```

**Naming Conventions:**
- `_app.` prefix - Layout boundary
- `$param` - Dynamic route segment
- `_index` - Index route

#### 5. Testing Strategy
Three testing approaches:

**Unit Tests (Vitest):**
- Files: `*.test.ts`, `*.test.tsx`
- Uses React Testing Library, jsdom, MSW for API mocking

**Storybook Snapshot Tests:**
- Visual regression testing via addon-vitest
- Auto-generated snapshots from stories

**Storybook Interaction Tests:**
- User interaction testing via `play` functions
- Uses Testing Library queries

**Storybook A11y Tests:**
- Accessibility violation detection via axe-core
- Runs automatically in stories

See `docs/README-TESTS.md` for testing patterns.

## File Organization

```
src/
├── components/              # React components
│   ├── ui/                 # Reusable UI primitives (Radix UI + Tailwind)
│   └── [feature]/          # Feature-specific components
│       ├── index.tsx       # Main component
│       ├── skeleton.tsx    # Loading state
│       └── stories/        # Storybook stories
├── routes/                 # React Router file-based routes
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities, helpers, business logic
│   ├── adapters/          # Adapter implementations
│   ├── adapter-registry/  # Adapter registration system
│   └── decorators/        # Page Designer decorators
├── providers/              # React context providers
├── config/                 # Configuration system
├── extensions/             # Optional feature extensions
└── locales/                # i18n translation files

.storybook/                 # Storybook configuration
docs/                       # Documentation
```

## Performance & Data Rules

These rules take priority when designing routes, components, and state. Apply them as a checklist for every route module and every component that consumes async data. See [Data Fetching](./docs/README-DATA.md), [Loading States](./docs/README-SUSPENSE.md), [State Management](./docs/README-STATE.md), and [Performance](./docs/README-PERFORMANCE.md) for full context.

### Data Loading

1. **Server-load everything.** All initial data must come from server `loader` functions — never `useEffect`, `fetch`, or other client-side fetching for data needed on first render.
2. **Classify every data field per route.** Critical data (SEO, LCP, CLS, HTTP status) is `await`ed in the loader. Non-critical data is returned as an unresolved Promise. Interaction-driven data is fetched via `useFetcher` on user action.
3. **Never block the loader on non-critical data.** Return the Promise directly — don't `await` recommendations, reviews, or below-the-fold content.
4. **Export `shouldRevalidate` on routes with URL-driven filtering.** Prevent redundant loader re-execution when only search params change and the loader already handles them on the next navigation.
5. **No `clientLoader` or `clientAction`.** Only server `loader` and server `action` exports are permitted in route modules.

### Rendering & Visual Stability

6. **One `<Suspense>` boundary per async operation.** Never place multiple `use()` calls or `<Await>` components inside a single `<Suspense>` boundary — each deferred Promise gets its own boundary and its own skeleton. See [Suspense Boundary Granularity](./docs/README-SUSPENSE.md#suspense-boundary-granularity) for examples and anti-patterns.
7. **Skeleton screens for known layouts, spinners for indeterminate operations.** If the shape of the resolved content is known, use a skeleton. Spinners are only for global or unknown-layout loading states.
8. **Above the fold: avoid `fallback={null}` without reserving space.** Rendering nothing and then injecting content causes CLS. If no visual fallback is desired, the container must maintain explicit dimensions (`minHeight`, aspect ratio).
9. **Below the fold: prefer `fallback={null}` or a simple placeholder.** Users don't perceive layout shift for content they can't see, and complex skeletons add hydration cost without visible benefit.

### Mutations & Interactions

10. **Navigating mutations: `action` + `<Form>`.** Non-navigating mutations: `useFetcher`. Never mix these — the choice determines whether React Router triggers a route transition.
11. **Prefer optimistic UI when failure is unlikely and reversible.** Use `fetcher.formData` for simple optimistic reads, `useOptimistic` for complex state transformations (e.g., list insertions).

### State Management

12. **URL-worthy state goes in `useSearchParams`, not `useState`.** Filters, pagination, sort order, and modal visibility belong in the URL — they must survive refresh and be shareable.
13. **Never store derived state in `useState`.** Compute inline or use `useMemo` for expensive derivations. A second source of truth is a bug waiting to happen.
14. **Split React Contexts by concern.** One context per domain (theme, locale, user) — never a single large `AppContext`. Every value change re-renders all consumers of that context.
15. **Persistent cross-request state via cookies/sessions, not `localStorage`.** Cookies are SSR-compatible, avoid hydration mismatches, and work before scripts load.

### Best Practices

16. **Lazy-load overlays and heavy below-the-fold content.** Use `React.lazy()` with deferred mounting — only mount the `<Suspense>` subtree after the first user interaction. See [Lazy Loading for Overlays](./docs/README-SUSPENSE.md#lazy-loading-for-overlays-modals-drawers-dialogs).
17. **Self-host web fonts.** Use WOFF2 variable fonts, preload in `<head>`, inline the `@font-face` declaration, and set `font-display: swap` or `optional`. Never load fonts from third-party CDNs (cache partitioning, GDPR).
18. **Never load third-party scripts synchronously.** Always use `async` or `defer`. Lazy-load interaction-driven widgets (chat, social) on scroll or click, not on page load.
19. **Monitor bundle size.** Run `pnpm bundlesize:test` to verify against configured size limits — CI enforces these on every PR. Check bundle impact with `pnpm bundlesize:analyze` before adding large dependencies.
20. **Configure resource hints via `config.server.ts`.** Use `preconnect` for origins contacted on every page (e.g., image CDN), `dns-prefetch` for optional origins. Don't preconnect to origins that aren't used on every page.

## Code Conventions

### Copyright Header
All TypeScript/JavaScript files must include:

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
```

Enforced by ESLint via `eslint-plugin-header`.

### Component Patterns

#### Lazy Loading for Overlays (Modals, Drawers, Dialogs)

Overlay components hidden on initial render **must** use `React.lazy()` with deferred mounting — only mount the `<Suspense>` subtree after the first user interaction. See [Lazy Loading for Overlays](./docs/README-SUSPENSE.md#lazy-loading-for-overlays-modals-drawers-dialogs) for the pattern, anti-patterns, and rationale.

#### Component Exports

```typescript
// ✅ Prefer default export for components
export default function MyComponent() {}

// ✅ Named exports for types/utilities
export interface MyComponentProps {}
```

**Styling:**
- Use Tailwind utility classes
- Use design tokens: `bg-foreground`, `text-muted-foreground` (not hard-coded colors)
- Use `cn()` utility from `@/lib/utils` to merge class names
- Responsive breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`

#### Site-context-aware navigation — use project wrappers, not React Router originals

This project provides `Link`, `NavLink` (from `@/components/link`) and `useNavigate` (from `@/hooks/use-navigate`) that automatically apply site/locale URL prefixes via `buildUrl`. Always use these instead of the React Router originals:

```typescript
// ✅ Correct — site-context-aware
import { Link, NavLink } from '@/components/link';
import { useNavigate } from '@/hooks/use-navigate';

// ❌ Wrong — bypasses site context, produces unprefixed URLs
import { Link, NavLink, useNavigate } from 'react-router';
```

**Type-safe URL construction with `href()`:**

Use React Router's `href()` for type-safe route param interpolation. Combine it with the project's `Link`/`NavLink` wrappers — `href()` gives type-safe params, the wrapper adds the site-context prefix:

```typescript
import { href } from 'react-router';
import { Link } from '@/components/link';

// ✅ Type-safe params + automatic site prefix → /global/en-GB/product/123
<Link to={href('/product/:id', { id: product.id })}>Product</Link>

// ✅ Also works with useNavigate
import { useNavigate } from '@/hooks/use-navigate';
const navigate = useNavigate();
navigate(href('/product/:id', { id: product.id }));

// ❌ Wrong — no type safety for params, typos not caught at compile time
<Link to={`/product/${product.id}`}>Product</Link>
```

- `href()` is a pure function — it only interpolates params into the pattern, it does not add site/locale context
- The site-context prefix is applied by the `Link`/`NavLink`/`useNavigate` wrappers at render time

### i18n
```typescript
import { useTranslation } from 'react-i18next';

export default function MyComponent() {
    const { t } = useTranslation();
    return <h1>{t('myComponent.title')}</h1>;
}
```

Translation files in `src/locales/[locale]/translations.json`.

### Forms
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email(),
});

export default function MyForm() {
    const form = useForm({
        resolver: zodResolver(schema),
    });
    // ...
}
```

## Extensions System

Extensions are modular features in `src/extensions/`. Each extension:
- Contains self-contained feature code
- Can add routes in `src/extensions/[ext]/routes/`
- Can inject components via `target-config.json`
- Can provide context via custom providers
- Supports i18n in `src/extensions/[ext]/locales/`

Extensions are marked with special comments in core code:
```typescript
/** @sfdc-extension-line SFDC_EXT_FEATURE_NAME */
{/* @sfdc-extension-block-start SFDC_EXT_FEATURE_NAME */}
{/* @sfdc-extension-block-end SFDC_EXT_FEATURE_NAME */}
```

See `src/extensions/README.md` for details.

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.default .env
   ```

2. **Set required Commerce Cloud credentials in `.env`:**
   ```bash
   PUBLIC__app__commerce__api__clientId=your-client-id
   PUBLIC__app__commerce__api__organizationId=your-org-id
   PUBLIC__app__commerce__api__shortCode=your-short-code
   ```

3. **Install and run:**
   ```bash
   pnpm install
   pnpm dev
   ```

## Key Documentation

- [AGENTS.md](./AGENTS.md) — Quick reference for AI coding agents
- [README.md](./README.md) — Main project documentation

**Architecture & Patterns:**
- [docs/README-DATA.md](./docs/README-DATA.md) — Data fetching: loaders, actions, fetchers, middlewares, cookies/sessions
- [docs/README-SUSPENSE.md](./docs/README-SUSPENSE.md) — Loading states, Suspense patterns, visual feedback
- [docs/README-STATE.md](./docs/README-STATE.md) — State management: server state, URL state, optimistic UI, React primitives
- [docs/README-ADAPTER-PATTERN-GUIDE.md](./docs/README-ADAPTER-PATTERN-GUIDE.md) — Adapter implementation guide
- [docs/README-CUSTOM-APIS.md](./docs/README-CUSTOM-APIS.md) — Custom SCAPI clients
- [docs/README-CONFIG.md](./docs/README-CONFIG.md) — Configuration system
- [docs/README-CONFIG-OPTIONS.md](./docs/README-CONFIG-OPTIONS.md) — Configuration options reference
- [docs/README-AUTH.md](./docs/README-AUTH.md) — Authentication patterns
- [docs/README-I18N.md](./docs/README-I18N.md) — Internationalization
- [docs/README-MULTI-SITE.md](./docs/README-MULTI-SITE.md) — Site context and locale URL routing

**UI & Frontend:**
- [docs/README-UI-STYLING.md](./docs/README-UI-STYLING.md) — UI and styling (Tailwind, shadcn, design tokens)
- [docs/README-IMAGES.md](./docs/README-IMAGES.md) — Image rendering and alt text strategy
- [docs/README-SEO.md](./docs/README-SEO.md) — SEO: page titles, meta tags, canonical URLs
- [docs/README-PERFORMANCE.md](./docs/README-PERFORMANCE.md) — Performance best practices: web fonts, third-party scripts, bundle optimization
- [docs/README-PERFORMANCE-METRICS.md](./docs/README-PERFORMANCE-METRICS.md) — Performance monitoring (metrics, Server-Timing, timeline)
- [README-PAGE-DESIGNER.md](./README-PAGE-DESIGNER.md) — Page Designer component development

**Testing & Quality:**
- [docs/README-TESTS.md](./docs/README-TESTS.md) — Testing strategy and patterns
- [docs/README-ESLINT.md](./docs/README-ESLINT.md) — ESLint configuration and TypeScript enforcement
- [docs/README-STORY-COVERAGE.md](./docs/README-STORY-COVERAGE.md) — Story coverage and code quality enforcement
- [.storybook/README-STORYBOOK.md](./.storybook/README-STORYBOOK.md) — Storybook setup and best practices

**Development:**
- [docs/README-HYBRID-PROXY.md](./docs/README-HYBRID-PROXY.md) — Hybrid proxy for local development
- [src/extensions/README.md](./src/extensions/README.md) — Extensions system

## Common Workflows

### Creating a New Component

1. Create component file: `src/components/my-feature/index.tsx`
2. Add Storybook story: `src/components/my-feature/stories/index.stories.tsx`
3. Add unit tests: `src/components/my-feature/index.test.tsx`
4. Add skeleton if async: `src/components/my-feature/skeleton.tsx`

### Creating a Page Designer Component

1. Create component with decorators:
   ```typescript
   @Component('myComponent', { name: 'My Component' })
   @RegionDefinition([])
   export class MyComponentMetadata {
       @AttributeDefinition()
       title?: string;
   }

   export default function MyComponent({ title }: { title?: string }) {
       return <div>{title}</div>;
   }
   ```

2. Generate cartridge metadata:
   ```bash
   pnpm generate:cartridge
   ```

### Implementing an Adapter

1. Create adapter interface in `src/lib/adapters/[feature]/adapter.ts`
2. Create concrete implementation in `src/lib/adapters/[feature]/[impl]-adapter.ts`
3. Register in `src/lib/adapter-registry/[feature]/registry.ts`
4. Create provider in `src/providers/[feature]-provider.tsx`
5. Create hook in `src/hooks/use-[feature].ts`
6. Configure in `config.server.ts`

See `docs/README-ADAPTER-PATTERN-GUIDE.md` for complete implementation guide.

### Adding a UITarget

UITargets are extension points that allow extensions to inject or wrap UI in the storefront.

1. Add the target in your component:
   ```tsx
   // Insertion point — extension adds new UI here
   <UITarget targetId="my.feature.slot" />

   // Wrapper point — extension can enhance existing UI
   <UITarget targetId="my.feature.slot">
       <ExistingContent />
   </UITarget>
   ```

2. Sync the smoke test config (adds new entries, never overwrites existing hints):
   ```bash
   pnpm --filter template-retail-rsc-app smoke-test:generate
   ```
   New targets are tagged with the current branch name as their hint. Existing entries are preserved exactly as-is.

3. Visually inspect UITargets during development:
   ```bash
   pnpm --filter template-retail-rsc-app dev:ui-targets
   ```
   A floating overlay appears on every page with a live count and filter buttons grouping targets by branch/PR hint.

4. Verify via smoke test (works in any environment, no env var needed):
   ```
   http://localhost:5173/any-page?uiTargetSmoke=1
   ```
   Red markers appear for every registered UITarget slot.

### Running Tests for a Single Component

```bash
# Unit tests
pnpm test src/components/my-component

# Watch mode
pnpm test:watch src/components/my-component

# Storybook interaction tests for specific story
pnpm test-storybook:interaction -- --testNamePattern="My Component"
```

## Deployment

Deploy to Commerce Cloud Managed Runtime:

```bash
pnpm build
pnpm push
```

Set environment variables in MRT Runtime Admin using the same `PUBLIC__` syntax as local `.env` file.
