# Hybrid Proxy for SFRA/SiteGenesis

> ⚠️ **FOR LOCAL DEVELOPMENT ONLY - MUST BE REMOVED BEFORE PRODUCTION DEPLOYMENT**
>
> This extension must be **completely removed** (recommended) or disabled (`enabled: false`) before deploying to production. In production, eCDN handles all routing at the edge. Running this proxy in production would cause conflicts and performance issues.

This extension enables hybrid routing between your Storefront Next app and existing SFRA/SiteGenesis site during local development. It acts as an application-level proxy, forwarding specific requests (like Cart and Checkout) to your SFRA storefront while keeping others on the Storefront Next app.

## Configuration

Enable/disable the hybrid proxy by setting the `enabled` property in `src/extensions/hybrid-proxy/config.ts`:

| Environment               | Configuration          | Hybrid Proxy Status                            |
|---------------------------|------------------------|------------------------------------------------|
| **Local Development**     | `enabled: true`        | ✅ **ENABLED** - Proxy routes to SFRA          |
| **Production with eCDN**  | **REMOVE EXTENSION**   | ❌ **MUST BE REMOVED** - eCDN handles routing  |

**Simple configuration for local dev** - just set `enabled` to `true` or `false` in [`config.ts`](./config.ts).

**For production deployment** - see [Before Production Deployment](#before-production-deployment) below.

## Setup

1.  **Configure Commerce Cloud API Settings**:
    **IMPORTANT**: Your Storefront Next app and SFRA site must use the **same Commerce Cloud API credentials** for session/basket synchronization.
    In your `.env` file, verify these settings match your SFRA site:

    ```bash
    PUBLIC__app__commerce__api__clientId=your-client-id
    PUBLIC__app__commerce__api__organizationId=your-org-id
    PUBLIC__app__commerce__api__siteId=your-site-id
    PUBLIC__app__commerce__api__shortCode=your-short-code
    ```

2.  **Enable and Configure Hybrid Proxy**:
    Open `src/extensions/hybrid-proxy/config.ts` and configure:

    ```typescript
    export const HYBRID_PROXY_CONFIG = {
        // Enable the proxy (disabled by default for safety)
        enabled: true,  // ← Set to true to enable

        // Your SFRA instance URL (must be HTTPS)
        sfccOrigin: 'https://your-instance.dx.commercecloud.salesforce.com',  // ← Update this

        // Public domain (leave empty for local dev)
        publicDomain: '',  // ← Auto-detects localhost for local dev

        // Pre-configured paths (cart, checkout, etc.)
        paths: [
            { path: '/cart', needsPrefix: true },
            { path: '/checkout', needsPrefix: true },
            '/on/demandware.store',
            '/on/demandware.static',
            '/s/',
        ],
    };
    ```

    **Important Notes:**
    - Extension is **disabled by default** (`enabled: false`) - you must explicitly enable it
    - `publicDomain` should be **empty for local dev** (auto-detects `localhost:5173`)
    - For **MRT deployment**, you MUST set `publicDomain` to your MRT domain (required, no auto-detection)

3.  **Configure URL mapping in Business Manager**:
    
    **⚠️ IMPORTANT**: Paths and locale format must align between Storefront Next and SFRA. Use **Business Manager URL rules** to map URLs correctly.
    
    **Configure URL rules in Business Manager** (not locale aliases):
    
    1. **Business Manager URL rules / routing**:
       - Configure **URL rules** and routing so that paths (e.g. `/s/{siteId}/{locale}/cart`) resolve correctly for your SFRA site.
       - For eCDN / MRT: use **Configure MRT Routing Rules** in Business Manager to control which paths go to MRT vs SFRA.
       - See: [Configure MRT Routing Rules in Business Manager](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/configure-mrt-routing-bm.html)
    
    2. **Locale format**: Prefer hyphenated locales (`en-US`) to match Commerce APIs and Storefront Next. Verify in **Merchant Tools > Site Preferences > Locales** if needed.
    
    3. **Verify URLs**:
       - Open your SFRA site and navigate to cart/checkout.
       - Confirm the URL structure matches what the hybrid proxy expects (e.g. `https://your-site.com/s/RefArch/en-US/cart`).

4.  **Handle Routes with Different URL Structures** (if applicable):

    If you have routes with different URL patterns between SFRA and Storefront Next (e.g., product pages), you'll need a redirect solution.
    
    **Example**: Product pages use different URL structures, so they cannot be proxied directly. Use the `plugin_redirect` cartridge to handle redirects.
    
    📖 See the [Handling Routes with Different URL Structures](#handling-routes-with-different-url-structures) section for detailed setup instructions.

## How to Route a New Page to SFRA

To send a new page (e.g., `/my-account`) to SFRA instead of handling it in the new storefront:

1.  Open `src/extensions/hybrid-proxy/config.ts`.
2.  Add the path to the `paths` array:

    ```typescript
    paths: [
        // ... existing paths
        { path: '/my-account', needsPrefix: true },
    ]
    ```

## Handling Routes with Different URL Structures

### Understanding URL Structure Mismatches

The hybrid proxy works best for routes with **identical URL structures** between Storefront Next and SFRA (like `/cart` or `/checkout`).

**However**, some routes have **different URL patterns** between storefronts. Product pages are a common example:

- **Storefront Next**: `/product/{productId}` (e.g., `/product/25686544M`)
- **SFRA**: `/s/{siteId}/{locale}/{category-path}/{productId}.html` (e.g., `/s/RefArch/en-US/mens-clothing/25686544M.html`)

Because of this URL structure mismatch, the hybrid proxy **cannot directly proxy these routes**. Instead, you need a redirect mechanism to handle the URL translation.

### Recommended Solution for Product Pages: plugin_redirect

**Use the `plugin_redirect` cartridge** - an official Salesforce Commerce Cloud cartridge that automatically handles product URL redirects between different storefront implementations.

This is the recommended solution specifically for product pages. For other routes with different URL structures, you may need similar redirect mechanisms or ensure both storefronts use compatible URL patterns.

**Setup**: https://github.com/SalesforceCommerceCloud/plugin_redirect

## How It Works

### Enable/Disable Logic

The `HYBRID_PROXY_CONFIG.enabled` boolean property controls whether the proxy is active:

- `enabled: true` - Proxy is active, requests to configured paths are forwarded to SFRA
- `enabled: false` - Proxy is disabled, all requests are handled by Storefront Next

This setting applies to both server-side middleware and client-side navigation interceptor.

### Request Flow

-   **Client-Side**: If a user clicks a link to `/cart`, the navigation interceptor detects that it's a proxy path and forces a full page reload.
-   **Server-Side**: The Node.js server receives the request, sees it matches a proxy path, and forwards the request to your `sfccOrigin`.
-   **CORS Handling**: All SFCC URLs in proxied HTML/JSON responses are rewritten to the local proxy origin to prevent CORS errors.
-   **Cookies**: Session cookies are automatically handled so the user stays logged in across both systems.

## Before Production Deployment

**⚠️ CRITICAL: You MUST remove or disable this extension before deploying to production.**

### Why Remove for Production?

In production deployments with eCDN:
- **eCDN handles all routing at the edge** - faster and more reliable than application-level proxying
- **This proxy would conflict with eCDN** - causes routing errors and unexpected behavior
- **Unnecessary overhead** - adds latency and complexity
- **Not production-ready** - lacks production-grade monitoring, error handling, and scaling

### Option 1: Remove Completely (Recommended)

Choose one of these removal methods:

#### Method A: CLI Command (Easiest)

Use the Storefront Next CLI to automatically remove the extension:

```bash
npx @salesforce/storefront-next-dev extensions remove -d . -e SFDC_EXT_HYBRID_PROXY
```

This command will:

- Delete the `src/extensions/hybrid-proxy/` folder
- Remove all integration code marked with `@sfdc-extension-line SFDC_EXT_HYBRID_PROXY` and `@sfdc-extension-block-start/end SFDC_EXT_HYBRID_PROXY`
- Update `src/extensions/config.json`

#### Method B: Automated LLM Instructions

The extension includes automated uninstall instructions at [`instructions/uninstall-hybrid-proxy.mdc`](../../instructions/uninstall-hybrid-proxy.mdc). An LLM assistant (like Claude) can follow these instructions to automatically remove all extension code.

#### Method C: Manual Removal

1. Delete the extension folder: `src/extensions/hybrid-proxy/`
2. Remove integration code from `src/server/middleware-registry.ts`:
   - Delete the two `@sfdc-extension-line SFDC_EXT_HYBRID_PROXY` import lines
   - Delete the `@sfdc-extension-block-start/end SFDC_EXT_HYBRID_PROXY` block with middleware registration
3. Update `src/extensions/config.json` to remove the `SFDC_EXT_HYBRID_PROXY` entry

#### Verification

After removal, search your codebase for `SFDC_EXT_HYBRID_PROXY` - you should find no results:

```bash
git grep SFDC_EXT_HYBRID_PROXY
# Should return nothing
```

### Option 2: Disable (Quick, but not recommended)

Set `enabled: false` in [`config.ts`](./config.ts):

```typescript
export const HYBRID_PROXY_CONFIG = {
    enabled: false,  // ❌ Disabled for production
    // ...
};
```

**Note:** This disables the proxy but leaves the code in your codebase, which can be confusing for other developers and may accidentally get re-enabled.
