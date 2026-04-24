## v0.4.0-dev (Apr 24, 2026)

- Update Shopper Experience API spec to v1.3.0 with `contentLinkUuid` field support (@W-21280780)
  - Add `contentLinkUuid` to Component schema for content link UUID tracking
  - Add `name`, `fragment`, `localized`, `visible` fields to Component schema
  - Regenerate TypeScript types for all SCAPI clients
  - Remove unused `@ts-expect-error` directives from page processor now that schema includes the missing fields

## v0.4.0-dev (Apr 07, 2026)

- Add login preferences middleware and context to data store (@W-22051487) ([#1453](https://github.com/commerce-emu/storefront-next/pull/1453))
- Extend `SiteProvider` to accept `site`, `language`, `locale`, `currency` props and `useSite()` to return `SiteContextValue` (@W-21787278) ([#1384](https://github.com/commerce-emu/storefront-next/pull/1384))
- Add support to MRT Data Layer access [#1215](https://github.com/commerce-emu/storefront-next/pull/1215)
- Add currency detection to site-context middleware (@W-21787262) ([#1342](https://github.com/commerce-emu/storefront-next/pull/1342))
- Add runtime support for custom API client typing and proxy client composition (@W-21549425)
- Add support for OOTB API Key for Google Address Autocomplete feature from MRT Data Layer (@W-22130944) ([#1509](https://github.com/commerce-emu/storefront-next/pull/1509))
