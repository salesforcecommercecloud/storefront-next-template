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
 * Checkout Registered Shopper Payment & Step Navigation Tests
 *
 * Test Coverage:
 * - Placing an order using a saved payment method (no manual card entry)
 * - Editing a shipping address step and continuing through the remaining steps
 *
 * Prerequisites:
 * - Registered shopper with full profile (saved address + payment) via registeredShopperSetupFlow
 * - Product added to cart and navigated to checkout
 */

Feature('Checkout Registered Shopper Payment & Step Navigation Tests').tag('@core').tag('@checkout');

const { checkoutPage, apiCartSetupFlow, registeredShopperSetupFlow, storefrontPage } = inject();
import { expect } from 'chai';
import { TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';

After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@registered-shopper')) {
        await storefrontPage.logout();
    }
});

/**
 * Registered shopper places order with saved payment method
 *
 * Test Flow:
 * 1. Register shopper with full profile (saved address + saved payment)
 * 2. Add product to cart and navigate to checkout
 * 3. Verify all checkout sections are prefilled (including payment in preview mode)
 * 4. Verify payment preview shows saved card details (card type + masked number)
 * 5. Place order without entering card fields
 * 6. Verify order confirmation with valid order number
 */
Scenario('Registered shopper can place order with saved payment method', async () => {
    await registeredShopperSetupFlow.execute();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.validateAllCheckoutSectionsPrefilled();

    const paymentInPreview = await checkoutPage.isPaymentInPreviewMode();
    expect(paymentInPreview, 'Payment section should be in preview mode with saved payment').to.be.true;

    const paymentText = await checkoutPage.getPaymentSectionText();
    expect(paymentText, 'Payment preview should show card info').to.have.length.greaterThan(0);

    checkoutPage.clickPlaceOrder();
    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();

    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@saved-payment')
    .tag('@place-order');

/**
 * Registered shopper can edit shipping address and continue checkout
 *
 * Test Flow:
 * 1. Register shopper with full profile (saved address)
 * 2. Add product to cart and navigate to checkout
 * 3. Verify shipping address is in preview mode (auto-applied)
 * 4. Click Edit on shipping address to expand saved addresses list
 * 5. Verify saved addresses list is visible
 * 6. Click "Continue to Shipping Method" to re-submit
 * 7. Verify shipping options step advances (Edit button appears)
 * 8. Verify payment section is reachable
 */
Scenario('Registered shopper can edit shipping address and continue checkout', async () => {
    await registeredShopperSetupFlow.execute();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const shippingInPreview = await checkoutPage.isShippingAddressInPreviewMode();
    expect(shippingInPreview, 'Shipping address should be in preview mode').to.be.true;

    checkoutPage.expandShippingAddressStep();

    const hasSavedAddresses = await checkoutPage.isSavedAddressesListVisible();
    expect(hasSavedAddresses, 'Saved addresses list should be visible after expanding').to.be.true;

    checkoutPage.clickContinueToShippingOptions();

    checkoutPage.waitForShippingOptionsStep(15);
    const shippingOptionsInPreview = await checkoutPage.isShippingOptionsInPreviewMode();
    expect(shippingOptionsInPreview, 'Shipping options should advance to preview mode').to.be.true;

    const paymentVisible = await checkoutPage.isPaymentSectionVisible();
    expect(paymentVisible, 'Payment section should be reachable').to.be.true;
})
    .tag('@registered-shopper')
    .tag('@step-navigation');
