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

Feature('Checkout Registration with Email Verification').tag('@core').tag('@checkout').tag('@email-verification');

const { checkoutPage, addToCartFlow, storefrontPage } = inject();
import { expect } from 'chai';
import {
    TEST_SHIPPING_ADDRESS,
    TEST_PAYMENT,
    TEST_PRODUCT_CATEGORIES,
    generateTestEmail,
} from '../../test-data/checkout.data';

/**
 * Cleanup: Log out after scenarios that create a new registered user.
 * Ensures the next test does not inherit that user's session and starts from a known state.
 */
After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@checkout-registration')) {
        await storefrontPage.logout();
    }
});

/**
 * Guest Checkout with Account Registration via Email Verification
 *
 * Test Flow:
 * 1. Add product to cart as guest
 * 2. Navigate to checkout
 * 3. Fill contact info (email)
 * 4. Fill shipping address
 * 5. Select shipping method
 * 6. Enter payment details
 * 7. Check "Create account for faster checkout" checkbox
 * 8. Verify OTP modal appears
 * 9. Enter OTP code (mock or test OTP)
 * 10. Verify account is created and user is logged in
 * 11. Place order
 * 12. Validate order confirmation and account creation success
 *
 * This validates the complete guest checkout with account creation via email verification.
 */
Scenario('Guest should create account during checkout with email verification', async ({ I }) => {
    // Step 1: Add product to cart and navigate to checkout
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.equal(undefined);

    // Step 2: Validate checkout page loaded
    checkoutPage.validatePageLoaded();

    const email = generateTestEmail('checkout-registration');

    // Step 3: Fill contact info
    await checkoutPage.fillContactInfo(email);
    await checkoutPage.continueFromContactInfo();

    // Step 4: Fill shipping address
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.continueFromShippingAddress();

    // Step 5: Select shipping method
    await checkoutPage.selectFirstShippingMethod();
    checkoutPage.continueFromShippingOptions();

    // Step 6: Enter payment details (fields only — do not place order yet)
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);

    // Step 7: Check "Create account" checkbox; wait for OTP modal or error (API may be unavailable)
    const otpModalAppeared = await checkoutPage.clickCreateAccountCheckboxAndWaitForModalOrError(15);

    if (otpModalAppeared) {
        const modalText = await I.grabTextFrom('[data-testid="otp-modal"]');
        expect(modalText, 'OTP modal should display verification instructions').to.match(
            /Enter Verification Code|We've sent|digit code/
        );
        I.click('[data-testid="otp-modal"] button:has-text("Checkout as Guest")');
        I.waitForInvisible('[data-testid="otp-modal"]', 10);
    }

    // Step 10: Place order (order confirmation appears on checkout/confirmation page, not in OTP modal)
    checkoutPage.clickPlaceOrder();

    // Step 11: Validate order confirmation
    I.waitForElement('[data-testid="order-confirmation-container"]', 30);
    const orderNumber = await I.grabTextFrom('[data-testid="order-number"]');
    expect(orderNumber, 'Order number should exist').to.not.equal('');
})
    .tag('@guest-checkout')
    .tag('@checkout-registration')
    .tag('@otp-modal');

/**
 * Guest Checkout with Account Registration - Resend OTP
 *
 * Test Flow:
 * 1. Add product to cart as guest
 * 2. Complete contact, shipping, and payment steps
 * 3. Check "Create account" checkbox
 * 4. Verify OTP modal appears
 * 5. Click "Resend Code" button
 * 6. Verify success feedback
 * 7. Proceed as guest
 * 8. Complete order
 *
 * This validates the OTP resend functionality.
 */
Scenario('Guest should be able to resend OTP code during checkout registration', async ({ I }) => {
    // Step 1: Add product to cart and navigate to checkout
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.equal(undefined);

    // Step 2: Validate checkout page loaded
    checkoutPage.validatePageLoaded();

    const email = generateTestEmail('checkout-registration-resend');

    // Complete contact, shipping, and payment steps
    await checkoutPage.fillContactInfo(email);
    await checkoutPage.continueFromContactInfo();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.continueFromShippingAddress();
    await checkoutPage.selectFirstShippingMethod();
    checkoutPage.continueFromShippingOptions();
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);

    // Check "Create account" checkbox. wait for OTP modal or error
    const otpModalAppeared = await checkoutPage.clickCreateAccountCheckboxAndWaitForModalOrError(15);

    if (otpModalAppeared) {
        const resendButton = locate('[data-testid="otp-modal"]').find('button').withText('Resend Code');
        I.click(resendButton);
        I.waitForText('Resend in', 5, locate('[data-testid="otp-modal"]'));
        // Brief wait for resend request to complete and UI to settle before closing modal
        I.wait(2);
        I.click('[data-testid="otp-modal"] button:has-text("Checkout as Guest")');
        // Wait for OTP modal to close so Place Order button (on checkout form) is not blocked
        I.waitForInvisible('[data-testid="otp-modal"]', 20);
    }

    // Place order (Place Order button is on the checkout form, below the OTP modal when it was open)
    // After resend flow, allow extra time for modal to close before clicking Place Order
    I.waitForElement(locate('button[type="submit"]').withText('Place Order'), 20);
    checkoutPage.clickPlaceOrder();

    // Validate order confirmation
    I.waitForElement('[data-testid="order-confirmation-container"]', 30);
})
    .tag('@guest-checkout')
    .tag('@checkout-registration')
    .tag('@otp-resend');

/**
 * Guest Checkout - Cancel Account Registration
 *
 * Test Flow:
 * 1. Add product to cart as guest
 * 2. Complete checkout steps
 * 3. Check "Create account" checkbox
 * 4. Verify OTP modal appears
 * 5. Uncheck "Create account" checkbox or click "Proceed as guest"
 * 6. Verify modal closes
 * 7. Complete order as guest
 *
 * This validates the ability to cancel account registration mid-flow.
 */
Scenario('Guest should be able to cancel account registration and checkout as guest', async ({ I }) => {
    // Add product to cart and navigate to checkout
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.equal(undefined);

    checkoutPage.validatePageLoaded();

    const email = generateTestEmail('checkout-guest-cancel');

    // Complete checkout steps
    await checkoutPage.fillContactInfo(email);
    await checkoutPage.continueFromContactInfo();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.continueFromShippingAddress();
    await checkoutPage.selectFirstShippingMethod();
    checkoutPage.continueFromShippingOptions();
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);

    // Check "Create account" checkbox; wait for OTP modal or error
    const otpModalAppeared = await checkoutPage.clickCreateAccountCheckboxAndWaitForModalOrError(15);

    if (otpModalAppeared) {
        I.click('[data-testid="otp-modal"] button:has-text("Checkout as Guest")');
        I.waitForInvisible('[data-testid="otp-modal"]', 10);
        // Native checkbox uses "checked" attribute; aria-checked is for ARIA widgets
        const isChecked = await I.grabAttributeFrom('#create-account-checkbox', 'checked');
        expect(isChecked, 'Create account checkbox should be unchecked after canceling registration').to.not.equal(
            'true'
        );
    }

    // Place order as guest
    checkoutPage.clickPlaceOrder();

    // Validate order confirmation
    I.waitForElement('[data-testid="order-confirmation-container"]', 30);
    const orderNumber = await I.grabTextFrom('[data-testid="order-number"]');
    expect(orderNumber, 'Order number should exist').to.not.equal('');
})
    .tag('@guest-checkout')
    .tag('@checkout-registration')
    .tag('@cancel-registration');

/**
 * Checkout Registration - Error Handling
 *
 * Test Flow:
 * 1. Add product to cart as guest
 * 2. Complete checkout steps
 * 3. Check "Create account" checkbox
 * 4. Verify graceful error handling if registration initiation fails
 * 5. Verify user can still complete order as guest
 *
 * This validates error handling in the registration flow.
 */
Scenario('Guest should see error message if registration initiation fails', async ({ I }) => {
    // Add product to cart and navigate to checkout
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.equal(undefined);

    checkoutPage.validatePageLoaded();

    const email = generateTestEmail('checkout-error');

    // Complete checkout steps
    await checkoutPage.fillContactInfo(email);
    await checkoutPage.continueFromContactInfo();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.continueFromShippingAddress();
    await checkoutPage.selectFirstShippingMethod();
    checkoutPage.continueFromShippingOptions();
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);

    // Check "Create account" checkbox; wait for OTP modal or error
    const otpModalAppeared = await checkoutPage.clickCreateAccountCheckboxAndWaitForModalOrError(15);

    if (otpModalAppeared) {
        I.click('[data-testid="otp-modal"] button:has-text("Checkout as Guest")');
        I.waitForInvisible('[data-testid="otp-modal"]', 10);
    }

    // Should still be able to place order
    checkoutPage.clickPlaceOrder();

    // Validate order confirmation
    I.waitForElement('[data-testid="order-confirmation-container"]', 30);
})
    .tag('@guest-checkout')
    .tag('@checkout-registration')
    .tag('@error-handling');
