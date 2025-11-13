# SCAPI Client

A type-safe, operation-based API client for Salesforce Commerce Cloud Shopper APIs (SCAPI), built on top of `openapi-fetch` with custom operation mapping and TypeScript Proxy-based method routing.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Libraries Used](#libraries-used)
- [Why Operation-Based Interface?](#why-operation-based-interface)
- [How It Works](#how-it-works)
  - [Type Generation](#type-generation)
  - [Operation Mapping Generation](#operation-mapping-generation)
  - [Proxy Client Creation](#proxy-client-creation)
- [The Proxy Implementation](#the-proxy-implementation)
- [Why proxy-types.ts?](#why-proxy-typests)
- [Package Scripts](#package-scripts)
- [Usage Examples](#usage-examples)
- [Updating to New OpenAPI Specifications](#updating-to-new-openapi-specifications)
- [API Options and Middleware](#api-options-and-middleware)
- [References](#references)

## Overview

The SCAPI client provides a developer-friendly, type-safe interface for calling Salesforce Commerce Cloud Shopper APIs. Instead of using generic HTTP methods with path strings, developers can call operations by their semantic names with full TypeScript autocomplete and type checking.

## Architecture

The SCAPI client architecture consists of several layers:

1. **OpenAPI Specifications** - YAML files defining the SCAPI endpoints
2. **Generated TypeScript Types** - Type definitions generated from OpenAPI specs
3. **Generated Operation Maps** - Runtime mappings between operation names and HTTP methods/paths
4. **Proxy Client Wrapper** - JavaScript Proxy that intercepts method calls and routes them to the appropriate HTTP methods
5. **Type-Safe Client API** - The final exported clients with full type inference

```
OpenAPI Spec (.yaml)
        ↓
openapi-typescript (generates types)
        ↓
TypeScript Definitions (.ts)
        ↓
generate-operation-maps.ts (extracts runtime mappings)
        ↓
Operation Maps (.operations.ts)
        ↓
createClient (wraps with Proxy)
        ↓
Type-Safe Operation Methods
```

## Libraries Used

### [openapi-fetch](https://openapi-ts.dev/openapi-fetch/)

A lightweight, type-safe fetch client for OpenAPI 3.x specifications. Key features:

- Full TypeScript type inference from OpenAPI schemas
- Built on native `fetch` API
- Middleware support for request/response interception
- Minimal runtime overhead
- Native support for parameters, headers, and response types

**Why openapi-fetch?**
- Native TypeScript support with excellent type inference
- Zero dependencies beyond native fetch
- Flexible middleware system
- Good balance between features and bundle size

### [openapi-typescript](https://openapi-ts.dev/introduction)

A tool that generates TypeScript types from OpenAPI specifications. It transforms OpenAPI YAML/JSON into TypeScript interfaces and types.

**Generated structure:**
```typescript
export interface paths {
  "/organizations/{organizationId}/products": {
    get: operations["getProducts"];
    // ... other HTTP methods
  };
}

export interface operations {
  getProducts: {
    parameters: { /* ... */ };
    responses: { /* ... */ };
  };
}
```

**Why openapi-typescript?**
- Zero runtime overhead (types only)
- Accurate type generation from OpenAPI specs
- Supports OpenAPI 3.x features
- Integrates seamlessly with openapi-fetch

## Why Operation-Based Interface?

The `openapi-typescript` generator provides excellent type definitions but does **not** include runtime mappings between operation names and their corresponding paths/methods. The generated types require you to use the path-based syntax:

```typescript
client.GET('/organizations/{organizationId}/products', options)
```

However, OpenAPI specifications define semantic operation names (like `getProducts`, `createBasket`) via the `operationId` field. An operation-based interface is more:

- **Developer-friendly**: Semantic method names are easier to discover and remember
- **Refactor-safe**: Path changes don't break calling code
- **IDE-friendly**: Better autocomplete and documentation tooltips
- **Self-documenting**: Method names describe what the operation does

To achieve this, we added an extra build step that:

1. Parses the generated TypeScript type definitions
2. Extracts the runtime mapping between operation names, HTTP methods, and path templates
3. Generates operation map files with this runtime information
4. Uses these maps to create a Proxy-based client that transforms operation calls into HTTP method calls

## How It Works

### Type Generation

TypeScript types are generated using `openapi-typescript` with configuration in `redocly.yaml`:

```yaml
apis:
  shopper-products-v1:
    root: ./shopper-products-oas-1.0.37/shopper-products-oas-v1-public.yaml
    x-openapi-ts:
      output: ../src/scapi-client/generated/shopper-products-v1.ts
```

Running `pnpm scapi:generate-types`:

This generates TypeScript files like `shopper-products-v1.ts` containing:
- `paths` interface - Maps URL paths to operations
- `operations` interface - Defines request/response types for each operation
- `components` interface - Shared schemas, parameters, etc.

### Operation Mapping Generation

Since `openapi-typescript` doesn't provide runtime path-to-operation mappings, we generate them with a custom script: `scripts/generate-operation-maps.ts`.

**What it does:**

1. Reads each generated TypeScript file
2. Parses the `paths` interface to extract:
   - Path template (e.g., `/organizations/{organizationId}/products`)
   - HTTP method (e.g., `get`)
   - Operation name (e.g., `getProducts`)
3. Analyzes paths to find common base path prefix
4. Creates optimized runtime mapping with abbreviated keys

**Bundle Size Optimizations:**

The generation script applies two optimizations to reduce bundle size:

1. **Base Path Extraction**: The longest common path prefix across ALL operations is extracted into a `BASE_PATH` constant to eliminate repetition
2. **Abbreviated Keys**: Property names use single letters (`m`, `b`, `s`) instead of full words

**Example parsing:**
```typescript
// Input (generated type):
export interface paths {
  "/organizations/{organizationId}/baskets": {
    post: operations["createBasket"];
  };
  "/organizations/{organizationId}/baskets/{basketId}": {
    get: operations["getBasket"];
  };
}

// Output (optimized operation map with maximum base path extraction):
export const BASE_PATH = '/organizations/{organizationId}/baskets' as const;

export const operations = {
  createBasket: {
    m: 'POST' as const,     // m = method
    b: BASE_PATH,            // b = base path
    s: ''                    // s = suffix (can be empty!)
  },
  getBasket: {
    m: 'GET' as const,
    b: BASE_PATH,
    s: '/{basketId}'         // s = suffix (shorter than before)
  }
} as const;
```

The script uses regex to parse the TypeScript source and generates `*.operations.ts` files with runtime mappings.

**Example generated file (`shopper-baskets-v1.operations.ts`):**

```typescript
/**
 * Auto-generated operation map for shopper-baskets-v1
 *
 * This file maps operation names to their HTTP method and path template.
 * Generated by scripts/generate-operation-maps.ts
 *
 * Optimizations applied:
 * - Base path extraction: Saves ~1443 bytes
 * - Abbreviated keys: Saves ~481 bytes (m=method, b=base, s=suffix)
 * - Total savings: ~1924 bytes
 *
 * Property abbreviations:
 * - m: HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
 * - b: Base path shared across operations
 * - s: Suffix path unique to this operation
 *
 * DO NOT EDIT MANUALLY - Changes will be overwritten on next generation
 */

export const BASE_PATH = '/organizations/{organizationId}/baskets' as const;

export const operations = {
  createBasket: { m: 'POST' as const, b: BASE_PATH, s: '' },
  getBasket: { m: 'GET' as const, b: BASE_PATH, s: '/{basketId}' },
  deleteBasket: { m: 'DELETE' as const, b: BASE_PATH, s: '/{basketId}' },
  addItemToBasket: { m: 'POST' as const, b: BASE_PATH, s: '/{basketId}/items' }
} as const;
```

This generated file provides the runtime information needed by the Proxy to route operation method calls to the correct HTTP methods and paths. At runtime, the full path is reconstructed by concatenating `b + s`. Note that some operations may have an empty suffix (`s: ''`) when the operation's path exactly matches the BASE_PATH.

### Proxy Client Creation

The `createClient` function wraps an `openapi-fetch` client with a JavaScript Proxy that:

1. Intercepts property access on the client
2. Checks if the property is an operation name
3. If yes, returns a function that:
   - Looks up the operation's HTTP method (m), base path (b), and suffix (s)
   - Reconstructs the full path by concatenating `b + s`
   - Calls the underlying client's HTTP method with the reconstructed path
4. If no, passes through middleware methods (`use`, `eject`)

**Flow:**
```
client.getProducts(options)
        ↓
Proxy intercepts "getProducts"
        ↓
Looks up in operation map: { m: 'GET', b: BASE_PATH, s: '/products' }
        ↓
Reconstructs path: BASE_PATH + '/products' = '/organizations/{organizationId}/products'
        ↓
Calls: client.GET(path, options)
        ↓
Returns: Promise<Response>
```

## The Proxy Implementation

The Proxy implementation in `createClient.ts` uses JavaScript's [Proxy API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to intercept property access and method calls.

**Key Proxy traps:**

### `get` trap
Intercepts property access. Returns:
- Operation method function if the property is an operation name
- Middleware methods (`use`, `eject`) if accessing those
- `undefined` for all other properties (hiding HTTP methods like `GET`, `POST`)

```typescript
get(target, prop) {
  if (typeof prop === 'string' && prop in operations) {
    const operationInfo = operations[prop];
    // Extract abbreviated keys: m=method, b=base, s=suffix
    const { m: method, b: base, s: suffix } = operationInfo;
    // Reconstruct full path from base + suffix
    const path = base + suffix;
    return function (...args) {
      return target[method.toUpperCase()](path, ...args);
    };
  }
  if (prop === 'use' || prop === 'eject') {
    return target[prop].bind(target);
  }
  return undefined;
}
```

### `has` trap
Controls `in` operator and property existence checks. Returns `true` only for:
- Operation methods
- Middleware methods (`use`, `eject`)

### `ownKeys` trap
Controls `Object.keys()` and enumeration. Returns only:
- Operation method names
- Middleware method names

This design ensures that:
- Only operation methods and middleware are accessible
- HTTP methods (GET, POST, etc.) are hidden from the API surface
- The client API is clean and focused
- TypeScript types match the runtime behavior

## Why proxy-types.ts?

The `proxy-types.ts` file contains complex TypeScript type definitions that enable full type safety for the Proxy-based client. Without these types, TypeScript cannot infer the correct parameter and return types for dynamically created methods.

**Key type utilities:**

### `OperationMethod<TClient, TOperation>`
Constructs the type signature for a single operation method by:
1. Extracting the path from the operation info
2. Looking up the operation definition in the client's paths type
3. Inferring parameter types from `FetchOptions`
4. Inferring return types from `FetchResponse`
5. Making parameters optional if no required keys exist

### `ProxyClient<TClient, TOperations>`
Creates the final client interface by:
1. Mapping each operation name to its `OperationMethod` type
2. Including middleware methods (`use`, `eject`) from the base client
3. Excluding HTTP method properties (GET, POST, etc.)

### `ResolvedFetchOptions<OpDef>`
Expands the `FetchOptions` type for better IDE tooltips, showing actual properties like `params` instead of opaque type references.

**Why it's necessary:**

Without these types, the Proxy would work at runtime but TypeScript would lose all type information:
- No autocomplete for method names
- No type checking for parameters
- No inference of response types
- Developers would need to manually cast types

With `proxy-types.ts`, TypeScript can:
- Infer all operation methods from the operation map
- Type-check parameters against the OpenAPI specification
- Infer response types correctly
- Provide accurate IDE tooltips and documentation

## Package Scripts

The following npm scripts are available in `package.json`:

### Generation Scripts

```json
{
  "scapi:generate-types": "openapi-typescript -c ./openapi-specs/redocly.yaml",
  "scapi:generate-operations": "pnpm dlx tsx scripts/generate-operation-maps.ts",
  "scapi:generate": "pnpm scapi:generate-types && pnpm scapi:generate-operations"
}
```

- **`scapi:generate-types`**: Generates TypeScript type definitions from OpenAPI specs
- **`scapi:generate-operations`**: Generates operation mapping files from generated types
- **`scapi:generate`**: Runs both generation steps in sequence (recommended)

### Usage

To regenerate all client types and operations:

```bash
pnpm scapi:generate
```

## Usage Examples

### Basic Usage

```typescript
import { createCommerceApiClients, ApiError } from '@salesforce/storefront-next-runtime';

// Create all SCAPI clients
const clients = createCommerceApiClients({
  baseUrl: 'https://your-instance.api.commercecloud.salesforce.com'
});

// Call operations with full type safety
try {
  const { data, response } = await clients.shopperProducts.getProduct({
    params: {
      path: {
        organizationId: 'f_ecom_zzxy_prd',
        id: 'product-123'
      },
      query: {
        siteId: 'RefArch',
        allImages: true
      }
    }
  });

  console.log('Product:', data); // Fully typed from OpenAPI spec
  console.log('ETag:', response.headers.get('etag')); // Access response headers
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API error:', error.status, error.body);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### With Custom Fetch

```typescript
const clients = createCommerceApiClients({
  baseUrl: 'https://your-instance.api.commercecloud.salesforce.com',
  fetch: customFetch // e.g., with auth headers, logging, etc.
});
```

### With Middleware

Middleware can intercept and modify requests/responses:

```typescript
// Add auth middleware to all clients
clients.use((req, options) => {
  req.headers.set('Authorization', `Bearer ${getAccessToken()}`);
  return req;
});

// Or add middleware to a specific client
clients.shopperBaskets.use((req, options) => {
  console.log('Making request to:', req.url);
  return req;
});
```

### Available Clients

```typescript
clients.shopperBasketsV1     // Basket operations (v1)
clients.shopperBasketsV2     // Basket operations (v2)
clients.shopperConsents      // Consent management
clients.shopperContext       // Context/session operations
clients.shopperCustomers     // Customer management
clients.shopperExperience    // Experience/page content
clients.shopperGiftCertificates  // Gift certificate operations
clients.shopperLogin         // Authentication
clients.shopperOrders        // Order management
clients.shopperProducts      // Product catalog
clients.shopperPromotions    // Promotions and campaigns
clients.shopperSearch        // Search operations
clients.shopperSeo           // SEO metadata
clients.shopperStores        // Store locator
```

## Updating to New OpenAPI Specifications

When Salesforce releases new versions of SCAPI specifications:

### Step 1: Download New Specifications

Download the new OpenAPI specification files from Salesforce Commerce Cloud and place them in the `openapi-specs/` directory:

```bash
cd packages/storefront-next-runtime/openapi-specs/

# Example: Updating shopper-products spec from 1.0.37 to 1.0.38
# Replace the existing spec folder with the new version
rm -rf shopper-products-oas-1.0.37
cp -r ~/Downloads/shopper-products-oas-1.0.38 ./
```

### Step 2: Update redocly.yaml

Update the `openapi-specs/redocly.yaml` configuration to point to the new specification version:

```yaml
apis:
  shopper-products-v1:
    root: ./shopper-products-oas-1.0.38/shopper-products-oas-v1-public.yaml  # Updated version
    x-openapi-ts:
      output: ../src/scapi-client/generated/shopper-products-v1.ts
```

### Step 3: Regenerate Types and Operations

Run the generation script to update all types and operation mappings:

```bash
cd packages/storefront-next-runtime
pnpm scapi:generate
```

This will:
1. Generate new TypeScript types from the updated OpenAPI specs
2. Parse the types to extract operation mappings
3. Create updated `*.operations.ts` files

### Step 4: Review Changes

Review the generated files to ensure:
- New operations are correctly mapped
- Existing operations haven't changed unexpectedly
- Types are correctly inferred

```bash
git diff src/scapi-client/generated/
```

### Step 5: Test

Run tests to ensure the updates don't break existing functionality:

```bash
pnpm test
pnpm typecheck
```

### Step 6: Commit Changes

Commit both the new OpenAPI specs and generated files:

```bash
git add openapi-specs/ src/scapi-client/generated/
git commit -m "Update SCAPI specs to version X.Y.Z"
```

**Note:** While the generated files are checked into git, they should be treated as build artifacts. Always regenerate them rather than manually editing.

## API Options and Middleware

The SCAPI client leverages `openapi-fetch` capabilities for request configuration and middleware.

### Request Options

Each operation method accepts a `FetchOptions` object with these properties:

```typescript
{
  params?: {
    path?: { /* path parameters */ },
    query?: { /* query parameters */ },
    header?: { /* header parameters */ },
    cookie?: { /* cookie parameters */ }
  },
  body?: /* request body (for POST/PUT/PATCH) */,
  headers?: HeadersInit,              // Custom HTTP headers
  parseAs?: "json" | "text" | "blob" | "arrayBuffer" | "stream",
  baseUrl?: string,                   // Override base URL
  querySerializer?: QuerySerializer,  // Custom query serialization
  bodySerializer?: BodySerializer,    // Custom body serialization
  fetch?: typeof fetch,               // Custom fetch implementation
  middleware?: Middleware[]           // Request-specific middleware
}
```

### Middleware

Middleware allows you to intercept and modify requests and responses. Common use cases:

- Adding authentication headers
- Logging requests/responses
- Error handling and retries
- Request/response transformation
- Caching

**Example: Auth Middleware**

```typescript
import type { Middleware } from 'openapi-fetch';

const authMiddleware: Middleware = {
  async onRequest(req, options) {
    const token = await getAccessToken();
    req.headers.set('Authorization', `Bearer ${token}`);
    return req;
  },

  async onResponse(res, options) {
    if (res.status === 401) {
      await refreshToken();
      // Optionally retry the request
    }
    return res;
  }
};

clients.use(authMiddleware);
```

**Example: Logging Middleware**

```typescript
const loggingMiddleware: Middleware = {
  async onRequest(req) {
    console.log(`[API] ${req.method} ${req.url}`);
    return req;
  },

  async onResponse(res) {
    console.log(`[API] ${res.status} ${res.url}`);
    return res;
  }
};

clients.shopperProducts.use(loggingMiddleware);
```

### Response Format

All operations return a Promise with this structure on success:

```typescript
{
  data: T,           // Response data (fully typed from OpenAPI spec)
  response: Response // Raw fetch Response object with headers, status, etc.
}
```

On error (non-2xx status), the operation throws an `ApiError`:

```typescript
// Success case
const { data, response } = await clients.shopperProducts.getProduct(options);
console.log(data.name); // Fully typed
console.log(response.headers.get('etag')); // Access response headers

// Error case - use try/catch
try {
  const { data } = await clients.shopperProducts.getProduct(options);
  console.log(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.status, error.body);
  }
}
```

### Error Handling

The SCAPI client throws typed `ApiError` exceptions for all non-2xx HTTP responses, aligning with standard Fetch API behavior.

#### ApiError Properties

The `ApiError` class provides comprehensive error information:

```typescript
class ApiError<TBody = unknown> extends Error {
  status: number;         // HTTP status code (404, 500, etc.)
  statusText: string;     // HTTP status text ("Not Found", "Internal Server Error")
  headers: Headers;       // Response headers object
  body: TBody;           // Parsed response body (typed from OpenAPI spec)
  rawBody: string;       // Raw response body as text
  url: string;           // Request URL that caused the error
  method: string;        // HTTP method (GET, POST, etc.)
}
```

#### Error Handling Patterns

**Basic Error Handling:**

```typescript
import { ApiError } from '@salesforce/storefront-next-runtime';

try {
  const { data } = await clients.shopperProducts.getProduct({
    params: {
      path: { organizationId: 'org123', id: 'invalid-id' },
      query: { siteId: 'RefArch' }
    }
  });
  console.log(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.status}: ${error.statusText}`);
    console.error('Error details:', error.body);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

**Accessing Error Details:**

```typescript
try {
  const { data } = await clients.shopperBaskets.createBasket(options);
} catch (error) {
  if (error instanceof ApiError) {
    // Access all error properties
    console.log('Status:', error.status);              // 404
    console.log('Status Text:', error.statusText);     // "Not Found"
    console.log('Error Body:', error.body);            // Typed error response
    console.log('Raw Body:', error.rawBody);           // Raw response text
    console.log('Headers:', error.headers);            // Headers object
    console.log('URL:', error.url);                    // Request URL
    console.log('Method:', error.method);              // "POST"
    
    // Access specific headers
    const rateLimitRemaining = error.headers.get('x-rate-limit-remaining');
    const contentType = error.headers.get('content-type');
  }
}
```

**Handling Specific Error Codes:**

```typescript
try {
  const { data } = await clients.shopperCustomers.getCustomer(options);
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        // Handle unauthorized
        await refreshAccessToken();
        break;
      case 404:
        // Handle not found
        console.log('Customer not found');
        break;
      case 429:
        // Handle rate limiting
        const retryAfter = error.headers.get('retry-after');
        console.log(`Rate limited. Retry after ${retryAfter}s`);
        break;
      default:
        console.error('Unexpected error:', error);
    }
  }
}
```

**Type-Safe Error Bodies:**

The error body is typed based on the OpenAPI specification's error response schemas:

```typescript
try {
  const { data } = await clients.shopperProducts.getProduct(options);
} catch (error) {
  if (error instanceof ApiError) {
    // error.body is typed from OpenAPI spec
    // For example, SCAPI errors typically have this shape:
    const errorBody = error.body as {
      type?: string;
      title?: string;
      detail?: string;
      instance?: string;
    };
    
    console.error(`${errorBody.type}: ${errorBody.detail}`);
  }
}
```

**Async/Await with Error Handling:**

```typescript
async function fetchProduct(productId: string) {
  try {
    const { data, response } = await clients.shopperProducts.getProduct({
      params: {
        path: { organizationId: 'org123', id: productId },
        query: { siteId: 'RefArch' }
      }
    });
    
    // Access response headers
    const etag = response.headers.get('etag');
    
    return { product: data, etag };
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle API errors
      throw new Error(`Failed to fetch product: ${error.status} ${error.statusText}`);
    }
    // Network errors or other exceptions
    throw error;
  }
}
```

**JSON Serialization for Logging:**

```typescript
try {
  const { data } = await clients.shopperProducts.getProduct(options);
} catch (error) {
  if (error instanceof ApiError) {
    // ApiError has a toJSON() method for easy logging
    console.error('API Error:', JSON.stringify(error));
    
    // Or log to external service
    logger.error('SCAPI Error', error.toJSON());
  }
}
```

## References

- [openapi-fetch Documentation](https://openapi-ts.dev/openapi-fetch/) - Type-safe fetch client
- [openapi-typescript Documentation](https://openapi-ts.dev/introduction) - Type generation from OpenAPI
- [openapi-fetch Middleware Guide](https://openapi-ts.dev/openapi-fetch/middleware) - Request/response interception
- [openapi-fetch API Options](https://openapi-ts.dev/openapi-fetch/api) - Request configuration options
- [Salesforce Commerce Cloud API Documentation](https://developer.salesforce.com/docs/commerce/commerce-api/guide/get-started.html) - SCAPI reference
