/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildSitePath } from './url-utils';
import {
    type A11yScanOptions,
    type A11yScanResults,
    type Baseline,
    type AxeViolation,
    WCAG_TAGS,
    getViolationCountsByRule,
    groupViolationsByImpact,
} from './a11y-report-utils';

const { I } = inject();

// =============================================================================
// Baseline file path
// =============================================================================

const BASELINE_FILE = join(__dirname, '../../a11y-baseline.json');

/** Directory where JSON results are written when A11Y_COLLECT_RESULTS=true. */
const RESULTS_DIR = join(process.cwd(), 'a11y-report', 'data');

// =============================================================================
// Navigation helper
// =============================================================================

/**
 * Navigate to a page path using CodeceptJS I.amOnPage.
 * Accepts relative paths (e.g. '/category/tops') — applies the url
 * prefix via buildSitePath() and lets the Playwright helper prepend BASE_URL.
 */
export function navigateTo(pagePath: string): void {
    I.amOnPage(buildSitePath(pagePath));
}

// =============================================================================
// Axe scan
// =============================================================================

interface AxeRawResults {
    violations: AxeViolation[];
    passes: AxeViolation[];
    incomplete: AxeViolation[];
    inapplicable: AxeViolation[];
}

/**
 * Run axe-core accessibility scan on the current page via AxeBuilder.
 * Uses WCAG 2.1 AA tags by default (wcag2a, wcag2aa, wcag21aa).
 *
 * @param options - Optional AxeBuilder configuration overrides.
 * @returns Structured scan results including violations grouped by severity.
 */
export async function runAxeScan(options: A11yScanOptions = {}): Promise<A11yScanResults> {
    const tags = options.tags ?? WCAG_TAGS;

    const raw = await (I.usePlaywrightTo('run axe accessibility scan', async ({ page }) => {
        let builder = new AxeBuilder({ page }).withTags(tags);

        if (options.disableRules?.length) {
            builder = builder.disableRules(options.disableRules);
        }
        for (const selector of options.include ?? []) {
            builder = builder.include(selector);
        }
        for (const selector of options.exclude ?? []) {
            builder = builder.exclude(selector);
        }

        return await builder.analyze();
    }) as unknown as Promise<AxeRawResults>);

    const violationCounts = getViolationCountsByRule(raw.violations);
    const violationsByImpact = groupViolationsByImpact(raw.violations);

    return {
        violations: raw.violations,
        passes: raw.passes,
        incomplete: raw.incomplete,
        inapplicable: raw.inapplicable,
        violationCounts,
        violationsByImpact,
    };
}

// =============================================================================
// Viewport detection
// =============================================================================

/**
 * Viewport width threshold between mobile and desktop.
 * Mobile emulation (Pixel 7) uses 412px; desktop uses 1200px.
 * Any value between those two is a valid cutoff.
 */
const MOBILE_BREAKPOINT_PX = 768;

/**
 * Detect the current viewport and return 'desktop' or 'mobile'.
 * Used to key baseline entries per viewport so desktop and mobile
 * violation counts are tracked independently.
 */
export async function getViewportKey(): Promise<'desktop' | 'mobile'> {
    const width = await (I.usePlaywrightTo(
        'get viewport width',
        // eslint-disable-next-line @typescript-eslint/require-await -- usePlaywrightTo requires an async callback
        async ({ page }) => {
            return page.viewportSize()?.width ?? 1200;
        }
    ) as unknown as Promise<number>);

    return width < MOBILE_BREAKPOINT_PX ? 'mobile' : 'desktop';
}

// =============================================================================
// Baseline management
// =============================================================================

/**
 * Load the a11y baseline JSON file.
 * Returns an empty object if the file does not exist yet.
 */
export function loadBaseline(): Baseline {
    try {
        const content = readFileSync(BASELINE_FILE, 'utf-8');
        return JSON.parse(content) as Baseline;
    } catch {
        return {};
    }
}

/**
 * Persist an updated baseline back to the JSON file.
 */
export function saveBaseline(baseline: Baseline): void {
    writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`, 'utf-8');
}

// =============================================================================
// Results collection (used by pnpm a11y:report)
// =============================================================================

/**
 * Write scan results as JSON to RESULTS_DIR for offline report generation.
 * Only called when A11Y_COLLECT_RESULTS=true.
 *
 * @param key - Composite page/viewport key, e.g. 'homepage/desktop'.
 * @param results - Full scan results to persist.
 */
export function collectResults(key: string, results: A11yScanResults): void {
    mkdirSync(RESULTS_DIR, { recursive: true });
    const filename = `${key.replace('/', '__')}.json`;
    writeFileSync(join(RESULTS_DIR, filename), JSON.stringify(results, null, 2), 'utf-8');
}
