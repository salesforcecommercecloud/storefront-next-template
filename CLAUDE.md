# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Quick Command Reference:** See [AGENTS.md](./AGENTS.md) for agent-optimized command outputs and platform version information.

## Overview

This is a React Server Component (RSC) storefront template for Salesforce Commerce Cloud built with React Router v7, React 19, Tailwind CSS v4, and Commerce Cloud SCAPI integration.

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
- **React 19.2.3** with Server Components
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
PUBLIC__app__site__locale=en-US    # Maps to config.app.site.locale
```

**Usage:**
- In components: `useConfig()` hook
- In loaders/actions: `getConfig(context)` function
- Client-side: `window.__APP_CONFIG__`

**Security:**
- `PUBLIC__` prefix → Exposed to browser (client IDs, feature flags, locales)
- No prefix → Server-only (secrets, private keys, credentials)

See `src/config/README.md` for complete documentation.

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

**Server vs Client Components:**
```typescript
// Server Component (default) - no directive needed
export default function ServerComponent() {
    // Can be async, no hooks, no event handlers
}

// Client Component - requires directive
"use client"
export default function ClientComponent() {
    // Can use hooks and event handlers, cannot be async
}
```

**Styling:**
- Use Tailwind utility classes
- Use design tokens: `bg-foreground`, `text-muted-foreground` (not hard-coded colors)
- Use `cn()` utility from `@/lib/utils` to merge class names
- Responsive breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`

**Component Exports:**
```typescript
// ✅ Prefer default export for components
export default function MyComponent() {}

// ✅ Named exports for types/utilities
export interface MyComponentProps {}
```

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
- Can inject components via `plugin-config.json`
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
   PUBLIC__app__commerce__api__siteId=your-site-id
   ```

3. **Install and run:**
   ```bash
   pnpm install
   pnpm dev
   ```

## Key Documentation

- [AGENTS.md](./AGENTS.md) - Quick reference for AI coding agents
- [README.md](./README.md) - Main project documentation
- [docs/README-DATA.md](./docs/README-DATA.md) - Data fetching with adapters
- [docs/README-AUTH.md](./docs/README-AUTH.md) - Authentication patterns
- [docs/README-I18N.md](./docs/README-I18N.md) - Internationalization
- [docs/README-TESTS.md](./docs/README-TESTS.md) - Testing strategy
- [docs/README-ADAPTER-PATTERN-GUIDE.md](./docs/README-ADAPTER-PATTERN-GUIDE.md) - Adapter implementation guide
- [src/config/README.md](./src/config/README.md) - Configuration system
- [.storybook/README-STORYBOOK.md](./.storybook/README-STORYBOOK.md) - Storybook patterns

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
