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

const { I, productListPage, productDetailPage, checkoutPage } = inject();
import type { ProductInfo } from '../types/product.types';
import { buildSitePath } from '../utils/url-utils';

const MAX_PRODUCTS_TO_TRY = 3;
const MAX_CHECKOUT_EMPTY_RETRIES = 3;

/**
 * Add to Cart Flow
 * Reusable flow for adding a product to cart via direct category navigation
 *
 * This flow encapsulates the complete journey:
 * 1. Navigate directly to category URL
 * 2. Click "More Options" on a product (tries up to MAX_PRODUCTS_TO_TRY products)
 * 3. Select all available variants
 * 4. Click Add to Cart
 * 5. If an error toast appears (e.g. out of stock), go back and try the next product
 * 6. Return product details when add succeeds
 *
 * Uses the UI error message (toast) after add-to-cart failure to detect out-of-stock and skip to next product.
 * Fallback: if checkout shows "No items in cart. Add items before checkout.", use executeAndNavigateToCheckout to retry.
 */
class AddToCartFlow {
    /**
     * Add to cart, then navigate to checkout. If checkout shows empty-cart message, retry add-to-cart and checkout.
     * Use as fallback when add-to-cart success was not detected (e.g. no error toast) but checkout has no items.
     *
     * @param categoryUrl - Direct URL to category page
     * @param maxRetries - Max times to retry add-to-cart + checkout when checkout shows empty cart (default 2)
     * @returns Promise<ProductInfo> - Product details that were added to cart
     */
    async executeAndNavigateToCheckout(
        categoryUrl: string,
        maxRetries: number = MAX_CHECKOUT_EMPTY_RETRIES
    ): Promise<ProductInfo> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const productInfo = await this.execute(categoryUrl);
            try {
                await checkoutPage.navigateWithRetry();
                await this.waitForCheckoutReady(30);
            } catch {
                continue;
            }
            const emptyShown = await checkoutPage.isEmptyCartShown();
            if (!emptyShown) {
                return productInfo;
            }
        }
        I.saveScreenshot(`add-to-cart-checkout-empty-${Date.now()}.png`);
        throw new Error(
            `Checkout still showed empty cart after ${maxRetries + 1} add-to-cart attempts for ${categoryUrl}`
        );
    }

    /**
     * Same as executeAndNavigateToCheckout but prefers adding a product that shows a Sale (promotion) badge on the PLP.
     * Use only for My Cart E2E tests that validate promotion display; all other tests should use
     * executeAndNavigateToCheckout() to keep the original add-to-cart order (first product first).
     *
     * @param categoryUrl - Direct URL to category page
     * @param maxRetries - Max times to retry when checkout shows empty cart
     * @returns Promise<ProductInfo> - Product details that were added to cart
     */
    async executeAndNavigateToCheckoutPreferringPromoted(
        categoryUrl: string,
        maxRetries: number = MAX_CHECKOUT_EMPTY_RETRIES
    ): Promise<ProductInfo> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const productInfo = await this.execute(categoryUrl, { preferPromotedProduct: true });
            try {
                await checkoutPage.navigateWithRetry();
                await this.waitForCheckoutReady(30);
            } catch {
                continue;
            }
            const emptyShown = await checkoutPage.isEmptyCartShown();
            if (!emptyShown) {
                return productInfo;
            }
        }
        I.saveScreenshot(`add-to-cart-checkout-empty-${Date.now()}.png`);
        throw new Error(
            `Checkout still showed empty cart after ${maxRetries + 1} add-to-cart attempts for ${categoryUrl}`
        );
    }

    /**
     * Wait for checkout-specific content (contact-info card OR empty-cart message).
     * Uses Playwright's locator.waitFor() which is event-driven, not Node-side polling.
     * Throws on timeout so the retry loop can catch and retry the entire add-to-cart + navigate flow.
     */
    private async waitForCheckoutReady(timeoutSeconds: number = 30): Promise<void> {
        await (I.usePlaywrightTo('wait for checkout content', async ({ page }) => {
            const content = page.locator(
                '[data-testid="sf-toggle-card-contact-info-content"], :text-matches("No items in cart")'
            );
            await content.first().waitFor({ state: 'visible', timeout: timeoutSeconds * 1000 });
        }) as unknown as Promise<void>);
    }

    /**
     * Execute the complete add-to-cart flow
     *
     * @param categoryUrl - Direct URL to category page (e.g., '/category/womens-clothing-tops')
     * @param options - Optional: preferPromotedProduct tries a product with Sale badge first (used only by My Cart tests)
     * @returns Promise<ProductInfo> - Product details that were added to cart
     */
    async execute(categoryUrl: string, options?: { preferPromotedProduct?: boolean }): Promise<ProductInfo> {
        try {
            await this.navigateToPLP(categoryUrl);

            const productCount = await productListPage.getProductCount();
            if (productCount === 0) {
                throw new Error('No products found on category page');
            }

            const preferred =
                options?.preferPromotedProduct === true
                    ? await productListPage.getIndexOfFirstProductWithSaleBadge()
                    : null;
            const indices =
                preferred !== null && preferred >= 0 && preferred < productCount
                    ? [
                          preferred,
                          ...Array.from({ length: Math.min(productCount, MAX_PRODUCTS_TO_TRY) }, (_, i) => i).filter(
                              (i) => i !== preferred
                          ),
                      ]
                    : Array.from({ length: Math.min(productCount, MAX_PRODUCTS_TO_TRY) }, (_, i) => i);

            for (const index of indices) {
                await productListPage.clickMoreOptionsForProductByIndex(index);
                await productDetailPage.waitForPageReady();
                await productDetailPage.selectAllVariants();

                const addToCartCount = await I.grabNumberOfVisibleElements(productDetailPage.locators.addToCartButton);
                const addToCartVisible = addToCartCount > 0;
                if (!addToCartVisible) {
                    await this.navigateToPLP(categoryUrl);
                    continue;
                }

                const enabled = await productDetailPage.isAddToCartEnabled();
                if (!enabled) {
                    await this.navigateToPLP(categoryUrl);
                    continue;
                }

                const productTitle = await productDetailPage.getProductTitle();
                const quantity = await productDetailPage.getQuantity();
                productDetailPage.addToCart();

                const outcome = await productDetailPage.waitForAddToCartOutcome(15);
                if (outcome === 'error') {
                    await this.navigateToPLP(categoryUrl);
                    continue;
                }

                return {
                    title: productTitle,
                    quantity: quantity || '1',
                };
            }

            throw new Error(
                `Could not find an in-stock product after trying ${indices.length} products in ${categoryUrl}`
            );
        } catch (error) {
            I.saveScreenshot(`add-to-cart-error-${Date.now()}.png`);
            throw error;
        }
    }

    /** Navigate to PLP and wait for product grid. Retries once if the grid fails to render. */
    private async navigateToPLP(categoryUrl: string): Promise<void> {
        I.amOnPage(buildSitePath(categoryUrl));
        const loaded = await this.waitForPLPGrid();
        if (!loaded) {
            I.amOnPage(buildSitePath(categoryUrl));
            await this.waitForPLPGrid();
        }
    }

    /** Wait for product tiles to appear on the PLP. Returns true if found, false on timeout. */
    private async waitForPLPGrid(timeoutMs: number = 20_000): Promise<boolean> {
        try {
            await (I.usePlaywrightTo('wait for PLP product tiles', async ({ page }) => {
                await page.locator('[data-slot="card"]').first().waitFor({ state: 'visible', timeout: timeoutMs });
            }) as unknown as Promise<void>);
            return true;
        } catch {
            return false;
        }
    }
}

// Export as singleton
export = new AddToCartFlow();
