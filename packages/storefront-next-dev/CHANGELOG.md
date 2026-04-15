## v0.4.0-dev (Apr 10, 2026)

- Add `dw.json` to `.gitignore` to prevent credentials from being accidentally committed

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
