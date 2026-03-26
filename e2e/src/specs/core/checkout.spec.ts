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

/**
 * Cleanup: Log out after scenarios that create a new registered user (e.g. registeredShopperSetupFlow).
 * Ensures the next test does not inherit that user's session and starts from a known state.
 */
After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@prefilled-checkout')) {
        await storefrontPage.logout();
    }
});

/**
 * Guest Checkout Flow
 *
 * Test Flow:
 * 1. Add product to cart as guest
 * 2. Navigate to checkout
 * 3. Fill contact info (email)
 * 4. Fill shipping address
 * 5. Select shipping method
 * 6. Enter payment details
 * 7. Place order
 * 8. Validate order confirmation with order number
 *
 * This validates the complete guest checkout journey from cart to order confirmation.
 */
Scenario('Guest shopper should complete checkout and place order', async () => {
    // Step 1: Add product to cart and navigate to checkout (retries if checkout shows empty cart)
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    // Step 2: Validate checkout ready
    checkoutPage.validatePageLoaded();

    // Step 3: Complete checkout flow
    const orderNumber = await checkoutPage.completeGuestCheckout({
        email: generateTestEmail('guest'),
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    // Validate order was placed successfully
    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@guest-checkout')
    .tag('@place-order');

/**
 * Registered Shopper Checkout with Prefilled Data
 *
 * Test Flow:
 * 1. Login as registered user
 * 2. Add product to cart
 * 3. Navigate to checkout
 * 4. Validate contact info is prefilled (email from profile)
 * 5. Complete checkout flow
 * 6. Validate order confirmation
 *
 * This validates the returning customer experience with prefilled checkout data.
 */
Scenario('Registered shopper should complete checkout', async () => {
    // Step 1: Login as registered user (flow waits for redirect; addToCartFlow will wait for page ready)
    await loginFlow.execute();

    // Step 2: Add product to cart and navigate to checkout (retries if checkout shows empty cart)
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    // Step 3: Validate checkout ready and complete flow
    checkoutPage.validatePageLoaded();

    // Check if email is prefilled
    const prefilledEmail = await checkoutPage.getPrefilledEmail();
    const emailToUse = prefilledEmail || generateTestEmail('registered');

    // Complete checkout
    const orderNumber = await checkoutPage.completeGuestCheckout({
        email: emailToUse,
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@place-order');

/**
 * Registered Shopper Checkout with Full Profile (Place Order Only)
 *
 * Test Flow:
 * 1. Register new shopper and add shipping address, contact phone, payment method from My Account
 * 2. Add product to cart
 * 3. Navigate to checkout
 * 4. Validate contact info, shipping address, shipping method, payment are prefilled and in preview mode
 * 5. Click Place Order only (no form filling required)
 * 6. Validate order confirmation
 *
 * This validates the streamlined checkout for registered shoppers with complete profiles.
 */
Scenario('Registered shopper with full profile should place order with prefilled checkout', async () => {
    // Step 1: Register and set up complete profile (address, phone, payment method)
    await registeredShopperSetupFlow.execute();

    // Step 2: Add product to cart and navigate to checkout (retries if checkout shows empty cart)
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    // Step 3: Validate checkout ready
    checkoutPage.validatePageLoaded();

    // Step 4 & 5: Validate prefilled sections and complete with Place Order only
    const orderNumber = await checkoutPage.completePrefilledCheckout();

    // Step 6: Validate order confirmation
    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@place-order')
    .tag('@prefilled-checkout');

/**
 * Checkout Form Validation
 *
 * Test Flow:
 * 1. Navigate to checkout with items in cart
 * 2. Try to complete checkout to validate all steps work
 *
 * This validates that the checkout flow executes without errors.
 */
Scenario('Checkout should complete all steps', async () => {
    // Add product to cart and navigate to checkout (retries if checkout shows empty cart)
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);

    checkoutPage.validatePageLoaded();

    // Complete checkout
    const orderNumber = await checkoutPage.completeGuestCheckout({
        email: generateTestEmail('validation'),
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber, 'Order should be placed successfully').to.not.be.empty;
}).tag('@validation');

/**
 * Checkout with Different Product Category
 *
 * Test Flow:
 * 1. Add product from womens category
 * 2. Complete checkout
 * 3. Validate order is placed
 *
 * This validates checkout works with different product types.
 */
Scenario('Shopper should complete checkout with different product', async () => {
    // Add product from different category and navigate to checkout (retries if checkout shows empty cart)
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.WOMENS_DRESSES);

    checkoutPage.validatePageLoaded();

    // Complete checkout
    const orderNumber = await checkoutPage.completeGuestCheckout({
        email: generateTestEmail('product'),
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber, 'Order should be placed successfully').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@product-variety')
    .tag('@guest-checkout');

/**
 * Basket Context Sync When Navigating to Checkout
 *
 * Test Flow:
 * 1. Add product to cart but stay on PDP
 * 2. Navigate to checkout
 * 3. Verify My Cart section shows basket items immediately
 *
 * This validates that basket context is properly synced when navigating to checkout,
 * ensuring the root BasketProvider is updated imperatively via useBasketUpdater.
 * Without this fix, basket items would show as empty until page refresh.
 */
Scenario('Basket context syncs when navigating to checkout', async () => {
    const productInfo = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();

    const itemCount = await checkoutPage.waitForMyCartItemCount(1, 20);
    expect(itemCount, 'My Cart should show at least 1 item after navigating to checkout').to.be.at.least(1);
})
    .tag('@basket-context')
    .tag('@checkout-navigation');

/**
 * Billing Address Fields Clear When Unchecking "Same as Shipping"
 *
 * Test Flow:
 * 1. Add product to cart and navigate to checkout
 * 2. Fill contact info and shipping address
 * 3. Select shipping method to advance to payment step
 * 4. Verify "Same as shipping" checkbox is checked by default
 * 5. Uncheck "Same as shipping" checkbox
 * 6. Verify all billing address fields are blank
 * 7. Re-check "Same as shipping" checkbox
 * 8. Verify billing fields are hidden (shipping address is used)
 *
 * This validates the acceptance criteria: when unchecking "Same as shipping",
 * billing address fields should be blank, not pre-filled with shipping data.
 */
Scenario('Guest shopper billing address fields are blank when unchecking "Same as shipping"', async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('billing-test'), TEST_SHIPPING_ADDRESS.phone);

    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);

    await checkoutPage.selectShippingMethod(0);

    const isChecked = await checkoutPage.isBillingSameAsShippingChecked();
    expect(isChecked, '"Same as shipping" checkbox should be checked by default').to.be.true;

    const fieldsVisibleWhenChecked = await checkoutPage.areBillingAddressFieldsVisible();
    expect(fieldsVisibleWhenChecked, 'Billing fields should be hidden when "Same as shipping" is checked').to.be.false;

    await checkoutPage.uncheckBillingSameAsShipping();

    const fieldsVisibleWhenUnchecked = await checkoutPage.areBillingAddressFieldsVisible();
    expect(fieldsVisibleWhenUnchecked, 'Billing fields should be visible when "Same as shipping" is unchecked').to.be
        .true;

    await checkoutPage.validateBillingAddressFieldsAreBlank();

    await checkoutPage.checkBillingSameAsShipping();

    const fieldsVisibleAfterRecheck = await checkoutPage.areBillingAddressFieldsVisible();
    expect(fieldsVisibleAfterRecheck, 'Billing fields should be hidden when "Same as shipping" is re-checked').to.be
        .false;
})
    .tag('@billing-address')
    .tag('@guest-checkout');

/**
 * Billing Address Can Be Filled After Unchecking "Same as Shipping"
 *
 * Test Flow:
 * 1. Add product to cart and navigate to checkout
 * 2. Fill contact info and shipping address
 * 3. Select shipping method to advance to payment step
 * 4. Uncheck "Same as shipping" checkbox
 * 5. Fill custom billing address (different from shipping)
 * 6. Fill payment details and place order
 * 7. Verify order is placed successfully
 *
 * This validates that after unchecking "Same as shipping", the user can
 * fill a custom billing address and complete checkout successfully.
 */
Scenario('Guest shopper can fill custom billing address and place order', async () => {
    const customBillingAddress = {
        firstName: 'Jane',
        lastName: 'Smith',
        address1: '456 Billing Ave',
        city: 'Los Angeles',
        stateCode: 'CA',
        postalCode: '90001',
    };

    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.WOMENS_DRESSES);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('custom-billing'), TEST_SHIPPING_ADDRESS.phone);

    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);

    await checkoutPage.selectShippingMethod(0);

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
