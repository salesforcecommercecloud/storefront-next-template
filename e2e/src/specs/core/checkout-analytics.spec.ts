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

Feature('Storefront Checkout Analytics Tests').tag('@core').tag('@checkout').tag('@analytics');

const { checkoutPage, addToCartFlow, storefrontPage } = inject();
import { expect } from 'chai';
import { TEST_PRODUCT_CATEGORIES, generateTestEmail } from '../../test-data/checkout.data';

interface BeaconPayload {
    checkoutType?: string;
    [key: string]: unknown;
}

interface CapturedBeacon {
    url: string;
    payload: BeaconPayload;
}

/**
 * Checkout Analytics - checkout_start event with checkoutType
 *
 * Validates that checkout_start events include the checkoutType attribute
 * with value 'one-click' when sent to Einstein.
 */
Scenario('Checkout start event should include checkoutType attribute', async ({ I }) => {
    const capturedBeacons: CapturedBeacon[] = [];

    await (I.usePlaywrightTo('Setup route interception for Einstein beacons', async ({ page }) => {
        await page.addInitScript(() => {
            const originalSendBeacon = navigator.sendBeacon.bind(navigator);
            (window as any).__beaconPromises = [];
            (window as any).__capturedBeacons = [];
            (window as any).__allBeaconUrls = [];

            navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
                const urlString = typeof url === 'string' ? url : url.toString();
                (window as any).__allBeaconUrls.push(urlString);

                if (urlString.includes('activities') && urlString.includes('beginCheckout')) {
                    if (data instanceof Blob) {
                        const beaconPromise = new Promise<void>((resolve) => {
                            const reader = new FileReader();
                            reader.addEventListener('loadend', () => {
                                try {
                                    const payload = JSON.parse(reader.result as string);
                                    (window as any).__capturedBeacons.push({
                                        url: urlString,
                                        payload,
                                    });
                                } catch {
                                    // ignore malformed beacon payload
                                } finally {
                                    resolve();
                                }
                            });
                            reader.readAsText(data);
                        });
                        (window as any).__beaconPromises.push(beaconPromise);
                    }
                }

                return originalSendBeacon(url, data);
            };
        });
    }) as unknown as Promise<void>);

    // Analytics only fire when tracking consent is Accepted (see use-analytics trackEvent).
    storefrontPage.navigate();
    await storefrontPage.handleTrackingConsent(true);

    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await (I.usePlaywrightTo('Wait for and retrieve captured beacons', async ({ page }) => {
        try {
            // Pass options as 3rd arg — a single object as 2nd arg is treated as the pageFunction argument, not timeout.
            await page.waitForFunction(
                () => {
                    const promises = (window as any).__beaconPromises || [];
                    return promises.length > 0;
                },
                undefined,
                { timeout: 30000 }
            );

            await page.evaluate(async () => {
                await Promise.all((window as any).__beaconPromises || []);
            });
        } catch (error) {
            const debugInfo = await page.evaluate(() => {
                return {
                    beaconPromises: (window as any).__beaconPromises?.length || 0,
                    capturedBeacons: (window as any).__capturedBeacons?.length || 0,
                    allBeaconUrls: (window as any).__allBeaconUrls || [],
                };
            });
            throw new Error(
                `Beacon capture timeout. Debug: ${JSON.stringify(debugInfo)}`,
                error instanceof Error ? { cause: error } : undefined
            );
        }

        const beacons = await page.evaluate(() => {
            return (window as any).__capturedBeacons || [];
        });
        capturedBeacons.push(...beacons);
    }) as unknown as Promise<void>);

    expect(capturedBeacons.length, 'Should have captured at least one Einstein beacon').to.be.greaterThan(0);

    const checkoutStartBeacon = capturedBeacons.find((beacon) => beacon.url.includes('beginCheckout'));
    expect(checkoutStartBeacon, 'Should have captured checkout_start (beginCheckout) beacon').to.not.be.undefined;
    expect(checkoutStartBeacon?.payload.checkoutType, 'checkoutType should be present in payload').to.equal(
        'one-click'
    );
}).tag('@checkout-start');

/**
 * Checkout Analytics - checkout_step event with checkoutType
 *
 * Validates that checkout_step events include the checkoutType attribute
 * with value 'one-click' when sent to Einstein.
 */
Scenario('Checkout step event should include checkoutType attribute', async ({ I }) => {
    const capturedBeacons: CapturedBeacon[] = [];

    await (I.usePlaywrightTo('Setup route interception for Einstein beacons', async ({ page }) => {
        await page.addInitScript(() => {
            const originalSendBeacon = navigator.sendBeacon.bind(navigator);
            (window as any).__beaconPromises = [];
            (window as any).__capturedBeacons = [];
            (window as any).__allBeaconUrls = [];

            navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
                const urlString = typeof url === 'string' ? url : url.toString();
                (window as any).__allBeaconUrls.push(urlString);

                if (urlString.includes('activities') && urlString.includes('checkoutStep')) {
                    if (data instanceof Blob) {
                        const beaconPromise = new Promise<void>((resolve) => {
                            const reader = new FileReader();
                            reader.addEventListener('loadend', () => {
                                try {
                                    const payload = JSON.parse(reader.result as string);
                                    (window as any).__capturedBeacons.push({
                                        url: urlString,
                                        payload,
                                    });
                                } catch {
                                    // ignore malformed beacon payload
                                } finally {
                                    resolve();
                                }
                            });
                            reader.readAsText(data);
                        });
                        (window as any).__beaconPromises.push(beaconPromise);
                    }
                }

                return originalSendBeacon(url, data);
            };
        });
    }) as unknown as Promise<void>);

    storefrontPage.navigate();
    await storefrontPage.handleTrackingConsent(true);

    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('analytics-step'));

    await (I.usePlaywrightTo('Wait for and retrieve captured beacons', async ({ page }) => {
        try {
            await page.waitForFunction(
                () => {
                    const promises = (window as any).__beaconPromises || [];
                    return promises.length > 0;
                },
                undefined,
                { timeout: 30000 }
            );

            await page.evaluate(async () => {
                await Promise.all((window as any).__beaconPromises || []);
            });
        } catch (error) {
            const debugInfo = await page.evaluate(() => {
                return {
                    beaconPromises: (window as any).__beaconPromises?.length || 0,
                    capturedBeacons: (window as any).__capturedBeacons?.length || 0,
                    allBeaconUrls: (window as any).__allBeaconUrls || [],
                };
            });
            throw new Error(
                `Beacon capture timeout. Debug: ${JSON.stringify(debugInfo)}`,
                error instanceof Error ? { cause: error } : undefined
            );
        }

        const beacons = await page.evaluate(() => {
            return (window as any).__capturedBeacons || [];
        });
        capturedBeacons.push(...beacons);
    }) as unknown as Promise<void>);

    expect(capturedBeacons.length, 'Should have captured at least one Einstein beacon').to.be.greaterThan(0);

    const checkoutStepBeacon = capturedBeacons.find((beacon) => beacon.url.includes('checkoutStep'));
    expect(checkoutStepBeacon, 'Should have captured checkout_step (checkoutStep) beacon').to.not.be.undefined;
    expect(checkoutStepBeacon?.payload.checkoutType, 'checkoutType should be present in payload').to.equal('one-click');
}).tag('@checkout-step');

export {};
