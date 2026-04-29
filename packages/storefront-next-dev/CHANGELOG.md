## v0.4.0-dev (Apr 24, 2026)

- Extract i18n locale chunking into SDK Vite plugin (`i18nPlugin`): splits translation files into per-language chunks automatically
- Remove local data-store provider export/build artifacts and rely on `@salesforce/mrt-utilities` data-store behavior ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Update `sfnext dev` to forward Node `--conditions` (from `process.execArgv` and `NODE_OPTIONS`) into Vite client + SSR resolution for conditional exports ([#1533](https://github.com/commerce-emu/storefront-next/pull/1533))
- Add `sfnext locales aggregate-extensions` CLI command: generates per-locale barrel files aggregating extension translations under `extPascalCase` namespaces
- Add action hooks Vite plugin: generates `virtual:action-hooks` module from extension `target-config.json` registrations, enabling server-side extension points in checkout actions
- Warn at build time when multiple UITarget components or action hook handlers share the same target ID and order value (non-deterministic execution order)

## v0.4.0-dev (Apr 10, 2026)

- Fix HMR cascade in static registry plugin: skip unnecessary file writes and module reloads when registry content is unchanged
- Add `dw.json` to `.gitignore` to prevent credentials from being accidentally committed
- Replace `dotenv` dependency with Node built-in `util.parseEnv` and `process.loadEnvFile`; consolidate `.env` loading into the oclif `init` hook
- Add `sfnext config inspect` command: shows a `config.server.ts` override summary — which values are overridden by `.env` and MRT `PUBLIC__` vars
- Remove unused /callback route

## v0.4.0-dev (Apr 07, 2026)

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
