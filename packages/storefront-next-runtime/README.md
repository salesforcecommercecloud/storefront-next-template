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

### `/design` Page Designer Integration

TBD.

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
