# SEO

This document covers the SEO features built into the storefront template: page titles and meta tags, canonical URLs, and indexing control.

## Canonical URLs

Every page renders a `<link rel="canonical">` tag in the `<head>`. Canonical URLs tell search engines which URL represents the "true" version of a page, preventing duplicate content issues caused by tracking parameters, session IDs, or query param reordering.

### How It Works

The canonical URL is built in [`src/utils/canonical-url.ts`](../src/utils/canonical-url.ts) and rendered by the root Layout in [`src/root.tsx`](../src/root.tsx).

It applies three normalizations:

1. **Allowlisted query parameters** — Only parameters that change page content are kept. Everything else (tracking params, analytics IDs, unknown params) is stripped.
2. **Sorted parameters** — Retained params are sorted alphabetically so that `?sort=price&q=jacket` and `?q=jacket&sort=price` produce the same canonical URL.
3. **Trailing slash removal** — Trailing slashes are removed from non-root paths (`/product/jacket/` → `/product/jacket`).

### Query Parameter Allowlist

The canonical URL uses an **allowlist** (not a denylist) for query parameters. This means any parameter not explicitly listed is automatically stripped. This is intentional — new tracking parameters from ad platforms, analytics tools, or email campaigns are excluded by default without requiring code changes.

The current allowlist is defined in `src/utils/canonical-url.ts`:

| Parameter | Purpose | Used by |
|-----------|---------|---------|
| `q` | Search query | Search page |
| `offset` | Pagination offset | Category, Search |
| `sort` | Sort order | Category, Search |
| `refine` | Filter refinements | Category, Search |
| `pid` | Product variant ID | Product detail page |

### Adding a Custom Query Parameter

If you add a feature that uses a new query parameter to change what content is displayed on a page, you need to add it to the allowlist so it appears in the canonical URL.

**Example:** You add a `?view=grid` parameter that switches between grid and list layouts with different product data.

1. Open `src/utils/canonical-url.ts`
2. Add the parameter to the `CONTENT_PARAMS` set:

```typescript
const CONTENT_PARAMS = new Set([
    'q',
    'offset',
    'sort',
    'refine',
    'pid',
    'view', // layout mode (grid/list)
]);
```

3. Add a corresponding test in `src/utils/canonical-url.test.ts`:

```typescript
it('preserves view param', () => {
    expect(buildCanonicalUrl(origin, '/category/mens', '?view=grid')).toBe(
        'https://www.example.com/category/mens?view=grid'
    );
});
```

**When NOT to add a parameter:** If the parameter doesn't change the page's primary content (e.g., UI preferences stored in cookies, modal triggers, analytics flags), it should not be in the allowlist. Keeping the allowlist minimal produces the cleanest canonical URLs.

## Page Titles and Meta Tags (`SeoMeta`)

Each route renders a `<SeoMeta>` component that sets the page `<title>`, `<meta name="description">`, and optional Twitter Card tags. The component is defined in [`src/components/seo-meta/index.tsx`](../src/components/seo-meta/index.tsx) and uses React 19 document metadata hoisting, which means tags rendered anywhere in the component tree are automatically hoisted to `<head>` and deduplicated. This works with streaming/Suspense — tags are sent when data resolves.

### Basic Usage

```tsx
import { SeoMeta } from '@/components/seo-meta';

// Standard page — site name is appended automatically
// Renders: <title>Classic Jacket | NextGen PWA Kit Store</title>
<SeoMeta
    title="Classic Jacket"
    description="A premium leather jacket with a tailored fit."
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Page title. Rendered as `{title} \| {siteName}` by default. When omitted, the site name alone is used. |
| `rawTitle` | `boolean` | `false` | Render `title` exactly as given — **no** ` \| {siteName}` suffix. See [Title Modes](#title-modes) below. |
| `description` | `string` | — | Meta description |
| `noIndex` | `boolean` | `false` | Adds `<meta name="robots" content="noindex">` |
| `siteName` | `string` | `t('common:defaultSiteName')` | Override the site name used in the title suffix |
| `twitter` | `object` | — | Twitter Card metadata (`cardType`, `image`) |

### Title Modes

`SeoMeta` supports two title modes via the `title` and `rawTitle` props:

| Mode | Props | `<title>` output | When to use |
|------|-------|------------------|-------------|
| **Suffixed** (default) | `title="My Page"` | `My Page \| NextGen PWA Kit Store` | Most pages — product, category, search, account, etc. |
| **Raw** | `rawTitle title="My Page"` | `My Page` | Pages needing full control — e.g., the homepage passes the store name directly and doesn't want it doubled. |
| **Fallback** | *(no title)* | `NextGen PWA Kit Store` | Bare minimum — only the site name. |

**Examples:**

```tsx
// Suffixed (default) — most pages use this
<SeoMeta title="Classic Jacket" />
// → <title>Classic Jacket | NextGen PWA Kit Store</title>

// Raw — homepage or any page needing exact title control
<SeoMeta rawTitle title="NextGen PWA Kit Store — Shop the Latest" />
// → <title>NextGen PWA Kit Store — Shop the Latest</title>

// Fallback — no title provided
<SeoMeta />
// → <title>NextGen PWA Kit Store</title>
```

### Changing the Site Name

The site name appended to page titles (e.g. `" | NextGen PWA Kit Store"`) is pulled from the `common.defaultSiteName` translation key. To change it, update the value in each locale's `translations.json`:

```json
// src/locales/en-US/translations.json
{
    "common": {
        "defaultSiteName": "Your Store Name"
    }
}
```

You can also override it per-route via the `siteName` prop:

```tsx
<SeoMeta title="Sale" siteName="My Outlet Store" />
// Renders: "Sale | My Outlet Store"
```

### Route Patterns

The template uses two patterns depending on whether a page is public or auth-protected:

**Public pages** — Include both title and description for search engine visibility:

```tsx
<SeoMeta
    title={t('meta.title', { defaultValue: 'About Us' })}
    description={t('meta.description', { defaultValue: 'Learn more about our story.' })}
/>
```

**Auth-protected / transactional pages** — Include title (for browser tab UX) but no description, with `noIndex` to prevent indexing:

```tsx
<SeoMeta title={t('meta.title', { defaultValue: 'Order History' })} noIndex />
```

### Adding Meta Tags to a New Page

1. Import `SeoMeta` and render it inside your route component:

```tsx
import { SeoMeta } from '@/components/seo-meta';

export default function MyNewPage() {
    const { t } = useTranslation('myPage');

    return (
        <>
            <SeoMeta
                title={t('meta.title', { defaultValue: 'My Page' })}
                description={t('meta.description', { defaultValue: 'Description of my page.' })}
            />
            {/* page content */}
        </>
    );
}
```

2. All title and description strings use i18n with `defaultValue` fallbacks. To localize them, add the corresponding keys to your translation files (e.g. `meta.title`, `meta.description` within the page's i18n namespace).

### Where `SeoMeta` is Used

| Route | Title | Description | noIndex |
|-------|-------|-------------|---------|
| `/` (Home) | Store name (raw) | Welcome message | — |
| `/category/:id` | Category name | Category page/general description | — |
| `/product/:id` | Product name | Product page/short description | — |
| `/search` | Search query | Result count + query | — |
| `/about-us` | About Us | Store mission description | — |
| `/login` | Sign In | Sign in prompt | — |
| `/cart` | Cart | Cart review prompt | — |
| `/checkout` | Checkout | — | Yes |
| `/order-confirmation/:orderNo` | Order Confirmation | — | Yes |
| `/account/*` (all sub-pages) | Page-specific title | — | Yes |

### Why Some Pages Use `noIndex`

Pages behind authentication (account, wishlist, orders) and transactional pages (checkout, order confirmation) use `noIndex` because:

- **Crawlers can't access them** — they'll see a login redirect or empty state, not useful content.
- **Content is session-specific** — a checkout page with no basket or someone else's order confirmation has no value in search results.

If your implementation exposes any of these pages publicly (e.g., shared wishlists), remove `noIndex` from those routes.
