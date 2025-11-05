# Configuration

One TypeScript file for all your app settings. Configure via `.env` files for different environments.

## Quick Start

**Two simple APIs for two contexts:**

### For Loaders, Actions, Utilities: `getConfig()`

```typescript
import { getConfig } from '@/config';

// ✅ Server loader/action - pass context
export function loader({ context }: LoaderFunctionArgs) {
  const config = getConfig(context);
  return { limit: config.global.productListing.productsPerPage };
}

// ✅ Client loader - no context needed
export function clientLoader() {
  const config = getConfig();
  return { limit: config.global.productListing.productsPerPage };
}
```

### For React Components: `useConfig()`

```typescript
import { useConfig } from '@/config';

export function MyComponent() {
  const config = useConfig();
  return <div>Showing {config.global.productListing.productsPerPage} products</div>;
}
```
## Environment Variables

### Required (set these in your `.env` file)
- `PUBLIC_COMMERCE_API_CLIENT_ID` - Commerce Cloud API client ID
- `PUBLIC_COMMERCE_API_ORG_ID` - Commerce Cloud organization ID
- `PUBLIC_COMMERCE_API_SITE_ID` - Commerce Cloud site ID
- `PUBLIC_COMMERCE_API_SHORT_CODE` - Commerce Cloud instance short code

### Optional
- `PUBLIC_SITE_LOCALE` - Site locale (default: `en-US`)
- `PUBLIC_SITE_CURRENCY` - Site currency (default: `USD`)
- `PUBLIC_SITE_PASSWORDLESS` - Enable passwordless login (default: `false`)
- `PUBLIC_SOCIAL_IDPS` - Social identity providers as JSON array (default: `["Apple","Google"]`)
- `PUBLIC_PASSWORDLESS_CALLBACK_URI` - Passwordless login callback URI (default: `/passwordless-login-callback`)
- `PUBLIC_PASSWORDLESS_LANDING_URI` - Passwordless login landing URI (default: `/passwordless-login-landing`)
- `PUBLIC_RESET_PASSWORD_CALLBACK_URI` - Reset password callback URI (default: `/reset-password-callback`)
- `PUBLIC_RESET_PASSWORD_LANDING_URI` - Reset password landing URI (default: `/reset-password-landing`)
- `MARKETING_CLOUD_RESET_PASSWORD_TEMPLATE` - Marketing Cloud template ID for reset password emails

See `.env.default` for the complete list.

## Adding Configuration

### 1. Update the type (`src/config/schema.ts`)
```typescript
export type Config = {
  app: {
    myFeature: {
      enabled: boolean;
      maxItems: number;
    };
  };
};
```

### 2. Add default value (`config.server.ts`)
```typescript
export default defineConfig({
  app: {
    myFeature: {
      enabled: process.env.PUBLIC_MY_FEATURE === 'true',
      maxItems: 10,
    },
  },
});
```

### 3. Use it in your code

**In React components:**
```typescript
import { useConfig } from '@/config';

export function MyComponent() {
  const config = useConfig();

  if (config.myFeature.enabled) {
    const maxItems = config.myFeature.maxItems;
    // Your feature code here
  }
}
```

**In loaders/actions:**
```typescript
import { getConfig } from '@/config';

export function loader({ context }: LoaderFunctionArgs) {
  const config = getConfig(context);
  
  if (config.myFeature.enabled) {
    // Your loader code here
  }
}
```

### 4. Add a new config value during app creation
**In srce/config/config-meta,json:**
- Add the name and key value to the config array
- This will cause the create-storefront script to ask for user input, using the value in `.env.default` as default value
```json
{
    "configs": [
        {
            "name": "API Client ID",
            "key": "PUBLIC_COMMERCE_API_CLIENT_ID"
        }, 
        {
            "name": "API Organization ID",
            "key": "PUBLIC_COMMERCE_API_ORG_ID"
        }, 
        {
            "name": "API Short Code",
            "key": "PUBLIC_COMMERCE_API_SHORT_CODE"
        }
    ]
}
```


## Security: PUBLIC_ Prefix

**✅ Use `PUBLIC_` prefix for public configuration:**
- Client IDs, site IDs, organization IDs
- Feature flags, locales, currencies
- Public API endpoints

These values are safe to include in the client bundle. The `PUBLIC_` prefix makes it clear these values are sfNext-specific and will be exposed to the browser.

**❌ Never use `PUBLIC_` prefix for secrets or server-only config:**
- API secrets, private keys, passwords
- SLAS private keys, authentication tokens
- MRT deployment settings (only used by CLI)

**Why?** Even though `config.server.ts` has a `.server.ts` suffix, the configuration values defined in it get bundled into client code via `window.__APP_CONFIG__`. 

**Important:** Actual secrets (no `PUBLIC_` prefix) should never go into `config.server.ts`. Keep them in server-only code (loaders, actions, middleware) where they're read directly from `process.env` at runtime.

```typescript
// ✅ Safe: Public client ID in config.server.ts (bundled to client)
clientId: process.env.PUBLIC_COMMERCE_API_CLIENT_ID || '',
    

// ❌ Unsafe: Secret with PUBLIC_ prefix (will leak to client!)
secret: process.env.PUBLIC_API_SECRET || 'fallback-secret',

// ✅ Safe: Secret in server middleware (never in config.server.ts)
// middleware/auth.server.ts
const slasSecret = process.env.COMMERCE_API_SLAS_SECRET; // No PUBLIC_ prefix
```

## How It Works

Configuration values are read from `process.env` at runtime and injected into both server and client contexts:

```typescript
// config.server.ts reads from process.env
export default defineConfig({
  app: {
    commerce: {
      api: {
        clientId: process.env.PUBLIC_COMMERCE_API_CLIENT_ID || '',
        // Falls back to empty string if env var not set
      }
    }
  }
})
```

The `.server.ts` suffix prevents accidental client-side imports (similar to loaders/actions). Config values are made available to the client via `window.__APP_CONFIG__` during SSR.

**What gets shared:**
- The `app` section → Available on both server and client
- The `runtime` and `metadata` sections → Server-only (not injected to client)
## Common Issues

**Changed `.env` but nothing happened?**
- Restart your dev server (Vite needs to reload environment variables)

**Environment variable not working?**
- Check the variable name has the `PUBLIC_` prefix for public config
- Use string `"true"` for booleans, not actual boolean values
- Make sure `.env` file is in the project root

**Type errors after adding config?**
- Update both `schema.ts` and `config.server.ts` to match
- Run `pnpm typecheck` to verify all files are correct

**App won't start - missing credentials?**
- Copy `.env.default` to `.env`
- Set all required `PUBLIC_COMMERCE_API_*` variables

## Marketing Cloud Configuration (Server-Only)

Marketing Cloud is used for sending emails in features like passwordless login and password reset. The configuration is optional and only required if you're using these features.

### Environment Variables

```bash
# Marketing Cloud API Configuration (Server-only - NO PUBLIC_ prefix)
MARKETING_CLOUD_CLIENT_ID=your-client-id
MARKETING_CLOUD_CLIENT_SECRET=your-client-secret
MARKETING_CLOUD_SUBDOMAIN=your-subdomain
MARKETING_CLOUD_PASSWORDLESS_LOGIN_TEMPLATE=your-passwordless-template-id
MARKETING_CLOUD_RESET_PASSWORD_TEMPLATE=your-reset-password-template-id
```

**Important Security Notes:**
- ❌ These variables do NOT have the `PUBLIC_` prefix - they are **server-only**
- ❌ They are NOT included in `config.server.ts` or exposed to the client
