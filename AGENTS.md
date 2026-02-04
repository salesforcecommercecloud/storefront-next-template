# Template Retail RSC App

This is a React Server Component (RSC) template application for Salesforce Commerce Cloud built with React Router v7, providing a modern, performant storefront experience.

> **Architecture & Patterns:** See [CLAUDE.md](./CLAUDE.md) for comprehensive architecture documentation, key patterns (Adapter Pattern, Page Designer, Configuration), and common workflows.

## Project Structure

- `./src/` - Application source code
  - `./src/routes/` - React Router routes (file-based routing)
  - `./src/components/` - React components
  - `./src/lib/` - Shared utilities, hooks, and business logic
  - `./src/config/` - Configuration files
  - `./src/extensions/` - Optional feature extensions
- `./.storybook/` - Storybook configuration and stories
- `./public/` - Static assets

## Common Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm dev

# Start development server with Node debugger
pnpm dev:debug

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm typecheck
```

## Commands for Coding Agents

These commands produce condensed output optimized for AI coding agents:

```bash
# Run unit tests (minimal output - only summary)
pnpm test:agent

# Run unit tests with coverage
pnpm test:agent:coverage

# Run Storybook snapshot tests
pnpm test-storybook:snapshot:agent

# Update Storybook snapshots
pnpm test-storybook:snapshot:update:agent

# Run Storybook interaction tests
pnpm test-storybook:interaction:agent

# Run Storybook a11y tests
pnpm test-storybook:a11y:agent

# Lint (use verbose command - no condensed version available)
pnpm lint
```

## Verbose Commands (Debugging/CI)

Use these for detailed output during debugging or in CI pipelines:

```bash
# Run unit tests with full output and coverage
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run unit tests with UI
pnpm test:ui

# Run Storybook snapshot tests (verbose)
pnpm test-storybook:snapshot

# Update Storybook snapshots (verbose)
pnpm test-storybook:snapshot:update

# Run Storybook interaction tests (verbose)
pnpm test-storybook:interaction

# Run Storybook a11y tests (verbose)
pnpm test-storybook:a11y

# Run static Storybook tests (CI mode)
pnpm test-storybook:static:interaction
pnpm test-storybook:static:a11y

# Lint with full output
pnpm lint

# Lint and auto-fix issues
pnpm lint:fix

# Check for color utility violations
pnpm lint:colors

# Check TypeScript file extensions
pnpm lint:check-extensions

# Bundle size analysis
pnpm bundlesize:analyze

# Bundle size test
pnpm bundlesize:test

# Lighthouse CI
pnpm lighthouse:ci
```

## Storybook

```bash
# Start Storybook development server
pnpm storybook

# Build static Storybook
pnpm build-storybook

# Generate story test files
pnpm generate:story-tests
```

## Copyright Header

All TypeScript/JavaScript source files must include this exact copyright header block:

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

The header is enforced by ESLint. See [docs/README-ESLINT.md](./docs/README-ESLINT.md) for details.

## Platform Versions

Key platform and framework versions:

- **Node.js**: `>=24.0.0` (managed by Volta)
- **React**: `19.2.3`
- **React Router**: `7.12.0` (file-based routing)
- **Tailwind CSS**: `4.1.13`
- **Vite**: `7.1.7`
- **Vitest**: `4.0.18`
- **Storybook**: `10.0.6`
- **Package Manager**: `pnpm`

## Setup/Packaging

- Use `pnpm` over `npm` for package management
- Node.js version `>=24.0.0` required (managed by Volta)
- The project uses React Router v7 with file-based routing
- Tailwind CSS v4 for styling
- Vite for build tooling
- Vitest for unit testing
- Storybook for component development and testing

## Testing

This project uses multiple testing strategies:

### Unit Tests (Vitest)
- Test files: `*.test.ts`, `*.test.tsx`
- Run with `pnpm test` (verbose) or `pnpm test:agent` (condensed)
- Uses React Testing Library, jsdom, and MSW for API mocking

### Storybook Tests
- **Snapshot tests**: Visual regression testing of component renders
- **Interaction tests**: User interaction testing with `play` functions
- **A11y tests**: Accessibility violation detection with axe-core

See [docs/README-TESTS.md](./docs/README-TESTS.md) and [.storybook/README-STORYBOOK.md](./.storybook/README-STORYBOOK.md) for detailed testing patterns.

## Key Documentation

- [README.md](./README.md) - Main documentation and getting started
- [docs/README-TESTS.md](./docs/README-TESTS.md) - Testing strategy and patterns
- [docs/README-ESLINT.md](./docs/README-ESLINT.md) - Linting rules and configuration
- [docs/README-AUTH.md](./docs/README-AUTH.md) - Authentication patterns
- [docs/README-I18N.md](./docs/README-I18N.md) - Internationalization and localization
- [docs/README-DATA.md](./docs/README-DATA.md) - Data fetching with adapters
- [docs/README-PERFORMANCE.md](./docs/README-PERFORMANCE.md) - Performance optimization
- [docs/README-ADAPTER-PATTERN-GUIDE.md](./docs/README-ADAPTER-PATTERN-GUIDE.md) - Adapter pattern for API integration
- [docs/README-STORY-COVERAGE.md](./docs/README-STORY-COVERAGE.md) - Storybook coverage tracking
- [.storybook/README-STORYBOOK.md](./.storybook/README-STORYBOOK.md) - Storybook setup and best practices

## Styling Guidelines

- Use Tailwind CSS utility classes for styling
- Design tokens are defined in CSS variables
- Use `cn()` utility from `@/lib/utils` to merge class names
- Avoid hard-coded colors; use design tokens (e.g., `bg-foreground`, `text-muted-foreground`)
- Responsive breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`

## Component Patterns

### Page Designer Components
Components decorated with `@Component`, `@AttributeDefinition`, and `@RegionDefinition` decorators are Page Designer components that can be used in Commerce Cloud Page Designer.

### Adapter Pattern
Data fetching follows the adapter pattern. See [docs/README-ADAPTER-PATTERN-GUIDE.md](./docs/README-ADAPTER-PATTERN-GUIDE.md) for details on creating adapters.

### UI Components
Reusable UI components are in `./src/components/ui/` and follow Radix UI + Tailwind patterns. See [./src/components/ui/README.md](./src/components/ui/README.md).

## Development Workflow

1. **Component Development**: Use Storybook for isolated component development
   ```bash
   pnpm storybook
   ```

2. **Testing**: Write tests alongside component development
   - Unit tests in `*.test.tsx`
   - Storybook stories in `stories/*.stories.tsx`
   - Add interaction tests to stories with `play` functions
   - Ensure accessibility with a11y addon

3. **Type Safety**: Run type checking before committing
   ```bash
   pnpm typecheck
   ```

4. **Linting**: Fix linting issues
   ```bash
   pnpm lint:fix
   ```

5. **Bundle Size**: Monitor bundle size impacts
   ```bash
   pnpm bundlesize:test
   ```

## Agent Command Summary

For quick reference, use these condensed commands during development:

| Command | Purpose | Output Lines |
|---------|---------|--------------|
| `pnpm test:agent` | Unit tests | Last 30 lines |
| `pnpm test:agent:coverage` | Unit tests + coverage | Last 40 lines |
| `pnpm test-storybook:snapshot:agent` | Snapshot tests | Last 30 lines |
| `pnpm test-storybook:interaction:agent` | Interaction tests | Last 20 lines (PASS/FAIL only) |
| `pnpm test-storybook:a11y:agent` | A11y tests | Last 20 lines (violations only) |

All agent commands filter output to show only essential information: test results, failures, and summaries.
