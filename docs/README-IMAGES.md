# Images in Storefront Next

## Image Alt Text Strategy

This section defines the alt text strategy for all image rendering in `template-retail-rsc-app`.

### Source Of Truth

For commerce product images, **SCAPI image alt text is the source of truth**.

### Fallback Order

Use this fallback order consistently for product images:

1. SCAPI image alt (`image.alt`)
2. Product name (`productName` / `name`)
3. Localized generic fallback (for example `t('common:productImageAlt')`)
4. Hardcoded English fallback as a final safety net (for example `'Product Image'`)

Use explicit `||` fallback chains in components to preserve this order.

### Rules

- Always provide an `alt` attribute on rendered `<img>` elements.
- Use localized strings for generic fallback alt text, then a hardcoded English fallback as the last fallback.
- Decorative images must set `alt=""` when the image is purely decorative and has no meaningful text equivalent.


### Why This Exists

This strategy keeps image accessibility predictable and avoids inconsistent alt text quality across components, while preserving SCAPI metadata as the primary content source.
