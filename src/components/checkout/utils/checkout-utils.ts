/**
 * Checkout utility functions
 */

import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { CHECKOUT_STEPS, type CheckoutStep, type CustomerProfile } from './checkout-context-types';
import type { ClientLoaderFunctionArgs } from 'react-router';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { getShippingMethodsForShipment } from '@/lib/api/shipping-methods';

function hasValidPaymentCard(
    paymentInstrument: ShopperBasketsV2.schemas['OrderPaymentInstrument'] | undefined
): boolean {
    if (!paymentInstrument || paymentInstrument.paymentMethodId !== 'CREDIT_CARD') {
        return false;
    }

    // For saved payment methods, check if customerPaymentInstrumentId exists
    if (paymentInstrument.customerPaymentInstrumentId) {
        return true;
    }

    // For new payment methods, check if all required card fields are present
    const card = paymentInstrument.paymentCard;
    return !!(card?.cardType && card?.expirationMonth && card?.expirationYear && card?.maskedNumber);
}

function computeFinalStepForReturningCustomer(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined,
    customerProfile: CustomerProfile
): CheckoutStep | null {
    if (!customerProfile?.customer || !basket) {
        return null;
    }

    // For returning registered customers, determine step based on customer profile data
    // since the basket will be prefilled during checkout initialization
    const hasCustomerEmail = customerProfile.customer.login;
    const hasCustomerAddresses = customerProfile.addresses && customerProfile.addresses.length > 0;
    const hasCustomerPaymentMethods =
        customerProfile.paymentInstruments && customerProfile.paymentInstruments.length > 0;

    // If customer has complete profile (email, addresses, payment methods), go straight to review/place order
    if (hasCustomerEmail && hasCustomerAddresses && hasCustomerPaymentMethods) {
        return CHECKOUT_STEPS.REVIEW_ORDER;
    }

    // If customer has email and addresses but no saved payment methods, go to payment step
    if (hasCustomerEmail && hasCustomerAddresses && !hasCustomerPaymentMethods) {
        return CHECKOUT_STEPS.PAYMENT;
    }

    // If customer has email but no addresses, go to shipping address
    if (hasCustomerEmail && !hasCustomerAddresses) {
        return CHECKOUT_STEPS.SHIPPING_ADDRESS;
    }

    // If customer has no email (shouldn't happen for registered users), go to contact info
    if (!hasCustomerEmail) {
        return CHECKOUT_STEPS.CONTACT_INFO;
    }

    // Fallback to review if we can't determine the step
    return CHECKOUT_STEPS.REVIEW_ORDER;
}

export function computeStepFromBasket(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined,
    hasUserSelectedShippingOptions: boolean,
    autoAdvanceMode: boolean = false
): CheckoutStep {
    if (!basket) {
        return CHECKOUT_STEPS.CONTACT_INFO;
    }

    if (!basket.customerInfo?.email) {
        return CHECKOUT_STEPS.CONTACT_INFO;
    }

    const shippingAddress = basket.shipments?.[0]?.shippingAddress;
    if (!shippingAddress?.firstName || !shippingAddress?.lastName || !shippingAddress?.address1) {
        return CHECKOUT_STEPS.SHIPPING_ADDRESS;
    }

    const hasShippingMethod = basket.shipments?.[0]?.shippingMethod;
    if (!hasShippingMethod) {
        return CHECKOUT_STEPS.SHIPPING_OPTIONS;
    }

    // For auto-advance mode (returning customers), skip shipping options if they have a valid method
    if (autoAdvanceMode && hasShippingMethod) {
        // Skip shipping options step for returning customers with valid shipping method
    } else if (!hasUserSelectedShippingOptions) {
        return CHECKOUT_STEPS.SHIPPING_OPTIONS;
    }

    const paymentInstrument = basket.paymentInstruments?.[0];
    if (!paymentInstrument || !hasValidPaymentCard(paymentInstrument)) {
        return CHECKOUT_STEPS.PAYMENT;
    }

    return CHECKOUT_STEPS.REVIEW_ORDER;
}

export function getCompletedSteps(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined,
    currentStep: CheckoutStep
): CheckoutStep[] {
    const completed: CheckoutStep[] = [];

    if (!basket) {
        return completed;
    }

    const hasEmail =
        basket.customerInfo?.email ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('checkoutEmail'));
    if (hasEmail && currentStep > CHECKOUT_STEPS.CONTACT_INFO) {
        completed.push(CHECKOUT_STEPS.CONTACT_INFO);
    }

    const hasShippingAddress = basket.shipments?.[0]?.shippingAddress;
    if (
        hasShippingAddress &&
        hasShippingAddress.firstName &&
        hasShippingAddress.lastName &&
        hasShippingAddress.address1 &&
        currentStep > CHECKOUT_STEPS.SHIPPING_ADDRESS
    ) {
        completed.push(CHECKOUT_STEPS.SHIPPING_ADDRESS);
    }

    const hasShippingMethod = basket.shipments?.[0]?.shippingMethod;
    if (hasShippingMethod && currentStep > CHECKOUT_STEPS.SHIPPING_OPTIONS) {
        completed.push(CHECKOUT_STEPS.SHIPPING_OPTIONS);
    }

    const paymentInstrument = basket.paymentInstruments?.[0];
    if (paymentInstrument && hasValidPaymentCard(paymentInstrument) && currentStep > CHECKOUT_STEPS.PAYMENT) {
        completed.push(CHECKOUT_STEPS.PAYMENT);
    }

    return completed;
}

export function shouldAutoAdvanceForReturningCustomer(
    isRegisteredCustomer: boolean,
    customerProfile?: CustomerProfile
): boolean {
    if (!isRegisteredCustomer || !customerProfile) {
        return false;
    }

    const hasAddresses = customerProfile.addresses && customerProfile.addresses.length > 0;
    const hasPaymentMethods = customerProfile.paymentInstruments && customerProfile.paymentInstruments.length > 0;

    return hasAddresses && hasPaymentMethods;
}

export function shouldPrefillBasket(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined,
    customerProfile: CustomerProfile
): boolean {
    if (!customerProfile?.customer || !customerProfile?.addresses?.length) {
        return false;
    }

    const missingEmail = !basket?.customerInfo?.email;
    const missingShippingAddress = !basket?.shipments?.[0]?.shippingAddress;

    return missingEmail || missingShippingAddress;
}

export async function initializeBasketForReturningCustomer(
    context: ClientLoaderFunctionArgs['context'],
    customerProfile: CustomerProfile
): Promise<ShopperBasketsV2.schemas['Basket'] | null> {
    try {
        const basket = getBasket(context);

        if (!basket?.basketId || !customerProfile?.customer) {
            return null;
        }

        const config = getConfig(context);
        const clients = createApiClients(context);
        let updatedBasket = basket;
        let hasUpdates = false;

        if (!updatedBasket.customerInfo?.email && customerProfile.customer.login) {
            const { data } = await clients.shopperBasketsV2.updateCustomerForBasket({
                params: {
                    path: {
                        organizationId: config.commerce.api.organizationId,
                        basketId: updatedBasket.basketId,
                    },
                    query: {
                        siteId: config.commerce.api.siteId,
                    },
                },
                body: { email: customerProfile.customer.login },
            });
            updatedBasket = data;
            updateBasket(context, updatedBasket);
            hasUpdates = true;
        }

        const hasShippingAddress = updatedBasket.shipments?.[0]?.shippingAddress;
        if (!hasShippingAddress && customerProfile.addresses?.length > 0) {
            const defaultAddress =
                customerProfile.addresses.find((addr) => addr.preferred) || customerProfile.addresses[0];

            if (defaultAddress) {
                const shippingAddress = {
                    firstName: defaultAddress.firstName,
                    lastName: defaultAddress.lastName,
                    address1: defaultAddress.address1,
                    address2: defaultAddress.address2 || undefined,
                    city: defaultAddress.city,
                    stateCode: defaultAddress.stateCode,
                    postalCode: defaultAddress.postalCode,
                    countryCode: defaultAddress.countryCode || 'US',
                    phone:
                        defaultAddress.phone ||
                        customerProfile.customer.phoneMobile ||
                        customerProfile.customer.phoneHome ||
                        undefined,
                };

                const { data } = await clients.shopperBasketsV2.updateShippingAddressForShipment({
                    params: {
                        path: {
                            organizationId: config.commerce.api.organizationId,
                            basketId: updatedBasket.basketId,
                            shipmentId: updatedBasket.shipments?.[0]?.shipmentId || 'me',
                        },
                        query: {
                            siteId: config.commerce.api.siteId,
                        },
                    },
                    body: shippingAddress,
                });
                updatedBasket = data;
                updateBasket(context, updatedBasket);
                hasUpdates = true;
            }
        }

        if (!updatedBasket.billingAddress && hasUpdates) {
            const shippingAddr = updatedBasket.shipments?.[0]?.shippingAddress;
            if (shippingAddr) {
                try {
                    const { data } = await clients.shopperBasketsV2.updateBillingAddressForBasket({
                        params: {
                            path: {
                                organizationId: config.commerce.api.organizationId,
                                basketId: updatedBasket.basketId,
                            },
                            query: {
                                siteId: config.commerce.api.siteId,
                            },
                        },
                        body: {
                            firstName: shippingAddr.firstName,
                            lastName: shippingAddr.lastName,
                            address1: shippingAddr.address1,
                            address2: shippingAddr.address2,
                            city: shippingAddr.city,
                            stateCode: shippingAddr.stateCode,
                            postalCode: shippingAddr.postalCode,
                            countryCode: shippingAddr.countryCode,
                            phone: shippingAddr.phone,
                        },
                    });
                    updatedBasket = data;
                    updateBasket(context, updatedBasket);
                } catch {
                    // Billing address update failed - continue without it (not critical)
                }
            }
        }

        if (
            hasUpdates &&
            updatedBasket.shipments?.[0]?.shippingAddress &&
            !updatedBasket.shipments?.[0]?.shippingMethod
        ) {
            try {
                const shippingMethods = await getShippingMethodsForShipment(context, updatedBasket.basketId as string);
                if (
                    Array.isArray(shippingMethods?.applicableShippingMethods) &&
                    shippingMethods?.applicableShippingMethods?.length > 0
                ) {
                    const defaultMethod = shippingMethods.applicableShippingMethods[0];
                    const { data } = await clients.shopperBasketsV2.updateShippingMethodForShipment({
                        params: {
                            path: {
                                organizationId: config.commerce.api.organizationId,
                                basketId: updatedBasket.basketId,
                                shipmentId: updatedBasket.shipments[0].shipmentId || 'me',
                            },
                            query: {
                                siteId: config.commerce.api.siteId,
                            },
                        },
                        body: { id: defaultMethod.id },
                    });
                    updatedBasket = data;
                    updateBasket(context, updatedBasket);
                    hasUpdates = true;
                }
            } catch {
                // Shipping method update failed - continue without it (not critical)
            }
        }

        // Add payment instrument if missing and customer has saved payment methods
        if (!updatedBasket.paymentInstruments?.[0] && customerProfile.paymentInstruments?.length > 0) {
            try {
                const { addPaymentInstrumentToBasket } = await import('@/lib/api/basket');
                const { getPaymentMethodsFromCustomer } = await import('@/lib/customer-profile-utils');

                const savedPaymentMethods = getPaymentMethodsFromCustomer(customerProfile);
                if (savedPaymentMethods.length > 0) {
                    const preferredMethod =
                        savedPaymentMethods.find((method) => method.preferred) || savedPaymentMethods[0];

                    const paymentInfo = {
                        paymentMethodId: 'CREDIT_CARD',
                        customerPaymentInstrumentId: preferredMethod.id,
                    };

                    if (updatedBasket.basketId) {
                        updatedBasket = await addPaymentInstrumentToBasket(
                            context,
                            updatedBasket.basketId,
                            paymentInfo
                        );
                        updateBasket(context, updatedBasket);
                        hasUpdates = true;
                    }
                }
            } catch {
                // Payment instrument addition failed - continue without it (not critical)
            }
        }

        return hasUpdates ? updatedBasket : null;
    } catch {
        return null;
    }
}

export { computeFinalStepForReturningCustomer };
