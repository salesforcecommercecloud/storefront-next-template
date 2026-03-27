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

Feature('Storefront Checkout Tests').tag('@core').tag('@checkout');

const { I, checkoutPage, addToCartFlow, loginFlow, registeredShopperSetupFlow, storefrontPage } = inject();
import { expect } from 'chai';
import {
    TEST_SHIPPING_ADDRESS,
    TEST_PAYMENT,
    TEST_PRODUCT_CATEGORIES,
    generateTestEmail,
} from '../../test-data/checkout.data';

After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@prefilled-checkout')) {
        await storefrontPage.logout();
    }
});

Scenario('Guest shopper should complete checkout and place order', async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const orderNumber = await checkoutPage.completeGuestCheckout({
        email: generateTestEmail('guest'),
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
})
    .tag('@guest-checkout')
    .tag('@place-order');

Scenario('Registered shopper should complete checkout', async () => {
    await loginFlow.execute();

    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const prefilledEmail = await checkoutPage.getPrefilledEmail();
    const emailToUse = prefilledEmail || generateTestEmail('registered');

    const orderNumber = await checkoutPage.completeGuestCheckout({
        email: emailToUse,
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@place-order');

Scenario('Registered shopper with full profile should place order with prefilled checkout', async () => {
    await registeredShopperSetupFlow.execute();

    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const orderNumber = await checkoutPage.completePrefilledCheckout();

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@place-order')
    .tag('@prefilled-checkout');

Scenario('Basket context syncs when navigating to checkout', async () => {
    const productInfo = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    checkoutPage.expandMyCart();

    const itemCount = await checkoutPage.waitForMyCartItemCount(1, 20);
    expect(itemCount).to.be.at.least(1);
})
    .tag('@basket-context')
    .tag('@checkout-navigation');

Scenario('Guest shopper billing address toggle works and custom billing places order', async () => {
    const customBillingAddress = {
        firstName: 'Jane',
        lastName: 'Smith',
        address1: '456 Billing Ave',
        city: 'Los Angeles',
        stateCode: 'CA',
        postalCode: '90001',
    };

    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('billing-toggle'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    const isChecked = await checkoutPage.isBillingSameAsShippingChecked();
    expect(isChecked, '"Same as shipping" should be checked by default').to.be.true;
    expect(await checkoutPage.areBillingAddressFieldsVisible(), 'Billing fields hidden when checked').to.be.false;

    await checkoutPage.uncheckBillingSameAsShipping();
    expect(await checkoutPage.areBillingAddressFieldsVisible(), 'Billing fields visible when unchecked').to.be.true;
    await checkoutPage.validateBillingAddressFieldsAreBlank();

    await checkoutPage.checkBillingSameAsShipping();
    expect(await checkoutPage.areBillingAddressFieldsVisible(), 'Billing fields hidden when re-checked').to.be.false;

    await checkoutPage.uncheckBillingSameAsShipping();
    await checkoutPage.validateBillingAddressFieldsAreBlank();
    checkoutPage.fillBillingAddress(customBillingAddress);

    await checkoutPage.fillPaymentInfo(TEST_PAYMENT);

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();

    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@billing-address')
    .tag('@custom-billing')
    .tag('@guest-checkout')
    .tag('@place-order');

/**
 * Payment Validation: Empty Card Fields Block Place Order
 *
 * Test Flow:
 * 1. Add product to cart and navigate to checkout
 * 2. Fill contact info, shipping address, select shipping method
 * 3. Leave all credit card fields empty
 * 4. Click "Place Order"
 * 5. Verify validation errors appear for card fields (not redirected to confirmation)
 * 6. Verify the URL is still /checkout (order was NOT placed)
 *
 * This validates that clicking Place Order with empty payment fields does not
 * silently succeed — the shopper must see inline validation errors.
 */
Scenario('Place order is blocked with validation errors when payment fields are empty', async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('payment-validation'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    checkoutPage.clickPlaceOrderAndWaitForValidation();

    const errors = await checkoutPage.getPaymentValidationErrors();
    expect(errors.length, 'Validation errors should appear for empty payment fields').to.be.greaterThan(0);

    const currentUrl = await I.grabCurrentUrl();
    expect(currentUrl, 'Should still be on checkout page (order not placed)').to.include('/checkout');
    expect(currentUrl, 'Should NOT have redirected to order confirmation').to.not.include('/order-confirmation');
})
    .tag('@payment-validation')
    .tag('@guest-checkout');
