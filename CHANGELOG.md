## v0.4.0-dev (Apr 14, 2026)

- Bug fix to allow Canadian saved shipping address (@W-21915532)

## v0.4.0-dev (Apr 10, 2026)

- Checkout: Shipping method styling as per UX (@W-21512931)
- Added SDD (Spec-Driven Development) support with multi-agent code generation
- ProductCarousel: fix category-driven product fetching in Page Designer — loader now correctly invoked when `categoryId` attribute is set
- ProductCarousel: hide empty-state placeholder on live storefront; "Select a product" now only shown in Page Designer design mode
- ProductCarousel: add `categoryId` and `limit` Page Designer attribute definitions; update cartridge metadata

## v0.4.0-dev (Apr 07, 2026)

- Fix social login redirect flow and callback handler ([#1386](https://github.com/commerce-emu/storefront-next/pull/1386))
- Extend `useSite()` to return `{ site, language, locale, currency }` and remove `CurrencyProvider`/`useCurrency()` (@W-21787278) ([#1384](https://github.com/commerce-emu/storefront-next/pull/1384))
- Add Cloudflare Turnstile bot protection integration for passwordless login with graceful degradation
- Remove `'use client'` directives from template app source files ([#1375](https://github.com/commerce-emu/storefront-next/pull/1375))
- Save checkout user info for new user consistently (@W-21918823)
- Save phone number to `phoneMobile` in addition to `phoneHome` on customer profile update ([#1373](https://github.com/commerce-emu/storefront-next/pull/1373))
- Calculate basket after OTP verificatiion (@W-21918545)
- Update accessibility baseline and fix accessibility violations on order list page (@W-21685164)
- Consolidate `action.set-site`, `action.set-locale`, and `action.set-currency` into a single `action.set-site-context` route (@W-21787262) ([#1342](https://github.com/commerce-emu/storefront-next/pull/1342))
- Clean up RSC/React Server Components references from documentation, comments, and config ([#1363](https://github.com/commerce-emu/storefront-next/pull/1363))
- Remove internal "odyssey" codename references from codebase
- Add template support for registering and calling custom APIs through generated SCAPI clients (@W-21549425)
- Add configurable navigation menu options `rootCategoryId`, `maxDepth`([#1292](https://github.com/commerce-emu/storefront-next/pull/1292))
- Fix Vite dev server warnings for font loading from public directory ([#1286](https://github.com/commerce-emu/storefront-next/pull/1286))
- Restored Page Designer aspect definitions for PDP and PLP (@W-21888616)
- Added fallback functionality for Core Region component and added two regions on AboutUs page region(`headline` and `additionalinformation`) (@W-21527572)
- Handle all Page Designer API errors gracefully in `pageLoader.ts` to prevent dev server crashes (@W-21582487)
- Add comprehensive checkout E2E tests for registered shopper flows: saved/new payment methods, View All/View Less pagination, save card to profile, shipping address modal (add/edit), non-default address selection, shipping method change, billing address selection, basket persistence across sessions, and Place Order button visibility (@W-21582487)
- Add SCAPI helper utilities for API-based registered shopper setup (register, login via PKCE, create address, update profile, add payment instrument) to speed up E2E test setup (@W-21582487)
- Page Designer: `storefrontnext_base` default `@Component` group, Layout/Content groups, resolved region type refs for inclusions/exclusions; updated cartridge metadata and static registry (@W-21816874)
- Hero Banner: Page Designer **Overlay Position** (nine placements: top/middle/bottom × left/center/right) and **Overlay Alignment** (text/CTA left, center, right); updated cartridge metadata (@W-21816944)
- Hero Banner: Page Designer **Title Typography**, **Subtitle Typography**, optional **Title/Subtitle Color** (hex), and **Button Style** (Primary/Secondary/Tertiary) for the CTA; hide CTA when link is empty; derive default CTA label from URL; legacy horizontal overlay values map to the nine-position grid; updated cartridge metadata (@W-21816953)
