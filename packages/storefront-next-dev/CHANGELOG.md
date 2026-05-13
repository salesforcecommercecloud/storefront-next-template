## v1.0.0-dev

- Fix dev-only `TypeError: Cannot read properties of null (reading 'currency')` (or similar) in loaders that consume site context, caused by Vite externalizing the SDK for some import sites and transforming it for others — producing two `dist/site-context.js` module records and two `createContext()` keys. `baseConfigPlugin` now sets `ssr.noExternal: ['@salesforce/storefront-next-runtime']` so all SSR import sites resolve through Vite's transform cache and share one module record. Production builds were never affected (`managedRuntimeBundlePlugin` already inlines the SDK). Reverts the relevant part of [#1540](https://github.com/commerce-emu/storefront-next/pull/1540).
- Fix `managedRuntimeBundle` plugin build error when a CSS file references a `public/` or bundled asset (e.g. `@font-face { src: url(...) }`). `renderBuiltUrl` now returns `{ relative: true }` for `hostType === 'css'` instead of the JS runtime expression Vite rejects inside CSS `url()`. The browser resolves the relative path against the stylesheet's own URL — which already carries the per-deploy `BUNDLE_ID` — so the reference stays correct across deploys ([#1611](https://github.com/commerce-emu/storefront-next/pull/1611))
- Add `baseConfigPlugin` that contributes framework-wide Vite defaults (React/React Router dedupe, pre-bundled React Router entries) so these don't have to live in the template's `vite.config.ts` ([#1541](https://github.com/commerce-emu/storefront-next/pull/1541))
- Add action hooks Vite plugin: generates `virtual:action-hooks` module from extension `target-config.json` registrations, enabling server-side extension points in checkout actions
- Warn at build time when multiple UITarget components or action hook handlers share the same target ID and order value (non-deterministic execution order)
- Add `enabled` boolean field to `target-config.json` component entries: components with `enabled: false` are skipped at build time and tree-shaken from the production bundle; entries without the field default to `true` (backward compatible)

## v0.4.0 (May 5, 2026)

- Move `pnpm-workspace.yaml.hbs → .yaml` conversion from `create-storefront` CLI into mirror sync scripts; `prepare-standalone-template.js` now pins exact versions in `minimumReleaseAgeExclude` for all exempted packages
- Extract i18n locale chunking into SDK Vite plugin (`i18nPlugin`): splits translation files into per-language chunks automatically
- Add `sfnext locales aggregate-extensions` CLI command: generates per-locale barrel files aggregating extension translations under `extPascalCase` namespaces
- Remove local data-store provider export/build artifacts and rely on `@salesforce/mrt-utilities` data-store behavior ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Update `sfnext dev` to forward Node `--conditions` (from `process.execArgv` and `NODE_OPTIONS`) into Vite client + SSR resolution for conditional exports ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Fix HMR cascade in static registry plugin: skip unnecessary file writes and module reloads when registry content is unchanged
- Add `dw.json` to `.gitignore` to prevent credentials from being accidentally committed
- Replace `dotenv` dependency with Node built-in `util.parseEnv` and `process.loadEnvFile`; consolidate `.env` loading into the oclif `init` hook
- Add `sfnext config inspect` command: shows a `config.server.ts` override summary — which values are overridden by `.env` and MRT `PUBLIC__` vars
- Remove unused /callback route
- Enable `future.unstable_optimizeDeps` in React Router preset to fix duplicate React module crash on dev server startup
- Add local dev support to MRT Data Layer [#1215](https://github.com/commerce-emu/storefront-next/pull/1215)
- Clean up RSC/React Server Components references from documentation and comments ([#1363](https://github.com/commerce-emu/storefront-next/pull/1363))
- Fix incorrect SSR sourcemaps for files sharing a basename in local dev debugger (@W-21175764)
- Remove internal "odyssey" codename references from codebase
- Add `sfnext scapi` CLI used to support generating and managing custom API clients in template projects (@W-21549425)
- Fix `generate-cartridge` to scan `config-metadata/` for aspect type definitions (pdp.json, plp.json) after recent move from `src/` (@W-21875428)
- Align `generate-cartridge` and static registry with template Page Designer defaults: `storefrontnext_base` default group, Layout/Content component folders and type ids (@W-21816874)

## v0.3.1 (Apr 13, 2026)

- Simplify `create-storefront` workspace yaml generation: copy `pnpm-workspace.yaml.hbs` directly from the template instead of using Handlebars templating and directory-scanning
- `prepare-standalone-template.js` now pins SDK package versions in `minimumReleaseAgeExclude` entries of `pnpm-workspace.yaml.hbs` at release time, so generated storefronts exempt exactly the published version from the quarantine window
