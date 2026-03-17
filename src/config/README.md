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

Override any configuration value using environment variables with the `PUBLIC__` prefix, no need to modify `config.server.ts`.

### Understanding the Path Syntax

The double underscore (`__`) lets you navigate nested config paths. Think of it as replacing the dot (`.`) in JavaScript object notation:

```bash
# This environment variable:
PUBLIC__app__site__locale=en-US

# Maps to this config path:
config.app.site.locale

# Which creates this structure:
{
  app: {
    site: {
      locale: 'en-US'
    }
  }
}
```

### Required Variables

Copy `.env.default` to `.env` and set these required Commerce Cloud credentials:

```bash
PUBLIC__app__commerce__api__clientId=your-client-id
PUBLIC__app__commerce__api__organizationId=your-org-id
PUBLIC__app__commerce__api__siteId=your-site-id
PUBLIC__app__commerce__api__shortCode=your-short-code
```

### Value Types

Values are automatically parsed to the correct type:

```bash
PUBLIC__app__myFeature__count=42           # → number
PUBLIC__app__myFeature__enabled=true       # → boolean
PUBLIC__app__myFeature__items=["a","b"]    # → array
PUBLIC__app__myFeature__data='{"x":1}'     # → object
PUBLIC__app__myFeature__name=hello         # → string
PUBLIC__app__myFeature__value=             # → empty string
```

You can also set entire nested objects at once using JSON:

```bash
# Instead of setting each value separately:
PUBLIC__app__myFeature__option1=value1
PUBLIC__app__myFeature__option2=value2
PUBLIC__app__myFeature__nested__enabled=true

# Use a single JSON value:
PUBLIC__app__myFeature='{"option1":"value1","option2":"value2","nested":{"enabled":true}}'
```

### Important Notes

**Case doesn't matter:** You can use any casing (lowercase, UPPERCASE, or MixedCase), and it will normalize to match your `config.server.ts`:

```bash
PUBLIC__app__site__locale=en-US    # ✅ Works
PUBLIC__APP__SITE__LOCALE=en-US    # ✅ Also works
PUBLIC__App__Site__Locale=en-US    # ✅ Also works
```

**Paths must exist in config:** You can only override paths that are already defined in `config.server.ts`. This prevents typos from silently failing:

```bash
PUBLIC__app__site__local=en-US  # ❌ Error: "local" doesn't exist (did you mean "locale"?)
```

**More specific paths win:** When paths overlap, deeper paths take precedence:

```bash
PUBLIC__app__myFeature='{"setting1":500,"setting2":1000}'
PUBLIC__app__myFeature__setting1=999  # ← This wins (more specific)
# Result: setting1=999, setting2=1000
```

**Depth limit:** Paths are limited to 10 levels deep. For deeper structures, use JSON values instead:

```bash
# ❌ Too deep (11 levels):
PUBLIC__a__b__c__d__e__f__g__h__i__j__k=value

# ✅ Use JSON instead:
PUBLIC__app__myFeature='{"deep":{"nested":{"structure":{"works":"fine"}}}}'
```

### Security: PUBLIC__ vs Non-Prefixed

**`PUBLIC__` prefix** → Exposed to the browser (bundled into client JavaScript)
- ✅ Use for: Client IDs, site IDs, locales, feature flags, public API endpoints
- ❌ Never use for: API secrets, passwords, private keys, authentication tokens

**No prefix** → Server-only (never exposed to client)
- ✅ Use for: SLAS secrets, database credentials, private tokens

```bash
# ✅ Safe to expose to client:
PUBLIC__app__commerce__api__clientId=abc123

# ✅ Server-only secret (no PUBLIC__ prefix):
COMMERCE_API_SLAS_SECRET=your-secret-here
```

Read server-only secrets directly from `process.env` in your server code—never add them to config.

### Merge Behavior

Environment variables are **deep merged** into defaults from `config.server.ts`:

```typescript
// config.server.ts (defaults)
export default defineConfig({
  app: {
    myFeature: {
      debounce: 750,
      maxItems: 999,
      enabled: true,
    }
  }
});

// With env var:
// PUBLIC__app__myFeature__debounce=1000

// Final result:
{
  app: {
    myFeature: {
      debounce: 1000,        // ← overridden
      maxItems: 999,         // ← preserved
      enabled: true,         // ← preserved
    }
  }
}
```

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
      enabled: false,  // Just the default - no process.env needed!
      maxItems: 10,
    },
  },
});
```

### 3. Override via environment variables
```bash
# No code changes needed - just use the PUBLIC__ prefix!
PUBLIC__app__myFeature__enabled=true
PUBLIC__app__myFeature__maxItems=20
```

### 4. Use it in your code

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
            "key": "PUBLIC__app__commerce__api__clientId"
        },
        {
            "name": "API Organization ID",
            "key": "PUBLIC__app__commerce__api__organizationId"
        },
        {
            "name": "API Short Code",
            "key": "PUBLIC__app__commerce__api__shortCode"
        }
    ]
}
```

## How It Works

1. **Defaults defined** in `config.server.ts` (clean, no `process.env` references)
2. **Environment variables** with `PUBLIC__` prefix are automatically merged at runtime
3. **Final config** is made available via:
   - `getConfig(context)` for loaders/actions
   - `useConfig()` for React components
   - `window.__APP_CONFIG__` for client code

The `.server.ts` suffix prevents accidental direct imports. The `PUBLIC__` prefix ensures only client-safe values are exposed.

**What gets shared:**
- The `app` section → Available on both server and client
- The `runtime` and `metadata` sections → Server-only (not injected to client)
## Common Issues

**Changed `.env` but nothing happened?**
- Restart your dev server (environment variables are loaded at startup)

**Environment variable not working?**
- Verify the variable name starts with `PUBLIC__` (double underscore)
- Check `.env` file is in the project root
- For booleans, use string `"true"` not bare `true`

**Type errors after adding config?**
- Update both `schema.ts` and `config.server.ts` to match
- Run `pnpm typecheck` to verify all files are correct

**App won't start - missing credentials?**
- Copy `.env.default` to `.env`
- Set required Commerce Cloud credentials:
  ```bash
  PUBLIC__app__commerce__api__clientId=your-id
  PUBLIC__app__commerce__api__organizationId=your-org
  PUBLIC__app__commerce__api__siteId=your-site
  PUBLIC__app__commerce__api__shortCode=your-code
  ```

## Deploying to MRT (Managed Runtime)

When deploying to Managed Runtime, set the same environment variables in the MRT environment:

1. Log into the Runtime Admin
2. Navigate to your project → Environment Variables
3. Add the required `PUBLIC__` variables (same ones from your `.env` file)
4. Add any server-only secrets without the `PUBLIC__` prefix
5. Deploy your application

All the same rules apply: use the `PUBLIC__` prefix for client-safe values, use the `__` path syntax for nested config, and read server-only secrets directly from `process.env`.

**MRT limits:** Variable names max 512 characters, total PUBLIC__ values max 32KB. Use JSON to consolidate related settings if needed.

[Learn more about MRT environment variables →](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/environment-variables.html)

## Marketing Cloud Configuration (Server-Only)

Marketing Cloud is used for sending emails in features like passwordless login and password reset. The configuration is optional and only required if you're using these features.

### Environment Variables

```bash
# Marketing Cloud API Configuration (Server-only - NO PUBLIC__ prefix)
MARKETING_CLOUD_CLIENT_ID=your-client-id
MARKETING_CLOUD_CLIENT_SECRET=your-client-secret
MARKETING_CLOUD_SUBDOMAIN=your-subdomain
MARKETING_CLOUD_PASSWORDLESS_LOGIN_TEMPLATE=your-passwordless-template-id
MARKETING_CLOUD_RESET_PASSWORD_TEMPLATE=your-reset-password-template-id
```

**Important Security Notes:**
- ❌ These variables do NOT have the `PUBLIC__` prefix - they are **server-only**
- ❌ They are NOT included in `config.server.ts` or exposed to the client
- ✅ Read them directly from `process.env` in server-side code
