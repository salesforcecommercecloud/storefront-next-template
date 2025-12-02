# @salesforce/storefront-next-runtime

Runtime-agnostic libraries for SFCC Storefront Next, providing core functionality for Page Designer integration, SCAPI client generation, and component management.

## Overview

This package provides the foundational runtime libraries for building Salesforce Commerce Cloud (SFCC) Storefront Next applications. It includes:

- **Page Designer Integration**: Real-time communication APIs and React components for visual editing
- **SCAPI Client**: Type-safe, auto-generated API clients for Salesforce Commerce APIs

## Installation

```bash
pnpm add @salesforce/storefront-next-runtime
```

## Requirements

- Node.js >= 22.0.0
- React >= 19.0.0
- React DOM >= 19.0.0

## Modules

### `/design/messaging` Page Designer Messaging API

Provides a communication layer between the Page Designer host application and client applications. Enables real-time messaging for design-time interactions, component selection, property updates, and synchronization between the visual editor and the running application.

### `/design/mode` Design Mode Detection

Utilities for detecting and managing the current application mode (Design or Preview). Allows components to conditionally render design-time features and optimize bundle size by excluding design-time code during runtime execution.

### `/design/react` Design-Time React Components

React components and utilities for Page Designer integration. Provides design-time components, type definitions, and runtime utilities. Most components are lazy-loaded from `/design/react/core` to minimize bundle size, while types and essential runtime components are available directly from this module.

### `/design/react/core` Core React Components

Entry point for React Page Designer integration. Exports only the minimal set of components required for Page Designer functionality to prevent bundling design-time code during runtime when not in design mode. Components from `/design/react` are dynamically loaded when design mode is active.

### `/design/styles.css` Page Designer Styles

CSS stylesheet containing design layer styles for Page Designer integration. Provides visual overlays, selection indicators, and design-time UI elements. Can be imported and consumed in various ways depending on your bundler configuration and build setup.

### `/scapi-client` SCAPI Client

Type-safe, auto-generated API clients for Salesforce Commerce APIs with operation-based method names.

For detailed technical documentation, architecture details, and update procedures, see [SCAPI Client Documentation](./src/scapi-client/README.md).

**Key Features:**

- Type-safe API calls with full TypeScript support
- Intuitive operation names instead of HTTP method + path
- Auto-generated from OpenAPI specifications
- Built on [openapi-fetch](https://github.com/drwpow/openapi-typescript/tree/main/packages/openapi-fetch)

**Example Usage:**

```typescript
import { createCommerceApiClients } from '@salesforce/storefront-next-runtime/scapi-client';

// Initialize clients
const clients = createCommerceApiClients({
  baseUrl: 'https://kv7kzm78.api.commercecloud.salesforce.com',
});

// Add authentication middleware
const token = 'your-auth-token';
clients.use({
  onRequest({ request }) {
    request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
});

// Call operations using intuitive method names
const response = await clients.shopperProducts.getCategories({
  params: {
    path: {
      organizationId: 'f_ecom_zzrf_001',
    },
    query: {
      ids: ['root'],
      siteId: 'RefArchGlobal',
    },
  }
});

// Fully typed response
console.log(response.data); // CategoryResult type
```

**Generating SCAPI Clients:**

```bash
pnpm scapi:generate
```

## Development

### Build

```bash
pnpm build
```

### Development Mode

Watch mode for rapid development:

```bash
pnpm dev
```

### Testing

```bash
# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run tests with coverage
pnpm test:unit
```

### Linting

```bash
# Check for issues
pnpm lint

# Fix issues automatically
pnpm lint:fix
```

### Clean Build Artifacts

```bash
pnpm clean
```

## Architecture

### Build Configuration

Built using [tsdown](https://github.com/egoist/tsdown) for optimal bundling:

- **Module Format**: ESM
- **Target**: ES2022
- **TypeScript**: Strict mode enabled
- **Output**: Type declarations with source maps
