# SEO

This document covers the SEO features built into the storefront template: canonical URLs and meta tags

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
