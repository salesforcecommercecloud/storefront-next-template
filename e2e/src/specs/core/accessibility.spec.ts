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

// Infrastructure failures (timeouts, nav errors) should be retried.
// A11yBaselineError (real violations) suppresses retries via the a11yNoRetry plugin.
Feature('Accessibility Tests').tag('@a11y').retry(2);

const {
    storefrontPage,
    productListPage,
    productDetailPage,
    cartPage,
    checkoutPage,
    loginPage,
    signupPage,
    addToCartFlow,
} = inject();
import { TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';
import {
    runAxeScan,
    getViewportKey,
    loadBaseline,
    saveBaseline,
    collectResults,
    navigateTo,
} from '../../utils/a11y-utils';
import {
    A11yBaselineError,
    compareWithBaseline,
    formatViolationReport,
    formatBaselineFailure,
    formatScanBanner,
    SEVERITY_LEGEND,
    type A11yScanResults,
} from '../../utils/a11y-report-utils';

/**
 * When A11Y_UPDATE_BASELINE=true the spec writes current violation counts to
 * a11y-baseline.json instead of asserting against it. Run via:
 *   pnpm a11y:update-baseline
 */
const isUpdateMode = process.env.A11Y_UPDATE_BASELINE === 'true';

/**
 * When A11Y_COLLECT_RESULTS=true scan results are written to a11y-report/data/
 * for offline markdown report generation. Set automatically by pnpm a11y:report.
 */
const isCollectMode = process.env.A11Y_COLLECT_RESULTS === 'true';

BeforeSuite(() => {
    console.log(`\n${SEVERITY_LEGEND}\n`);
});

/**
 * Print the per-scan banner and return the detected viewport.
 * Call this at the very start of each scenario — before any navigation or
 * setup steps — so the banner appears in CI logs even when setup fails.
 */
async function beginScan(pageKey: string): Promise<'desktop' | 'mobile'> {
    const viewport = await getViewportKey();
    console.log(`\n${formatScanBanner(pageKey, viewport)}`);
    return viewport;
}

/**
 * Shared helper: run an axe scan and either update the baseline (update mode)
 * or assert that no new violations have appeared since the last baseline commit.
 *
 * @param pageKey - Short identifier for the page, e.g. 'homepage'.
 * @param viewport - Viewport key returned by {@link beginScan}.
 *                   The final baseline key is '<pageKey>/<viewport>'.
 */
async function scanAndAssert(pageKey: string, viewport: 'desktop' | 'mobile'): Promise<void> {
    const results: A11yScanResults = await runAxeScan();
    const key = `${pageKey}/${viewport}`;

    // Persist results when running in collect mode (pnpm a11y:report).
    if (isCollectMode) {
        collectResults(key, results);
    }

    const baseline = loadBaseline();

    if (isUpdateMode) {
        baseline[key] = results.violationCounts;
        saveBaseline(baseline);
        console.log(`[A11Y] Updated baseline for ${key}`);
        console.log(formatViolationReport(results));
        return;
    }

    const comparison = compareWithBaseline(key, results.violationCounts, baseline, results.violations);

    if (!comparison.passed) {
        // Print the full severity-grouped report via console.log first so it is
        // never truncated by CodeceptJS's error message display limit.
        console.log(`\n${formatViolationReport(results)}`);
        throw new A11yBaselineError(formatBaselineFailure(key, comparison, results));
    }

    const totalViolations = Object.values(results.violationCounts).reduce((a, b) => a + b, 0);

    if (Object.keys(comparison.decreasedViolations).length > 0) {
        console.log(`↓ ${key} — violations decreased, run pnpm a11y:update-baseline`);
    } else {
        console.log(
            `✓ PASS: ${key} — ${totalViolations} violation${totalViolations !== 1 ? 's' : ''} (within baseline)`
        );
    }

    const informationalCount =
        Object.keys(comparison.informationalNewViolations).length +
        Object.keys(comparison.informationalIncreasedViolations).length;
    if (informationalCount > 0) {
        console.log(
            `  ⓘ ${informationalCount} moderate/minor rule${informationalCount !== 1 ? 's' : ''} exceeded baseline (not blocking — update with pnpm a11y:update-baseline)`
        );
    }
}

// =============================================================================
// Scenarios
// =============================================================================

Scenario('Homepage accessibility', async () => {
    const viewport = await beginScan('homepage');
    storefrontPage.navigate();
    await scanAndAssert('homepage', viewport);
}).tag('@homepage');

Scenario('Product List Page accessibility', async () => {
    const viewport = await beginScan('plp');
    // Navigate to a known category page
    navigateTo('/category/womens-clothing-tops');
    productListPage.validateProductsDisplayed();
    await scanAndAssert('plp', viewport);
}).tag('@plp');

Scenario('Product Detail Page accessibility', async () => {
    const viewport = await beginScan('pdp');
    // Navigate to a known product — update the product ID to match your catalog
    navigateTo('/product/25502228M');
    await productDetailPage.waitForPageReady();
    await scanAndAssert('pdp', viewport);
}).tag('@pdp');

Scenario('Search Results accessibility', async () => {
    const viewport = await beginScan('search');
    storefrontPage.navigate();
    storefrontPage.searchForProduct('shirt');
    productListPage.validateProductsDisplayed();
    await scanAndAssert('search', viewport);
}).tag('@search');

Scenario('Cart Page accessibility', async () => {
    const viewport = await beginScan('cart');
    await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    cartPage.navigate();
    await scanAndAssert('cart', viewport);
}).tag('@cart');

Scenario('Checkout Page accessibility', async () => {
    const viewport = await beginScan('checkout');
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();
    await scanAndAssert('checkout', viewport);
}).tag('@checkout');

Scenario('Login Page accessibility', async () => {
    const viewport = await beginScan('login');
    loginPage.navigate();
    await scanAndAssert('login', viewport);
}).tag('@login');

Scenario('Signup Page accessibility', async () => {
    const viewport = await beginScan('signup');
    signupPage.navigate();
    await scanAndAssert('signup', viewport);
}).tag('@signup');

export {};
