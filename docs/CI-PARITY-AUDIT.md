# CI Parity Audit — `packages/template/` (W-22492419)

**Status:** 2026-05-28 — first pass. Owner: Daniel.

## Purpose

`packages/template-retail-rsc-app/` is the customer-facing baseline that today's CI is wired to. The Option A rewrite stands up a parallel `packages/template/` package with vertical overlays + a mirror script that emits per-vertical standalone repos (`packages/storefront-{fashion,cosmetic}/`).

This audit enumerates every workflow under `.github/workflows/` and classifies whether the new `template/` (and its mirror outputs) have parity coverage. Phase 7's deliverables are `template.yml` + `template-mirror.yml`; the question this doc answers is: **what's still missing, and what can wait until cutover (W-22492314)?**

## Hard rules

1. **Do NOT modify `template-retail-rsc-app` jobs.** That package is the comparison baseline and the customer-facing artifact through cutover. Touching its CI invalidates the comparison.
2. **`packages/storefront-{fashion,cosmetic}/` are gitignored / workspace-excluded.** CI must regenerate them on demand via `pnpm --filter @salesforce/template mirror:<vertical>` and then bring them into the workspace ad-hoc (the `sed -i` + `pnpm install --no-frozen-lockfile` pattern in `template-mirror.yml`).
3. **Bias toward duplicate-and-defer over extend-in-place.** New parity jobs land in `template*.yml` files so they're easy to delete at cutover when they replace the originals.

## Workflow inventory

Legend: ✅ covered · ⚠️ partial · ❌ gap · 🔵 N/A (template-agnostic)

| # | File | Targets | Parity | Recommendation |
|---|---|---|---|---|
| 1 | `template.yml` | `packages/template/` | ✅ self | already wired (bundle-size, storybook-snapshot/interaction/a11y, story-coverage, lighthouse) |
| 2 | `template-mirror.yml` | mirror outputs (fashion+cosmetic) | ✅ self | already wired (test, build, bundlesize, lint, storybook × suite × vertical, leftover-SDK-ref check) |
| 3 | `build.yml` | workspace-wide `pnpm build` | ✅ | recursive — picks up `@salesforce/template` automatically |
| 4 | `tests.yml` | workspace-wide `pnpm test` | ✅ | recursive |
| 5 | `typecheck.yml` | workspace-wide `pnpm typecheck` | ✅ | recursive |
| 6 | `eslint.yml` (job: `eslint`) | workspace-wide `pnpm lint` | ✅ | recursive |
| 7 | `eslint.yml` (job: `eslint-generated`) | hardcoded `--template ./packages/template-retail-rsc-app` (line 78) | ✅ | landed: sibling job `eslint-generated-template` added in this PR |
| 8 | `bundle_size_test.yml` | `pnpm --filter template-retail-rsc-app bundlesize` (line 42) | ✅ | duplicated by `template.yml::bundle-size` and `template-mirror.yml::mirror::bundlesize` |
| 9 | `lighthouse.yml` | `template-retail-rsc-app build` + `lighthouse:ci` (lines 52, 100) | ✅ | duplicated by `template.yml::lighthouse` |
| 10 | `storybook-tests.yml` | `template-retail-rsc-app` × {interaction, a11y, snapshot} | ✅ | duplicated by `template.yml::storybook-{snapshot,interaction,a11y}` and `template-mirror.yml::mirror-storybook` matrix |
| 11 | `story-coverage.yml` | `template-retail-rsc-app` storybook coverage | ✅ | duplicated by `template.yml::storybook-coverage` |
| 12 | `extensions.yml` | `template-retail-rsc-app` strip-extensions matrix (BOPIS / MULTISHIP / STORE_LOCATOR combos) | ✅ | landed: `template-extensions.yml` mirrors the matrix against `packages/template/` |
| 13 | `storybook-deploy.yml` | builds & publishes `template-retail-rsc-app/.storybook/storybook-static` to GitHub Pages on push to main | ❌ | **gap, low urgency.** Open question (#3 in tracking doc) — single composed Storybook or one-per-vertical? Defer until composition decision lands. |
| 14 | `windows-tests.yml` (jobs: `build`, `tests`, `lint`) | workspace-wide | ✅ | recursive |
| 15 | `windows-tests.yml` (job: `dev-server`) | hardcoded `working-directory: packages/template-retail-rsc-app` (line 153), polls `localhost:5173` | ✅ | landed: `template-windows.yml` boots `dev:fashion` + `dev:cosmetic` on `windows-latest` via 2-entry matrix |
| 16 | `sync-template-mirror.yml` | hardcodes `template-retail-rsc-app` paths (lines 13, 70, 77, 81, 132, 167) — pushes the standalone template to the public mirror repo on push to main / release-* | ❌ | **gap, deferred to cutover.** This is the public-customer artifact pipeline. Switching it to `packages/template/` mirror outputs IS the cutover (W-22492314). Do not touch in this audit. |
| 17 | `e2e-runner.yml` | reusable workflow; hardcodes `packages/template-retail-rsc-app/e2e` working dir (lines 361, 416, 462, 470, 479, 485, 494) | ❌ | **gap, deferred.** `packages/template/e2e/` exists but no caller targets it. Parity requires either (a) parameterizing the package path on the reusable workflow or (b) duplicating into `e2e-runner-template.yml`. Tied to W-22492582 (E2E carve in Phase 2 parity work). |
| 18 | `e2e-core-pr.yml` | calls `e2e-runner.yml` | ❌ | **gap, deferred** — see #17 |
| 19 | `e2e-core-nightly.yml` | calls `e2e-runner.yml` | ❌ | **gap, deferred** — see #17 |
| 20 | `e2e-postmerge.yml` | calls `e2e-runner.yml` | ❌ | **gap, deferred** — see #17 |
| 21 | `a11y-core-pr.yml` | calls `e2e-runner.yml` | ❌ | **gap, deferred** — see #17 |
| 22 | `e2e-multi-site-nightly.yml` | 5 matrix variants × `template-retail-rsc-app/e2e` config-apply scripts (lines 77, 102, 127, 152, 177) | ❌ | **gap, deferred** — see #17. Multi-site config scripts may not exist yet under `packages/template/e2e/`. |
| 23 | `deploy_main.yml` | MRT deploy from `packages/template-retail-rsc-app` build output | ❌ | **gap, deferred to cutover.** This is the production demo deploy. Switching it IS the cutover. Do not touch. |
| 24 | `deploy-perf.yml` | Q4 perf MRT deploy | ❌ | **gap, deferred to cutover.** Same as #23. |
| 25 | `fork.yml` | release tooling | 🔵 | template-agnostic |
| 26 | `publish-dashboard.yml` | CI dashboard publishing | 🔵 | template-agnostic |
| 27 | `sync-public-monorepo.yml` | full monorepo sync to public org | 🔵 | template-agnostic (sync target is the whole repo, not a single package) |
| 28 | `upload-report.yml` | reusable; uploads to S3 | 🔵 | template-agnostic |
| 29 | `verify-signatures.yml` | commit signing verification | 🔵 | template-agnostic |

## Summary

| Bucket | Count |
|---|---|
| ✅ Covered (recursive or duplicated in `template*.yml`) | 14 (after this PR: rows 1–11, plus 7/12/15 newly landed) |
| ❌ Gap — deferred to cutover (W-22492314) | 9 (rows 13, 16, 17–22, 23, 24) |
| 🔵 N/A (template-agnostic) | 5 (rows 25–29; rows 3–6/14 are workspace-wide) |

## Priority order — actionable gaps for this ticket

The three gaps below are the actionable parity gaps. All three are landed in this PR.

### 1. Extension strip matrix — `template-extensions.yml` ✅ LANDED

`.github/workflows/template-extensions.yml` mirrors `extensions.yml`'s strip matrix against `packages/template/` with the same 4 combinations (`SFDC_EXT_BOPIS`, `BOPIS+MULTISHIP`, `BOPIS+STORE_LOCATOR`, `BOPIS+STORE_LOCATOR+MULTISHIP`). Cwd swapped from `packages/template-retail-rsc-app` to `packages/template`. The existing `extensions.yml` is untouched.

**Why:** the extension scan is overlay-aware in the new structure (W-22492586). The strip CLI exercising the new path is the canary.

### 2. Generated-project ESLint smoke — `eslint.yml::eslint-generated-template` ✅ LANDED

A new job `eslint-generated-template` was added to `eslint.yml`, sibling to `eslint-generated`. It runs the same `create-storefront --template ./packages/template ...` flow + lint, with identical exit-code semantics (≥2 fatal, 1 ignored). The existing `eslint-generated` job is untouched.

**Why:** generated eslint config is part of customer artifact contract. Drift here is invisible until a customer first lints.

### 3. Windows dev-server smoke — `template-windows.yml` ✅ LANDED

`.github/workflows/template-windows.yml` boots `pnpm dev:fashion` and `pnpm dev:cosmetic` on `windows-latest` via a 2-entry matrix, polls `localhost:5173`, then stops. Build / unit tests / lint on Windows are already covered by the recursive jobs in `windows-tests.yml` so this only carries the dev-server smoke. The matrix vertical is passed through `VERTICAL_FOR_DEV` env var (not interpolated into the run block) to satisfy the GitHub Actions injection-safe pattern.

**Why:** dev-server smoke catches Windows-specific path/process issues. Cheap to add.

## Out of scope (deferred to cutover, W-22492314)

These workflows are the customer artifact pipeline. Their migration **IS** the cutover — touching them now would partially cut over without the rollback safety the parallel-CI strategy gives us:

- `sync-template-mirror.yml` (public mirror repo push)
- `deploy_main.yml` (MRT production demo deploy)
- `deploy-perf.yml` (Q4 perf MRT deploy)
- `e2e-runner.yml` + all 6 callers (`e2e-core-pr`, `e2e-core-nightly`, `e2e-postmerge`, `a11y-core-pr`, `e2e-multi-site-nightly`) — tracked under **W-22492582** (E2E carve, Phase 2 parity work). Requires `packages/template/e2e/` to be self-sufficient with its own multi-site config scripts.
- `storybook-deploy.yml` — gated on Storybook composition decision (Open Question #3 in `multi-template-tracking.md`).

## References

- Tracking doc: `~/.claude/plans/multi-template-tracking.md`
- Phase 7 plan: `~/.claude/plans/check-temp-claude-for-the-dreamy-cat.md`
- Existing parity wires: `.github/workflows/template.yml`, `.github/workflows/template-mirror.yml`
