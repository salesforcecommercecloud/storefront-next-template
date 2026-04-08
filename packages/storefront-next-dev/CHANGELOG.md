## v0.4.0-dev (Apr 07, 2026)

- Clean up RSC/React Server Components references from documentation and comments ([#1363](https://github.com/commerce-emu/storefront-next/pull/1363))
- Remove internal "odyssey" codename references from codebase
- Add `sfnext scapi` CLI used to support generating and managing custom API clients in template projects (@W-21549425)
- Fix `generate-cartridge` to scan `config-metadata/` for aspect type definitions (pdp.json, plp.json) after recent move from `src/` (@W-21875428)
- Align `generate-cartridge` and static registry with template Page Designer defaults: `storefrontnext_base` default group, Layout/Content component folders and type ids (@W-21816874)
