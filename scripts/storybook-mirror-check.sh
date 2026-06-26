#!/usr/bin/env bash
#
# storybook-mirror-check.sh - run a vertical's Storybook snapshot suite the
# SAME way CI does: against the flattened mirror output, not the unflattened
# `packages/template/` source tree.
#
# WHY THIS EXISTS
# ---------------
# Running `VERTICAL=cosmetic pnpm storybook:test --type=snapshot` against the
# source tree is NOT what CI validates and produces FALSE FAILURES: the stories
# glob (`../**/*.stories.@(ts|tsx)`) picks up BOTH a canonical story
# (e.g. Components/QuickFilters) and its cosmetic override story
# (Cosmetic/QuickFilters). Under VERTICAL=cosmetic the vite resolver shadows the
# canonical component with the override, so the canonical story renders the
# override's markup and collides with / mismatches a baseline that only exists
# (or only makes sense) in the flattened output. CI never hits this because the
# `mirror-storybook` job (.github/workflows/template-mirror.yml) FLATTENS first:
# the override physically REPLACES the canonical component, leaving exactly one
# component + one story + one snapshot. This script reproduces that flow.
#
# USAGE
#   pnpm --filter @salesforce/template storybook:test:mirror cosmetic
#   pnpm --filter @salesforce/template storybook:test:mirror fashion --type=interaction
#
# The first positional arg is the vertical (default: cosmetic). Remaining args
# are forwarded to `storybook:test` (e.g. --type=interaction, --update).
#
# SAFETY
#   Mirroring requires temporarily un-excluding the mirror package from
#   pnpm-workspace.yaml and reinstalling. This script ALWAYS restores
#   pnpm-workspace.yaml and reinstalls on exit (success, failure, or Ctrl-C) so
#   your working tree is left exactly as it started.
set -euo pipefail

VERTICAL="${1:-cosmetic}"
shift || true
FORWARD_ARGS=("$@")
[ ${#FORWARD_ARGS[@]} -eq 0 ] && FORWARD_ARGS=(--type=snapshot)

# Repo root = two levels up from packages/template/scripts
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
WORKSPACE_FILE="$ROOT/pnpm-workspace.yaml"
MIRROR_PKG="storefront-${VERTICAL}"
WORKSPACE_BACKUP="$(mktemp)"

cleanup() {
    echo "-> Restoring pnpm-workspace.yaml and reinstalling..."
    cp "$WORKSPACE_BACKUP" "$WORKSPACE_FILE"
    rm -f "$WORKSPACE_BACKUP"
    (cd "$ROOT" && pnpm install --no-frozen-lockfile >/dev/null 2>&1) || \
        echo "  WARN: reinstall failed - run 'pnpm install' manually to restore your workspace"
}
trap cleanup EXIT INT TERM

cp "$WORKSPACE_FILE" "$WORKSPACE_BACKUP"

echo "-> Mirroring '${VERTICAL}' into packages/${MIRROR_PKG} ..."
(cd "$ROOT" && pnpm --filter @salesforce/template "mirror:${VERTICAL}")

echo "-> Adding mirror output to the workspace ..."
# Drop the '!packages/storefront-<vertical>' exclusion line so pnpm sees it.
# Use a temp file (portable across BSD/GNU sed).
grep -v "!packages/${MIRROR_PKG}" "$WORKSPACE_FILE" > "$WORKSPACE_FILE.tmp"
mv "$WORKSPACE_FILE.tmp" "$WORKSPACE_FILE"
(cd "$ROOT" && pnpm install --no-frozen-lockfile)

echo "-> Running storybook:test ${FORWARD_ARGS[*]} in packages/${MIRROR_PKG} (flattened) ..."
(cd "$ROOT/packages/${MIRROR_PKG}" && pnpm storybook:test "${FORWARD_ARGS[@]}")

echo "OK: mirror Storybook check passed for '${VERTICAL}'."
