import type { ActionFunctionArgs } from 'react-router';
import { type ShopperBasketsTypes, type ShopperCustomersTypes } from 'commerce-sdk-isomorphic';
import { customAlphabet, nanoid } from 'nanoid';
import createClient from '@/lib/scapi';
import { getAuth, updateAuth } from '@/middlewares/auth.client';
import uiStrings from '@/temp-ui-string';
import { extractResponseError } from '@/lib/utils';

/**
 * Customer lookup result
 */
export interface CustomerLookupResult {
    isRegistered: boolean;
    customer?: ShopperCustomersTypes.Customer;
    requiresLogin?: boolean;
    error?: string;
}

/**
 * Validates that an address has all required fields for customer address creation.
 *
 * @param address - The address to validate
 * @throws Error if any required field is missing
 */
function validateAddress(address: ShopperBasketsTypes.OrderAddress): void {
    if (!address.countryCode) {
        throw new Error(uiStrings.errors.customer.countryCodeRequired);
    }
    if (!address.address1) {
        throw new Error(uiStrings.errors.customer.addressLine1Required);
    }
    if (!address.city) {
        throw new Error(uiStrings.errors.customer.cityRequired);
    }
    if (!address.firstName) {
        throw new Error(uiStrings.errors.customer.firstNameRequired);
    }
    if (!address.lastName) {
        throw new Error(uiStrings.errors.customer.lastNameRequired);
    }
    if (!address.postalCode) {
        throw new Error(uiStrings.errors.customer.postalCodeRequired);
    }
}

/**
 * Look up a customer by email address to determine if they are a guest or registered user.
 *
 * This function attempts to find a customer account associated with the provided email.
 *
 * @param context - React Router context
 * @param email - Email address to lookup
 * @returns CustomerLookupResult indicating if the customer is registered
 */
export async function lookupCustomerByEmail(
    context: ActionFunctionArgs['context'],
    email: string
): Promise<CustomerLookupResult> {
    try {
        // Validate email format
        if (!email || !email.includes('@')) {
            return {
                isRegistered: false,
                error: uiStrings.errors.customer.invalidEmailFormat,
            };
        }

        const session = getAuth(context);

        // If this is already a registered user session, check if email matches
        if (session.userType === 'registered' && session.customer_id) {
            try {
                const shopperCustomersClient = createClient(context).ShopperCustomers;
                const customer = await shopperCustomersClient.getCustomer({
                    parameters: { customerId: session.customer_id },
                });

                // Check if the provided email matches the current user's email
                if (customer.login?.toLowerCase() === email.toLowerCase()) {
                    return {
                        isRegistered: true,
                        customer,
                        requiresLogin: false,
                    };
                }
            } catch {
                // Customer lookup failed - continue as guest
                // Don't rethrow the error - just continue with guest flow below
                // This handles cases where the session has an invalid customer_id
            }
        }

        // For now, we'll return a result that indicates the customer might be registered
        // and should be prompted to login, but allow them to continue as guest
        return {
            isRegistered: false, // We can't definitively determine this
            requiresLogin: false, // Allow guest checkout
            error: undefined,
        };
    } catch {
        return {
            isRegistered: false,
            error: uiStrings.errors.customer.customerLookupUnavailable,
        };
    }
}

/**
 * Check if the current session belongs to a registered customer
 *
 * @param context - React Router context
 * @returns boolean indicating if user is registered and logged in
 */
export function isRegisteredCustomer(context: ActionFunctionArgs['context']): boolean {
    const session = getAuth(context);
    return !!(
        session.userType === 'registered' &&
        session.customer_id &&
        session.access_token &&
        session.access_token_expiry &&
        session.access_token_expiry > Date.now()
    );
}

/**
 * Get current customer information if logged in as registered user
 *
 * @param context - React Router context
 * @returns Customer information or null if not logged in
 */
export async function getCurrentCustomer(
    context: ActionFunctionArgs['context']
): Promise<ShopperCustomersTypes.Customer | null> {
    try {
        if (!isRegisteredCustomer(context)) {
            return null;
        }

        const session = getAuth(context);

        if (!session.customer_id) {
            return null;
        }

        const shopperCustomersClient = createClient(context).ShopperCustomers;

        return await shopperCustomersClient.getCustomer({
            parameters: { customerId: session.customer_id },
        });
    } catch {
        return null;
    }
}

/**
 * Customer lookup that provides UX recommendations for the checkout flow
 * This is the main customer lookup function used in checkout
 *
 * @param context - React Router context
 * @param email - Email address to analyze
 * @returns Customer lookup result with UX recommendations
 */
export async function customerLookup(
    context: ActionFunctionArgs['context'],
    email: string
): Promise<
    CustomerLookupResult & {
        recommendation: 'guest' | 'login_suggested' | 'current_user';
        message?: string;
    }
> {
    const basicResult = await lookupCustomerByEmail(context, email);

    // If current user is logged in and email matches
    if (basicResult.customer && !basicResult.requiresLogin) {
        return {
            ...basicResult,
            recommendation: 'current_user' as const,
            message: uiStrings.customer.messages.currentUserRecommendation,
        };
    }

    // For unknown emails, suggest they can continue as guest or login if they have an account
    return {
        ...basicResult,
        recommendation: 'guest' as const,
        message: uiStrings.customer.messages.guestRecommendation,
    };
}

/**
 * Generate a random password for guest user registration
 * Based on PWA Kit's proven password generation that meets Commerce Cloud requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 *
 * @returns A random password string that meets all Commerce Cloud requirements
 */
export function generateRandomPassword(): string {
    return (
        nanoid(8) + // 8 random alphanumeric chars (includes upper/lower)
        customAlphabet('1234567890')(1) + // 1 guaranteed number
        customAlphabet('!@#$%^&*(),.?":{}|<>')(1) + // 1 guaranteed special character
        nanoid(2) // 2 additional random chars for extra security
    );
}

/**
 * Extracts a reasonable first and last name from an email address
 * Handles common patterns like john.doe@example.com, jane_smith@company.org
 *
 * @param email - The email address to extract names from
 * @returns Object with firstName and lastName
 */
export function extractNameFromEmail(email: string): { firstName: string; lastName: string } {
    // Input validation and sanitization
    if (!email || typeof email !== 'string') {
        return {
            firstName: uiStrings.customer.defaults.guestFirstName,
            lastName: uiStrings.customer.defaults.guestLastName,
        };
    }

    // Extract and clean the username part before @
    const username = email.split('@')[0]?.toLowerCase().trim();
    if (!username) {
        return {
            firstName: uiStrings.customer.defaults.guestFirstName,
            lastName: uiStrings.customer.defaults.guestLastName,
        };
    }

    // Remove common number suffixes and normalize
    const cleanUsername = username.replace(/\d+$/, '');

    // Define separators in order of preference (dots are more common than underscores)
    const separators = ['.', '_', '-'];

    for (const separator of separators) {
        if (cleanUsername.includes(separator)) {
            const parts = cleanUsername.split(separator).filter((part) => part.length > 0); // Remove empty parts

            if (parts.length >= 2) {
                return {
                    firstName: capitalizeFirstLetter(parts[0]),
                    lastName: capitalizeFirstLetter(parts[1]),
                };
            }
        }
    }

    // Handle camelCase patterns (e.g., johnDoe -> John Doe)
    // Note: This works on the original username before lowercasing
    const originalUsername = email.split('@')[0]?.trim();
    if (originalUsername) {
        const camelCaseMatch = originalUsername.match(/^([a-z]+)([A-Z][a-z]+)$/);
        if (camelCaseMatch) {
            return {
                firstName: capitalizeFirstLetter(camelCaseMatch[1]),
                lastName: capitalizeFirstLetter(camelCaseMatch[2]),
            };
        }
    }

    // Fallback: use cleaned username as first name
    return {
        firstName: capitalizeFirstLetter(cleanUsername) || uiStrings.customer.defaults.guestFirstName,
        lastName: uiStrings.customer.defaults.guestLastName,
    };
}

/**
 * Capitalizes the first letter of a string while keeping the rest lowercase
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalizeFirstLetter(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Login a customer after registration (auto-login)
 *
 * @param context - React Router context
 * @param email - The email address for login
 * @param password - The password for login
 * @returns Promise with login result
 */
async function loginCustomerAfterRegistration(
    context: ActionFunctionArgs['context'],
    email: string,
    password: string
): Promise<{
    success: boolean;
    error?: string;
}> {
    const loginResponse = await fetch('/resource/auth/login-registered', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });

    const loginResult = await loginResponse.json();

    if (loginResult.success) {
        // Update session with user tokens and info returned by resource.auth
        const tokenResponse = loginResult.data;
        updateAuth(context, tokenResponse);
        updateAuth(context, (session) => ({
            ...session,
            userType: 'registered',
        }));
    }
    return loginResult;
}

/**
 * Register a guest user account after checkout completion
 *
 * @param context - React Router context
 * @param email - The email address for the new account
 * @param orderInfo - Optional order information to associate with the account
 * @returns Promise with registration result
 */
export async function registerGuestUser(
    context: ActionFunctionArgs['context'],
    email: string,
    orderInfo?: {
        orderNo: string;
        customerInfo?: ShopperBasketsTypes.CustomerInfo;
        shippingAddress?: ShopperBasketsTypes.OrderAddress;
    }
): Promise<{
    success: boolean;
    customerId?: string;
    password?: string;
    error?: string;
    autoLoggedIn?: boolean;
}> {
    try {
        // Validate email format
        if (!email || !email.includes('@')) {
            return {
                success: false,
                error: uiStrings.errors.customer.invalidEmailFormat,
            };
        }

        // Extract name with priority: shipping address > customer info > email extraction
        const nameFromEmail = extractNameFromEmail(email);
        const firstName =
            orderInfo?.shippingAddress?.firstName || orderInfo?.customerInfo?.firstName || nameFromEmail.firstName;
        const lastName =
            orderInfo?.shippingAddress?.lastName || orderInfo?.customerInfo?.lastName || nameFromEmail.lastName;

        // Generate a random password for the account
        const password = generateRandomPassword();

        // Prepare registration data
        const registrationData: ShopperCustomersTypes.CustomerRegistration = {
            customer: {
                login: email,
                email,
                firstName,
                lastName,
            },
            password,
        };

        // Register the customer directly using Commerce Cloud API
        const shopperCustomersClient = createClient(context).ShopperCustomers;

        // Register the customer
        await shopperCustomersClient.registerCustomer({
            body: registrationData,
        });

        // After registration, automatically log the user in
        // Add a small delay to ensure registration is fully processed
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const loginResult = await loginCustomerAfterRegistration(context, email, password);

        if (loginResult.success) {
            // Get the updated session after login to retrieve customer_id
            const updatedSession = getAuth(context);

            return {
                success: true,
                customerId: updatedSession.customer_id,
                password,
                autoLoggedIn: true,
            };
        } else {
            // Registration succeeded but auto-login failed
            // Still return success since the account was created
            return {
                success: true,
                password,
                autoLoggedIn: false,
                error: uiStrings.errors.customer.autoLoginAfterRegistrationFailed,
            };
        }
    } catch {
        // Guest user registration failed
        return {
            success: false,
            error: uiStrings.errors.customer.registrationFailed,
        };
    }
}

/**
 * Save customer's shipping address to their profile
 *
 * @param context - React Router context
 * @param customerId - The customer ID to save the address for
 * @param address - The shipping address to save
 * @param addressName - Name for the address (e.g., "Home", "Work")
 * @returns Promise<boolean> indicating success
 */
export async function saveShippingAddressToCustomer(
    context: ActionFunctionArgs['context'],
    customerId: string,
    address: ShopperBasketsTypes.OrderAddress,
    _addressName: string = uiStrings.customer.defaults.defaultAddressName
): Promise<boolean> {
    try {
        const client = createClient(context).ShopperCustomers;

        // Validate required address fields
        validateAddress(address);

        // Create the address for the customer with validated fields
        const customerAddress = {
            addressId: `shipping_${Date.now()}`, // Generate unique address ID
            address1: address.address1 as string,
            address2: address.address2,
            city: address.city as string,
            countryCode: address.countryCode as string,
            firstName: address.firstName as string,
            lastName: address.lastName as string,
            phone: address.phone,
            postalCode: address.postalCode as string,
            stateCode: address.stateCode,
            preferred: true, // Set as preferred shipping address
        };

        await client.createCustomerAddress({
            parameters: { customerId },
            body: customerAddress,
        });

        return true;
    } catch {
        // Failed to save shipping address
        return false;
    }
}

/**
 * Save customer's billing address to their profile
 *
 * @param context - React Router context
 * @param customerId - The customer ID to save the address for
 * @param address - The billing address to save
 * @param addressName - Name for the address (e.g., "Home", "Work")
 * @returns Promise<boolean> indicating success
 */
export async function saveBillingAddressToCustomer(
    context: ActionFunctionArgs['context'],
    customerId: string,
    address: ShopperBasketsTypes.OrderAddress,
    _addressName: string = uiStrings.customer.defaults.defaultBillingAddressName
): Promise<boolean> {
    try {
        const client = createClient(context).ShopperCustomers;

        // Validate required address fields
        validateAddress(address);

        // Create the address for the customer with validated fields
        const customerAddress = {
            addressId: `billing_${Date.now()}`, // Generate unique address ID
            address1: address.address1 as string,
            address2: address.address2,
            city: address.city as string,
            countryCode: address.countryCode as string,
            firstName: address.firstName as string,
            lastName: address.lastName as string,
            phone: address.phone,
            postalCode: address.postalCode as string,
            stateCode: address.stateCode,
            preferred: false, // Will be set as preferred billing in the profile logic
        };

        await client.createCustomerAddress({
            parameters: { customerId },
            body: customerAddress,
        });

        return true;
    } catch {
        // Failed to save billing address
        return false;
    }
}

/**
 * Update customer profile with phone number and other contact information
 *
 * @param context - React Router context
 * @param customerId - The customer ID to update
 * @param contactInfo - Contact information to update
 * @returns Promise<boolean> indicating success
 */
export async function updateCustomerContactInfo(
    context: ActionFunctionArgs['context'],
    customerId: string,
    contactInfo: {
        phone?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
    }
): Promise<boolean> {
    try {
        const client = createClient(context).ShopperCustomers;

        // Update customer profile with contact information
        const customerUpdate = {
            ...(contactInfo.phone && { phoneHome: contactInfo.phone }),
            ...(contactInfo.email && { email: contactInfo.email }),
            ...(contactInfo.firstName && { firstName: contactInfo.firstName }),
            ...(contactInfo.lastName && { lastName: contactInfo.lastName }),
        };

        await client.updateCustomer({
            parameters: { customerId },
            body: customerUpdate,
        });

        return true;
    } catch {
        // Failed to update customer contact info
        return false;
    }
}

/**
 * Get customer's saved addresses from their profile
 * Note: Commerce Cloud stores addresses in the customer profile, not a separate endpoint
 *
 * @param context - React Router context
 * @param customerId - The customer ID to get addresses for
 * @returns Promise with customer addresses
 */
export async function getCustomerAddresses(
    context: ActionFunctionArgs['context'],
    customerId: string
): Promise<ShopperCustomersTypes.CustomerAddress[]> {
    try {
        const client = createClient(context).ShopperCustomers;

        // Get customer profile which includes addresses
        const customer = await client.getCustomer({
            parameters: { customerId },
        });

        // Extract addresses from customer profile
        // In Commerce Cloud, addresses are stored as part of the customer object
        return customer.addresses || [];
    } catch {
        // Failed to get customer addresses
        return [];
    }
}

/**
 * Get customer's saved payment instruments from their profile
 * Note: Commerce Cloud stores payment instruments in the customer profile
 *
 * @param context - React Router context
 * @param customerId - The customer ID to get payment methods for
 * @returns Promise with customer payment instruments
 */
export async function getCustomerPaymentInstruments(
    context: ActionFunctionArgs['context'],
    customerId: string
): Promise<ShopperCustomersTypes.CustomerPaymentInstrument[]> {
    try {
        const client = createClient(context).ShopperCustomers;

        // Get customer profile which includes payment instruments
        const customer = await client.getCustomer({
            parameters: { customerId },
        });

        // Extract payment instruments from customer profile
        // In Commerce Cloud, payment instruments are stored as part of the customer object
        return customer.paymentInstruments || [];
    } catch {
        // Failed to get customer payment instruments
        return [];
    }
}

/**
 * Get complete customer profile including addresses and payment methods
 * Simplified approach - get customer with all data in one call
 *
 * @param context - React Router context
 * @param customerId - The customer ID to get profile for
 * @returns Promise with complete customer profile data
 */
export async function getCustomerProfileForCheckout(
    context: ActionFunctionArgs['context'],
    customerId: string
): Promise<{
    customer?: ShopperCustomersTypes.Customer;
    addresses: ShopperCustomersTypes.CustomerAddress[];
    paymentInstruments: ShopperCustomersTypes.CustomerPaymentInstrument[];
    preferredShippingAddress?: ShopperCustomersTypes.CustomerAddress;
    preferredBillingAddress?: ShopperCustomersTypes.CustomerAddress;
} | null> {
    try {
        const client = createClient(context).ShopperCustomers;

        // Get customer profile which includes addresses and payment instruments
        const customer = await client.getCustomer({ parameters: { customerId } });

        // Extract addresses and payment instruments from customer profile
        const addresses = customer.addresses || [];
        const paymentInstruments = customer.paymentInstruments || [];

        // Find preferred addresses with priority logic
        const billingAddresses = addresses.filter((addr) => addr.addressId?.includes('billing'));
        const shippingAddresses = addresses.filter((addr) => addr.addressId?.includes('shipping'));

        // For billing address preference: billing addresses first, then any preferred, then first available
        const preferredBillingAddress = billingAddresses[0] || addresses.find((addr) => addr.preferred) || addresses[0];

        // For shipping address preference: shipping addresses first, then billing as fallback, then any
        const preferredShippingAddress =
            shippingAddresses.find((addr) => addr.preferred) ||
            shippingAddresses[0] ||
            billingAddresses[0] ||
            addresses.find((addr) => addr.preferred) ||
            addresses[0];

        return {
            customer,
            addresses,
            paymentInstruments,
            preferredShippingAddress,
            preferredBillingAddress,
        };
    } catch (error: unknown) {
        // Failed to get customer profile for checkout
        const { status_code } = await extractResponseError(error);
        // Handle specific error cases
        if (status_code === '404') {
            // Customer not found - invalid customer ID in auth storage
            // For client-side code, we need to clear the auth cookies
            try {
                // Import cookies utilities dynamically since this might be called server-side too
                const { removeCookie } = await import('@/lib/cookies');

                // Clear invalid auth data from cookies
                removeCookie('__sfdc_auth');

                // Also clear from localStorage if available
                if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
                    globalThis.localStorage.removeItem('__sfdc_auth');
                }
            } catch {
                // Cookie clearing failed, continue anyway
            }

            // Customer not found (404), cleared auth data and treating as guest user
            // Return null to indicate customer should be treated as guest
            return null;
        }

        // For other errors, throw to be handled by calling code
        throw error;
    }
}

/**
 * Save a payment method to a customer's profile
 *
 * @param context - React Router context
 * @param customerId - The customer ID to save the payment method for
 * @param paymentInstrument - The payment instrument to save
 * @returns Promise<boolean> indicating success
 */
export async function savePaymentMethodToCustomer(
    context: ActionFunctionArgs['context'],
    customerId: string,
    paymentInstrument: ShopperBasketsTypes.PaymentInstrument
): Promise<boolean> {
    try {
        const client = createClient(context).ShopperCustomers;

        // Create the payment instrument for the customer
        // Filter out read-only properties like maskedNumber, issuerNumber, etc.
        const customerPaymentInstrument = {
            paymentMethodId: paymentInstrument.paymentMethodId,
            paymentCard: paymentInstrument.paymentCard
                ? {
                      // Only include writable properties for customer payment instruments
                      cardType: paymentInstrument.paymentCard.cardType,
                      creditCardNumber: paymentInstrument.paymentCard.creditCardNumber,
                      expirationMonth: paymentInstrument.paymentCard.expirationMonth,
                      expirationYear: paymentInstrument.paymentCard.expirationYear,
                      holder: paymentInstrument.paymentCard.holder,
                      // Exclude read-only properties: maskedNumber, issuerNumber, etc.
                  }
                : undefined,
        };

        await client.createCustomerPaymentInstrument({
            parameters: { customerId },
            body: customerPaymentInstrument,
        });

        return true;
    } catch {
        // Failed to save payment method to customer profile
        return false;
    }
}

export async function getCustomer(
    context: ActionFunctionArgs['context'],
    customerId: string
): Promise<ShopperCustomersTypes.Customer> {
    return createClient(context).ShopperCustomers.getCustomer({
        parameters: { customerId },
    });
}
