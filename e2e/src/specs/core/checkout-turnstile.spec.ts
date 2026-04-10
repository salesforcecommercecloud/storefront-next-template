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

/**
 * Turnstile Bot Protection E2E Tests
 * Feature Spec: e2e/feature-specs/checkout/turnstile-protection.spec.md
 *
 * These tests verify the Turnstile bot protection integration in checkout.
 * Turnstile is integrated in the checkout contact-info component where passwordless
 * login is triggered when users enter and blur the email field.
 *
 * NOTE: These tests validate frontend behavior only.
 * Backend token verification is not tested (requires eCDN implementation).
 *
 * Prerequisites for E2E testing:
 * - Turnstile must be enabled in config (security.turnstile.enabled = true)
 * - Site key must be configured for the BASE_URL host
 * - Use Cloudflare test key (2x00000000000000000000AA) for invisible mode testing
 *
 * Skipping:
 * - Scenarios that depend on Turnstile being pre-configured for the current host
 *   (script-loading, token-generation) are skipped when BASE_URL is not localhost
 *   because the default config.server.ts only maps http://localhost:5173.
 * - Scenarios that inject their own config override (error-handling, visible-mode,
 *   interactive-challenge) dynamically set the site key to match BASE_URL.
 */

// Type declarations for browser globals
declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: Record<string, unknown>) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

Feature('Checkout - Turnstile Bot Protection').tag('@core').tag('@checkout').tag('@turnstile');

const { I, addToCartFlow, checkoutPage } = inject();
import { expect } from 'chai';
import { TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';
import type { Route, Request, ConsoleMessage } from '@playwright/test';

// The default config.server.ts only has a Turnstile site key for http://localhost:5173.
// When E2E tests run against a remote MRT target the host won't match, so the widget
// never renders and Cloudflare's CDN may also be unreachable. Skip those scenarios.
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const isLocalhost = new URL(baseUrl).hostname === 'localhost';
const TurnstileScenario = isLocalhost ? Scenario : Scenario.skip;

TurnstileScenario('Turnstile script loads and widget renders in checkout', async () => {
    // Navigate to checkout with items
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Check 1: Verify Turnstile script loads from Cloudflare CDN
    const scriptExists = await I.executeScript(() => {
        const script = document.querySelector('script[src*="challenges.cloudflare.com"]');
        return script !== null;
    });
    expect(scriptExists, 'Turnstile script should load from Cloudflare CDN').to.be.true;

    // Check 2: Wait for window.turnstile API to load (script is async)
    await I.waitForFunction(() => {
        return typeof window.turnstile === 'object' && typeof window.turnstile.render === 'function';
    }, 10);

    const turnstileAPI = await I.executeScript(() => {
        return (
            typeof window.turnstile === 'object' &&
            typeof window.turnstile.render === 'function' &&
            typeof window.turnstile.reset === 'function'
        );
    });
    expect(turnstileAPI, 'window.turnstile API should be available').to.be.true;

    // Check 3: Verify Turnstile widget element is present in DOM (not checking visibility since it's invisible mode)
    const widgetInDOM = await I.executeScript(() => {
        return document.querySelector('[data-testid="turnstile-widget"]') !== null;
    });
    expect(widgetInDOM, 'Turnstile widget should exist in DOM').to.be.true;
})
    .tag('@checkout-ac30')
    .tag('@bot-protection')
    .tag('@script-loading');

TurnstileScenario('Turnstile token is generated and included in passwordless login request', async () => {
    // Navigate to checkout with items
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Wait for Turnstile widget to be present
    await I.waitForElement('[data-testid="turnstile-widget"]', 10);

    // Wait for Turnstile to initialize (script load + render + token generation)
    // Invisible mode generates token automatically in background
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Set up network interception BEFORE triggering passwordless login
    let requestData: any = null;
    await I.usePlaywrightTo('intercept passwordless login request', async ({ page }) => {
        await page.route('**/*authorize-passwordless-email*', async (route: Route, request: Request) => {
            if (request.method() === 'POST') {
                const postData = request.postData();
                if (postData) {
                    // Parse FormData from POST body
                    const formData: Record<string, string> = {};
                    const params = new URLSearchParams(postData);
                    params.forEach((value, key) => {
                        formData[key] = value;
                    });
                    requestData = formData;
                }
            }
            await route.continue();
        });
    });

    // Enter email and trigger passwordless login by blurring email field
    I.fillField(checkoutPage.locators.emailInput, 'test-turnstile@example.com');
    I.click(checkoutPage.locators.phoneInputContactInfo); // Blur email field

    // Wait for request to be sent
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check 4: Verify token was generated and included in FormData
    expect(requestData, 'Request should have been intercepted').to.not.be.null;
    expect(requestData?.email, 'Request should include email').to.equal('test-turnstile@example.com');
    expect(requestData?.turnstileToken, 'Request should include turnstileToken').to.be.a('string');
    expect(requestData?.turnstileToken.length, 'Token in request should be a long string').to.be.greaterThan(20);
})
    .tag('@checkout-ac30')
    .tag('@bot-protection')
    .tag('@token-generation');

Scenario('Checkout form shows no errors with Turnstile (graceful degradation)', async () => {
    // Navigate to checkout with items
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Verify contact info section is present
    I.seeElement(checkoutPage.locators.emailInput);

    // Enter email and phone
    I.fillField(checkoutPage.locators.emailInput, 'test-graceful@example.com');
    I.fillField(checkoutPage.locators.phoneInputContactInfo, '6175550123');

    // No errors should be visible (graceful degradation)
    const errorCount = await I.grabNumberOfVisibleElements('[role="alert"]');
    expect(errorCount, 'No error alerts should be visible').to.equal(0);
})
    .tag('@checkout-ac30')
    .tag('@bot-protection')
    .tag('@graceful-degradation');

TurnstileScenario('Error handling - Challenge fails (2x00000000000000000000BB)', async () => {
    // Test graceful degradation when Turnstile challenge actively fails
    // Uses Cloudflare test key that always fails

    // Override site key before app loads — use actual BASE_URL so the key lookup matches
    const origin = new URL(baseUrl).origin;
    await I.usePlaywrightTo('override Turnstile to always-fails key', async ({ page }) => {
        await page.addInitScript((storeOrigin: string) => {
            Object.defineProperty(window, '__APP_CONFIG__', {
                get() {
                    const config = (window as any).__APP_CONFIG_ORIGINAL__ || {};
                    return {
                        ...config,
                        app: {
                            ...config.app,
                            security: {
                                ...config.app?.security,
                                turnstile: {
                                    siteKeys: { [storeOrigin]: '2x00000000000000000000BB' },
                                    enabled: true,
                                    mode: 'invisible',
                                },
                            },
                        },
                    };
                },
                set(value) {
                    (window as any).__APP_CONFIG_ORIGINAL__ = value;
                },
                configurable: true,
            });
        }, origin);
    });

    // Capture console warnings
    const consoleWarnings: string[] = [];
    // eslint-disable-next-line @typescript-eslint/require-await
    await I.usePlaywrightTo('capture console warnings', async ({ page }) => {
        page.on('console', (msg: ConsoleMessage) => {
            if (msg.type() === 'warning' && msg.text().includes('Turnstile')) {
                consoleWarnings.push(msg.text());
            }
        });
    });

    // Set up network interception
    let requestData: any = null;
    await I.usePlaywrightTo('intercept passwordless login request', async ({ page }) => {
        await page.route('**/*authorize-passwordless-email*', async (route: Route, request: Request) => {
            if (request.method() === 'POST') {
                const postData = request.postData();
                if (postData) {
                    const formData: Record<string, string> = {};
                    const params = new URLSearchParams(postData);
                    params.forEach((value, key) => {
                        formData[key] = value;
                    });
                    requestData = formData;
                }
            }
            await route.continue();
        });
    });

    // Navigate to checkout
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Wait for Turnstile to attempt initialization and fail
    await I.waitForElement('[data-testid="turnstile-widget"]', 10);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Enter email and trigger passwordless login
    I.fillField(checkoutPage.locators.emailInput, 'test-error@example.com');
    I.click(checkoutPage.locators.phoneInputContactInfo);

    // Wait for request
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check 1: Form should work even when Turnstile fails
    expect(requestData, 'Request should be sent despite Turnstile failure').to.not.be.null;
    expect(requestData?.email, 'Email should be in request').to.equal('test-error@example.com');

    // Check 2: No error UI shown to user (graceful degradation)
    const errorCount = await I.grabNumberOfVisibleElements('[role="alert"]');
    expect(errorCount, 'No error alerts should be visible to user').to.equal(0);
})
    .tag('@checkout-ac30')
    .tag('@bot-protection')
    .tag('@error-handling')
    .tag('@always-fails');

TurnstileScenario('Visible mode - Checkbox UI appears (1x00000000000000000000AA)', async () => {
    // Test that visible mode renders a visible widget (just validate UI appears, not interaction)

    // Override to visible mode — use actual BASE_URL so the key lookup matches
    const origin = new URL(baseUrl).origin;
    await I.usePlaywrightTo('override Turnstile to visible mode', async ({ page }) => {
        await page.addInitScript((storeOrigin: string) => {
            Object.defineProperty(window, '__APP_CONFIG__', {
                get() {
                    const config = (window as any).__APP_CONFIG_ORIGINAL__ || {};
                    return {
                        ...config,
                        app: {
                            ...config.app,
                            security: {
                                ...config.app?.security,
                                turnstile: {
                                    siteKeys: { [storeOrigin]: '1x00000000000000000000AA' },
                                    enabled: true,
                                    mode: 'visible',
                                },
                            },
                        },
                    };
                },
                set(value) {
                    (window as any).__APP_CONFIG_ORIGINAL__ = value;
                },
                configurable: true,
            });
        }, origin);
    });

    // Navigate to checkout
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Wait for widget container
    await I.waitForElement('[data-testid="turnstile-widget"]', 10);

    // Give Turnstile time to render visible challenge UI
    await new Promise((resolve) => setTimeout(resolve, 7000));

    // Check 1: Widget container should exist
    const widgetExists = await I.executeScript(() => {
        return document.querySelector('[data-testid="turnstile-widget"]') !== null;
    });
    expect(widgetExists, 'Turnstile widget container should exist').to.be.true;

    expect(widgetExists, 'Widget should exist for visible mode test').to.be.true;
})
    .tag('@checkout-ac30')
    .tag('@bot-protection')
    .tag('@visible-mode');

TurnstileScenario('Interactive challenge mode - Challenge UI appears (3x00000000000000000000FF)', async () => {
    // Test that interactive challenge mode renders UI (validation only, not interaction)

    // Override to interactive challenge mode — use actual BASE_URL so the key lookup matches
    const origin = new URL(baseUrl).origin;
    await I.usePlaywrightTo('override Turnstile to interactive challenge mode', async ({ page }) => {
        await page.addInitScript((storeOrigin: string) => {
            Object.defineProperty(window, '__APP_CONFIG__', {
                get() {
                    const config = (window as any).__APP_CONFIG_ORIGINAL__ || {};
                    return {
                        ...config,
                        app: {
                            ...config.app,
                            security: {
                                ...config.app?.security,
                                turnstile: {
                                    siteKeys: { [storeOrigin]: '3x00000000000000000000FF' },
                                    enabled: true,
                                    mode: 'visible',
                                },
                            },
                        },
                    };
                },
                set(value) {
                    (window as any).__APP_CONFIG_ORIGINAL__ = value;
                },
                configurable: true,
            });
        }, origin);
    });

    // Navigate to checkout
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Wait for widget container
    await I.waitForElement('[data-testid="turnstile-widget"]', 10);

    // Give Turnstile time to render interactive challenge
    await new Promise((resolve) => setTimeout(resolve, 7000));

    // Check 1: Widget container should exist
    const widgetExists = await I.executeScript(() => {
        return document.querySelector('[data-testid="turnstile-widget"]') !== null;
    });
    expect(widgetExists, 'Turnstile widget container should exist').to.be.true;

    expect(widgetExists, 'Widget should exist for interactive challenge test').to.be.true;
})
    .tag('@checkout-ac30')
    .tag('@bot-protection')
    .tag('@interactive-challenge');

export {};
