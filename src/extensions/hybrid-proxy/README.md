# Hybrid Routing without CDN

This extension enables hybrid routing between Storefront Next and your existing SFRA/SiteGenesis site without requiring a CDN. It acts as a proxy, forwarding specific requests (like Cart and Checkout) to your SFRA/Sitegeneisis storefronts while keeping others on the new storefront.

## Setup

1.  **Configure the Proxy**:
    Open `src/extensions/hybrid-proxy/config.ts` and update the settings:

    ```typescript
    export const HYBRID_PROXY_CONFIG = {
        // 1. Enable the proxy
        enabled: true, 

        // 2. Set your SFRA/SiteGenesis domain (must be HTTPS)
        sfccOrigin: 'https://your-sfra-site.com', 
        
        // 3. Define paths to proxy
        paths: [
            { path: '/cart', needsPrefix: true },     // Proxies /cart -> /s/Site/en_US/cart
            { path: '/checkout', needsPrefix: true }, // Proxies /checkout -> /s/Site/en_US/checkout
            '/on/demandware.store',                   // Direct proxy (no prefix added)
        ],
    };
    ```

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

## How It Works

-   **Client-Side**: If a user clicks a link to `/cart`, the app detects it's a proxy path and forces a full page reload.
-   **Server-Side**: The Node.js server receives the request, sees it matches a proxy path, and forwards the request to your `sfccOrigin`.
-   **Cookies**: Session cookies are automatically handled so the user stays logged in across both systems.
