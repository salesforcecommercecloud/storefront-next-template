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

const { I, signupFlow, accountAddressesPage, accountDetailsPage, accountPaymentMethodsPage } = inject();
import type { SignupData } from '../types/auth.types';
import { TEST_PAYMENT } from '../test-data/checkout.data';

interface RegisteredShopperSetupResult {
    signupData: SignupData;
    addressData: {
        addressId: string;
        firstName: string;
        lastName: string;
        phone: string;
        address1: string;
        city: string;
        stateCode: string;
        postalCode: string;
    };
}

/**
 * Registered Shopper Setup Flow
 *
 * Creates a new registered shopper with complete profile for checkout:
 * 1. Register via signup
 * 2. Add shipping address on /account/addresses
 * 3. Update profile with phone on /account
 * 4. Add payment method on /account/payment-methods
 *
 * The shopper will have all data needed for prefilled checkout.
 */
class RegisteredShopperSetupFlow {
    /**
     * Get the billing address option text for the payment method dropdown.
     * Matches the format: "FirstName LastName - address1, city..."
     */
    private getBillingAddressOptionText(addressData: {
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
    }): string {
        return `${addressData.firstName} ${addressData.lastName} - ${addressData.address1}, ${addressData.city}...`;
    }

    /**
     * Execute the complete registered shopper setup flow
     *
     * @returns Promise<RegisteredShopperSetupResult> - Signup data and address data for validation
     */
    async execute(): Promise<RegisteredShopperSetupResult> {
        try {
            // Step 1: Register new shopper
            const { signupData } = await signupFlow.execute();
            accountAddressesPage.navigate();
            accountAddressesPage.validatePageLoaded();

            // Step 2: Add shipping address
            const addressData = accountAddressesPage.createTestAddress();

            // Step 3: Update profile with phone (email is readonly for registered users, so we only update phone)
            accountDetailsPage.navigate();
            accountDetailsPage.validatePageLoaded();
            accountDetailsPage.clickEditProfile();
            accountDetailsPage.fillProfileForm({ phone: addressData.phone });
            accountDetailsPage.clickSaveProfile();
            accountDetailsPage.validateSuccessToast();

            // Step 4: Add payment method (requires address to exist)
            accountPaymentMethodsPage.navigate();
            accountPaymentMethodsPage.validatePageLoaded();
            const billingAddressOptionText = this.getBillingAddressOptionText(addressData);
            accountPaymentMethodsPage.addPaymentMethod(TEST_PAYMENT, billingAddressOptionText);
            accountPaymentMethodsPage.validateSuccessToast();

            return {
                signupData,
                addressData: {
                    addressId: addressData.addressId,
                    firstName: addressData.firstName,
                    lastName: addressData.lastName,
                    phone: addressData.phone,
                    address1: addressData.address1,
                    city: addressData.city,
                    stateCode: addressData.stateCode,
                    postalCode: addressData.postalCode,
                },
            };
        } catch (error) {
            I.saveScreenshot(`registered-shopper-setup-error-${Date.now()}.png`);
            throw error;
        }
    }
}

export = new RegisteredShopperSetupFlow();
