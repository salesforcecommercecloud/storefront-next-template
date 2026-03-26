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
 * Shared Test Data for Checkout E2E Tests
 *
 * This file contains reusable test data constants to ensure consistency
 * across checkout-related tests and avoid duplication.
 */

/**
 * Test Credit Card Numbers
 * These are valid test cards for Salesforce Commerce Cloud test environments
 */
export const TEST_CARDS = {
    /** Visa test card - verified working in SFCC test environments */
    VISA: '4242424242424242',
    /** Mastercard test card (if needed in future) */
    // MASTERCARD: '5555555555554444',
} as const;

/**
 * Standard Test Payment Information
 * Uses SFCC-verified test credit card
 */
export const TEST_PAYMENT = {
    cardNumber: TEST_CARDS.VISA,
    cardholderName: 'Test Shopper',
    expiryDate: '01/30',
    cvv: '123',
} as const;

/**
 * Standard Test Shipping Address
 * Boston, MA address for consistent test data
 */
export const TEST_SHIPPING_ADDRESS = {
    firstName: 'Test',
    lastName: 'Shopper',
    address1: '123 Main Street',
    city: 'Boston',
    stateCode: 'MA',
    postalCode: '02101',
    phone: '617-555-0123',
} as const;

/**
 * Alternative Test Shipping Address
 * Used for add/edit address modal tests during checkout
 */
export const TEST_SHIPPING_ADDRESS_ALT = {
    firstName: 'Jane',
    lastName: 'Smith',
    address1: '456 Oak Avenue',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94102',
    phone: '415-555-0199',
} as const;

/**
 * Email Domain for Test Accounts
 * Use @test.com domain (verified accepted by SFCC validation)
 */
export const TEST_EMAIL_DOMAIN = '@test.com' as const;

/**
 * Generate a unique test email address
 * @param prefix - Email prefix (e.g., 'guest', 'registered')
 * @returns Unique email address with timestamp
 */
export function generateTestEmail(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}${TEST_EMAIL_DOMAIN}`;
}

/**
 * Common Product Categories for Testing
 */
export const TEST_PRODUCT_CATEGORIES = {
    MENS_JACKETS: 'category/mens-clothing-jackets',
    WOMENS_DRESSES: 'category/womens-clothing-dresses',
} as const;
