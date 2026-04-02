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
 * Checkout Shipping Address Modal Tests (Registered Shopper)
 *
 * Test Coverage:
 * - Saved addresses list display and selection at checkout
 * - Add new address via modal during checkout — verifies address applied to basket and saved to profile
 * - Edit existing saved address via modal during checkout — verifies changes in basket and profile
 *
 * Prerequisites:
 * - Registered shopper with saved addresses (created via registeredShopperSetupFlow)
 * - Product added to cart and navigated to checkout
 *
 * Integration Value:
 * - Real SCAPI address creation/update during live checkout flow
 * - Modal state management within the checkout step context
 * - Saved addresses list interaction with basket address binding
 * - Address changes reflected in both basket (shipping preview) and customer profile
 */

Feature('Checkout Shipping Address Modal Tests').tag('@core').tag('@checkout').tag('@shipping-address');

const { checkoutPage, apiCartSetupFlow, registeredShopperSetupFlow, storefrontPage, accountAddressesPage } = inject();
import { expect } from 'chai';
import { TEST_SHIPPING_ADDRESS_ALT, TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';

/**
 * Cleanup: Log out after scenarios that create a new registered user.
 * Ensures the next test does not inherit that user's session and starts from a known state.
 */
After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@shipping-address')) {
        await storefrontPage.logout();
    }
});

// =============================================================================
// Saved Addresses List Display and Continue
// =============================================================================

/**
 * Registered shopper sees saved addresses list and can continue checkout
 *
 * Test Flow:
 * 1. Register shopper with full profile (includes one saved address)
 * 2. Add product to cart and navigate to checkout
 * 3. Shipping address is auto-applied (preview mode) — expand to reveal saved addresses
 * 4. Verify saved addresses list is displayed with radio selection
 * 5. Verify at least one saved address is visible
 * 6. Verify "Add New Address" button is present
 * 7. Click "Continue to Shipping Method" — verify step completes
 * 8. Verify address is shown in shipping preview (applied to basket)
 * 9. Navigate to account addresses — verify address exists in profile
 */
Scenario('Registered shopper sees saved addresses and can continue checkout', async () => {
    const setupResult = await registeredShopperSetupFlow.execute();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    await checkoutPage.expandShippingAddressForSavedAddresses();

    const hasSavedAddresses = await checkoutPage.isSavedAddressesListVisible();
    expect(hasSavedAddresses, 'Saved addresses list should be visible for registered shopper').to.be.true;

    const addressCount = await checkoutPage.getSavedAddressCount();
    expect(addressCount, 'Should display at least one saved address').to.be.at.least(1);

    const addButtonVisible = await checkoutPage.isAddNewAddressButtonVisible();
    expect(addButtonVisible, 'Add New Address button should be visible').to.be.true;

    checkoutPage.clickContinueToShippingOptions();

    // Verify address applied to basket — preview shows the setup address
    const previewText = await checkoutPage.getShippingAddressPreviewText();
    expect(previewText, 'Shipping preview should show the saved address city').to.include(setupResult.addressData.city);

    // Verify address exists in customer profile
    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();
    const profileAddressCount = await accountAddressesPage.getAddressCount();
    expect(profileAddressCount, 'Profile should have at least one saved address').to.be.at.least(1);
}).tag('@saved-addresses');

// =============================================================================
// Add New Address via Modal
// =============================================================================

/**
 * Registered shopper can add a new address via modal during checkout
 *
 * Test Flow:
 * 1. Register shopper with full profile
 * 2. Navigate to checkout — shipping is in preview mode (auto-applied)
 * 3. Expand shipping step to reveal saved addresses
 * 4. Click "Add New Address"
 * 5. Verify modal opens with "Add New Address" title
 * 6. Fill address form with new address data
 * 7. Click Save
 * 8. Verify modal closes and shipping step advances
 * 9. Verify new address is shown in shipping preview (applied to basket)
 * 10. Navigate to account addresses — verify new address saved to profile
 */
Scenario('Registered shopper can add new address via modal at checkout', async () => {
    await registeredShopperSetupFlow.execute();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    await checkoutPage.expandShippingAddressForSavedAddresses();

    const initialAddressCount = await checkoutPage.getSavedAddressCount();

    checkoutPage.clickAddNewAddress();

    const modalOpen = await checkoutPage.isAddressModalOpen();
    expect(modalOpen, 'Address modal should open').to.be.true;

    const modalTitle = await checkoutPage.getAddressModalTitle();
    expect(modalTitle, 'Modal title should be "Add New Address"').to.equal('Add New Address');

    checkoutPage.fillAddressModal({
        firstName: TEST_SHIPPING_ADDRESS_ALT.firstName,
        lastName: TEST_SHIPPING_ADDRESS_ALT.lastName,
        address1: TEST_SHIPPING_ADDRESS_ALT.address1,
        city: TEST_SHIPPING_ADDRESS_ALT.city,
        stateCode: TEST_SHIPPING_ADDRESS_ALT.stateCode,
        postalCode: TEST_SHIPPING_ADDRESS_ALT.postalCode,
    });

    checkoutPage.clickAddressModalSave();
    checkoutPage.waitForAddressModalClosed();

    const modalStillOpen = await checkoutPage.isAddressModalOpen();
    expect(modalStillOpen, 'Address modal should close after save').to.be.false;

    // Verify new address is applied to the basket
    const previewText = await checkoutPage.getShippingAddressPreviewText();
    expect(previewText, 'Shipping preview should show the new address city').to.include(TEST_SHIPPING_ADDRESS_ALT.city);
    expect(previewText, 'Shipping preview should show the new address name').to.include(
        TEST_SHIPPING_ADDRESS_ALT.firstName
    );

    // Verify new address saved to customer profile
    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();
    const profileAddressCount = await accountAddressesPage.getAddressCount();
    expect(profileAddressCount, 'Profile should have one more address after add').to.be.greaterThan(
        initialAddressCount
    );
})
    .tag('@add-address')
    .tag('@address-modal');

// =============================================================================
// Edit Saved Address via Modal
// =============================================================================

/**
 * Registered shopper can edit a saved address via modal during checkout
 *
 * Test Flow:
 * 1. Register shopper with full profile (includes saved address)
 * 2. Navigate to checkout — shipping in preview mode (auto-applied)
 * 3. Expand shipping step to reveal saved addresses
 * 4. Click "Edit Address" on the first saved address
 * 5. Verify modal opens with "Edit Address" title
 * 6. Verify form is pre-populated with existing address data
 * 7. Modify a field (city)
 * 8. Click Save
 * 9. Verify modal closes and shipping step advances
 * 10. Verify edited address is shown in shipping preview (applied to basket)
 * 11. Navigate to account addresses — verify edit persisted in profile
 */
Scenario('Registered shopper can edit saved address via modal at checkout', async () => {
    const setupResult = await registeredShopperSetupFlow.execute();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    await checkoutPage.expandShippingAddressForSavedAddresses();

    checkoutPage.clickEditAddress(0);

    const modalOpen = await checkoutPage.isAddressModalOpen();
    expect(modalOpen, 'Address modal should open for editing').to.be.true;

    const modalTitle = await checkoutPage.getAddressModalTitle();
    expect(modalTitle, 'Modal title should be "Edit Address"').to.equal('Edit Address');

    const prefilledFirstName = await checkoutPage.getAddressModalFieldValue('firstName');
    expect(prefilledFirstName, 'First name should be pre-populated').to.equal(setupResult.addressData.firstName);

    const prefilledCity = await checkoutPage.getAddressModalFieldValue('city');
    expect(prefilledCity, 'City should be pre-populated').to.equal(setupResult.addressData.city);

    const newCity = 'Los Angeles';
    checkoutPage.editAddressModalCity(newCity);

    checkoutPage.clickAddressModalSave();
    checkoutPage.waitForAddressModalClosed(15);

    const modalStillOpen = await checkoutPage.isAddressModalOpen();
    expect(modalStillOpen, 'Address modal should close after edit save').to.be.false;

    // Verify edited address is applied to the basket
    const previewText = await checkoutPage.getShippingAddressPreviewText();
    expect(previewText, 'Shipping preview should show the edited city').to.include(newCity);

    // Verify edit persisted in customer profile
    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();
    const cardText = await accountAddressesPage.getAddressCardText(0);
    expect(cardText, 'Address card should show the edited city').to.include(newCity);
})
    .tag('@edit-address')
    .tag('@address-modal');

export {};
