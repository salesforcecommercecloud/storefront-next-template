## v1.0.0-dev

- Remove `usid` from `PasswordlessExchangeTokenOptions` and the `exchangeToken` implementation — `usid` is not a valid field in the SLAS `PasswordLessLoginTokenRequest` schema (auth-oas-1.48.0) and was silently ignored by the server (@W-22446572) ([#1703](https://github.com/commerce-emu/storefront-next/pull/1703))
- Remove internal config utilities from public exports (`pathToObject`, `parseEnvValue`, `extractValidPaths`, `mergeEnvConfig`, `MergeEnvConfigOptions`, `createAppConfigMiddleware`, `deepMerge`) — these are internal plumbing and should not be part of the V1 GA public surface ([#1741](https://github.com/commerce-emu/storefront-next/pull/1741))
- Unify sanitizePrefix and stripPathPrefix into one helper (@W-22498207) ([#1699](https://github.com/commerce-emu/storefront-next/pull/1699))
- Email Verification Feature - Account Details ([#1460](https://github.com/commerce-emu/storefront-next/pull/1460))
- Add Shopper Availability v1.1.0 SCAPI client (`clients.shopperAvailability`) for retrieving product inventory availability without loading full product details ([#1671](https://github.com/commerce-emu/storefront-next/pull/1671))
- Update Shopper Login/Auth OAS to 1.48.0 and Shopper Customers OAS to 1.8.0 [#1623](https://github.com/commerce-emu/storefront-next/pull/1623)
- Exclude OTP endpoints from auth token invalidation — 401 responses from `/oauth2/otp/` now surface as normal API errors instead of triggering `AuthTokenInvalidError` ([#1409](https://github.com/commerce-emu/storefront-next/pull/1409))
- Update shopper-customers OAS from v1.3.2 to v1.8.0 and replace shopper-login OAS v1.42.2 with auth OAS v1.47.0 (@W-21451728) ([#1475](https://github.com/commerce-emu/storefront-next/pull/1475))
- Exclude OTP endpoints from auth token invalidation — 401 responses from `/oauth2/otp/` now surface as normal API errors instead of triggering `AuthTokenInvalidError` ([#1409](https://github.com/commerce-emu/storefront-next/pull/1409))
- Add MRT-side attribute resolution for Page Designer manifests (@W-22435606): `processPage` now walks each component's `data` map through a type-driven dispatch table that converts manifest envelopes into the same wire shape SCAPI's `getPage` controller would have returned. Covers `image` (URL resolution via `resolveMediaUrl`), `file` (envelope → URL string), `markup` (`?$staticlink$` placeholder rewriting via the new `rewriteMarkup` helper), and `cms_record` (recursive dispatch of inner attributes). Unknown attribute types pass through unchanged with a deduped one-time warning for forward compatibility. Pipeline-action placeholders (`$link-...$`, `$url(...)$`, `$include(...)$`) are intentionally not rewritten — storefront-next uses React composition for navigation. Module is platform-neutral; callers inject an `AttributeResolutionContext` (host, `resolveMediaUrl`, optional `pageLibraryDomain`).
- Extend `PageManifest` with optional `componentTypes` (per-`typeId` attribute definitions hoisted by the manifest builder) and `pageLibraryDomain` (used by the markup URL rewriter). Both are optional so older manifests still load. `componentInfo` entries gain optional `name`, `fragment`, and `custom` fields, and previously-required `visibilityRules`/`regions` are now optional (omitted when empty). `RegionInfo` fields (`name`, `componentTypeExclusions`, `componentTypeInclusions`, `maxComponents`) shift from `T | null` to optional-and-omitted to match the on-the-wire compact shape.
- `processPage` now requires `defaultLocale` and `attrCtx` in its `PageProcessorContext` and accepts an optional `componentTypes` map. Component `data` is composed in priority order (active-locale content → default-locale content → `attrDef.defaultValue`) when type definitions are available, falling back to the legacy spread merge when they aren't. Top-level page `data` is also resolved when present.
- `VariationEntry.page` now carries SCAPI-shape page metadata (`name`, `aspectTypeId`, `description`, `pageTitle`, `pageDescription`, `pageKeywords`) populated by the manifest builder; non-default-locale overrides live on a new `pageContent` overlay applied at request time.
- Add `createLazyDataStoreMiddleware` and `readLazyDataStoreEntry` exports under `@salesforce/storefront-next-runtime/data-store`. The lazy variant stores a memoized loader in router context instead of fetching up front, so routes that never read the entry never pay for the data-store call. Repeated reads within the same request share the in-flight promise. Internal `loadDataStoreEntry` helper unifies the eager and lazy fetch + error paths.


## v0.4.2 (May 20, 2026)

- Bump `@salesforce/mrt-utilities` to 0.2.1

## v0.4.1 (May 20, 2026)

- Make `@react-router/dev` and `@react-router/fs-routes` optional peer dependencies to avoid dependency conflicts for consumers that only use the `/design` exports ([#1708](https://github.com/commerce-emu/storefront-next/pull/1708))

## v0.4.0 (May 5, 2026)

- Design layer: Add `contentLinkUuid` support for duplicate component handling (@W-21609036)
  - Make `contentLinkUuid` required on component interaction events (select, delete, move, hover, focus)
  - Add `fragmentId` support to drag-and-drop events for content block instances
  - Design state fields (`selected`, `hovered`, `focused`) now expose `contentLinkUuid` as the primary identifier instead of `componentId`
  - Regions track `contentLinkUuids` instead of `componentIds`, enabling correct self-drop detection and drag validation for duplicate components
- Bump `@salesforce/mrt-utilities` to 0.1.6 to fix strict `express@5.1.0` peer dependency (now accepts `^4.0.0 || ^5.0.0`)
- Update Shopper Experience API spec to v1.3.0 with `contentLinkUuid` field support (@W-21280780)
  - Add `contentLinkUuid` to Component schema for content link UUID tracking
  - Add `name`, `fragment`, `localized`, `visible` fields to Component schema
  - Regenerate TypeScript types for all SCAPI clients
  - Remove unused `@ts-expect-error` directives from page processor now that schema includes the missing fields
- Unify data-store access on `DataStore.getDataStore().getEntry()` from `@salesforce/mrt-utilities/data-store`; remove legacy provider abstraction/local fallback paths and related tests ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Re-export `DataStore` and data-store error types from `@salesforce/mrt-utilities/data-store` to align runtime APIs with upstream package structure ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Add `/i18n` and `/i18n/client` subpath exports: `createI18nMiddleware`, `getTranslation`, `getLocale`, `mockI18nContext`, `initI18next`, and shared `defaultInterpolation`
- Unify data-store access on `DataStore.getDataStore().getEntry()` from `@salesforce/mrt-utilities/data-store`; remove legacy provider abstraction/local fallback paths and related tests ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Re-export `DataStore` and data-store error types from `@salesforce/mrt-utilities/data-store` to align runtime APIs with upstream package structure ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Add login preferences middleware and context to data store (@W-22051487) ([#1453](https://github.com/commerce-emu/storefront-next/pull/1453))
- Extend `SiteProvider` to accept `site`, `language`, `locale`, `currency` props and `useSite()` to return `SiteContextValue` (@W-21787278) ([#1384](https://github.com/commerce-emu/storefront-next/pull/1384))
- Add support to MRT Data Layer access [#1215](https://github.com/commerce-emu/storefront-next/pull/1215)
- Add currency detection to site-context middleware (@W-21787262) ([#1342](https://github.com/commerce-emu/storefront-next/pull/1342))
- Add runtime support for custom API client typing and proxy client composition (@W-21549425)
- Add support for OOTB API Key for Google Address Autocomplete feature from MRT Data Layer (@W-22130944) ([#1509](https://github.com/commerce-emu/storefront-next/pull/1509))
