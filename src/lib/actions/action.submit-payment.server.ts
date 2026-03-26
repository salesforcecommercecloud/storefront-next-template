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
import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createPaymentSchema, parsePaymentFromFormData } from '@/lib/checkout-schemas';
import {
    addPaymentInstrumentToBasket,
    removePaymentInstrumentFromBasket,
    updateBillingAddressForBasket,
} from '@/lib/api/basket';
import { detectCardType, normalizeCardType } from '@/lib/payment-utils';
import { getTranslation } from '@/lib/i18next';
import { getAuth } from '@/middlewares/auth.server';
import { getCustomerProfileForCheckout } from '@/lib/api/customer';
import { getPaymentMethodsFromCustomer } from '@/lib/customer-profile-utils';
import { getLogger } from '@/lib/logger';

/**
 * Server action for submitting checkout payment information.
 */
export async function action(formData: FormData, context: RouterContextProvider) {
    const logger = getLogger(context);
    const { t } = getTranslation();

    // Parse and validate using shared schema
    // This ensures server-side validation matches client-side validation exactly
    const paymentData = parsePaymentFromFormData(formData);

    const paymentSchema = createPaymentSchema(t);
    const result = paymentSchema.safeParse(paymentData);

    if (!result.success) {
        return Response.json(
            {
                success: false,
                fieldErrors: result.error.flatten().fieldErrors,
                step: 'payment',
            },
            { status: 400 }
        );
    }

    // Use validated data
    const {
        cardNumber,
        expiryDate,
        cardholderName,
        billingSameAsShipping,
        selectedSavedPaymentMethod,
        useSavedPaymentMethod,
    } = result.data;
    // Note: CVV is not stored for security reasons

    // Get current basket first (needed for payment amount)
    const basketResource = await getBasket(context);
    const basket = basketResource.current;
    const basketId = basket?.basketId ?? basketResource.snapshot?.basketId;

    let paymentInfo;

    if (useSavedPaymentMethod && selectedSavedPaymentMethod) {
        // Look up card details from customer profile and send them directly.
        // The v2 basket API does not support customerPaymentInstrumentId; when sent, SFCC
        // resolves the stored customer instrument which may have paymentMethodId
        // "CREDIT_CARD (visa)" causing a 400 "Invalid Payment Method Id".
        const auth = getAuth(context as Parameters<typeof getAuth>[0]);
        const customerId = auth?.customerId;
        if (customerId) {
            try {
                const customerProfile = await getCustomerProfileForCheckout(
                    context as Parameters<typeof getCustomerProfileForCheckout>[0],
                    customerId
                );
                const savedMethods = getPaymentMethodsFromCustomer(customerProfile ?? undefined);
                const savedMethod = savedMethods.find((m) => m.id === selectedSavedPaymentMethod) || savedMethods[0];
                if (savedMethod) {
                    const normalizedCardType = normalizeCardType(savedMethod.cardType);
                    paymentInfo = {
                        paymentMethodId: 'CREDIT_CARD',
                        amount: basket?.orderTotal ?? 0,
                        ...(normalizedCardType && normalizedCardType !== 'unknown'
                            ? {
                                  paymentCard: {
                                      cardType: normalizedCardType,
                                      holder: savedMethod.cardholderName || '',
                                      maskedNumber: savedMethod.maskedNumber || '',
                                      expirationMonth: savedMethod.expirationMonth,
                                      expirationYear: savedMethod.expirationYear,
                                  },
                              }
                            : {}),
                    };
                }
            } catch {
                // Fall through to error below if paymentInfo is still unset
            }
        }
        if (!paymentInfo) {
            return Response.json(
                {
                    success: false,
                    error: t('errors:checkout.paymentProcessingFailed'),
                    step: 'payment',
                },
                { status: 400 }
            );
        }
    } else {
        // Process new payment data

        // Clean card number (remove spaces and formatting)
        const cleanCardNumber = cardNumber ? cardNumber.replace(/\D/g, '') : '';

        // Parse expiry date (MM/YY format)
        const [expiryMonth, expiryYear] =
            expiryDate && expiryDate.includes('/') ? expiryDate.split('/').map((s) => s.trim()) : ['', ''];

        // Validate that we have actual payment data (not just empty/default values)
        if (!cleanCardNumber || cleanCardNumber.length < 13 || !expiryMonth || !expiryYear || !cardholderName?.trim()) {
            return Response.json(
                {
                    success: false,
                    error: 'Please fill in all required payment fields',
                    step: 'payment',
                },
                { status: 400 }
            );
        }

        // SFCC expects cardType to match Business Manager (e.g. "Visa", "Mastercard", "Amex").
        // detectCardType returns "American Express" for Amex; normalizeCardType maps it to "Amex".
        const detectedType = detectCardType(cleanCardNumber);
        const cardType = normalizeCardType(detectedType) ?? detectedType;
        paymentInfo = {
            paymentMethodId: 'CREDIT_CARD',
            amount: basket?.orderTotal ?? 0,
            paymentCard: {
                cardType,
                holder: cardholderName,
                maskedNumber: cleanCardNumber.slice(0, -4).replace(/\d/g, '*') + cleanCardNumber.slice(-4),
                expirationMonth: parseInt(expiryMonth),
                expirationYear: parseInt(`20${expiryYear}`),
            },
        };
    }

    if (!basketId || !basket) {
        return Response.json(
            {
                success: false,
                error: t('errors:api.basketNotFound'),
                step: 'payment',
            },
            { status: 400 }
        );
    }

    // Prepare billing address (basket is non-null)
    const shippingAddress = basket.shipments?.[0]?.shippingAddress;
    const billingAddress =
        billingSameAsShipping && shippingAddress
            ? shippingAddress
            : {
                  firstName: result.data.billingFirstName || '',
                  lastName: result.data.billingLastName || '',
                  address1: result.data.billingAddress1 || '',
                  address2: result.data.billingAddress2 || '',
                  city: result.data.billingCity || '',
                  stateCode: result.data.billingStateCode || '',
                  postalCode: result.data.billingPostalCode || '',
                  phone: result.data.billingPhone || '',
                  countryCode: result.data.billingCountryCode || 'US',
              };

    // Remove existing payment instrument (if any) so the basket has exactly the chosen one.
    // If remove fails, we cannot safely add a new card (could charge both); fail the step.
    const existingPaymentId = basket.paymentInstruments?.[0]?.paymentInstrumentId;
    if (existingPaymentId) {
        try {
            await removePaymentInstrumentFromBasket(context, basketId, existingPaymentId);
        } catch (err) {
            logger.error('Failed to remove existing payment instrument from basket; cannot safely add new payment.', {
                basketId,
                existingPaymentId,
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });
            return Response.json(
                {
                    success: false,
                    error: t('errors:checkout.paymentProcessingFailed'),
                    step: 'payment',
                },
                { status: 400 }
            );
        }
    }

    // Add payment instrument to basket via Commerce API
    let updatedBasket: ShopperBasketsV2.schemas['Basket'];
    try {
        updatedBasket = await addPaymentInstrumentToBasket(context, basketId, paymentInfo);
    } catch (err) {
        logger.error(
            'Failed to add payment instrument to basket after removing previous instrument; basket may have no payment.',
            {
                basketId,
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            }
        );
        const apiDetail =
            err && typeof err === 'object' && 'body' in err
                ? typeof (err as { body?: unknown }).body === 'object' &&
                  (err as { body?: { detail?: string } }).body?.detail
                    ? (err as { body: { detail?: string } }).body.detail
                    : ''
                : '';
        return Response.json(
            {
                success: false,
                error: t('errors:checkout.paymentProcessingFailed'),
                step: 'payment',
                ...(apiDetail && { apiError: apiDetail }),
            },
            { status: 400 }
        );
    }

    let finalUpdatedBasket;
    try {
        // Then update the billing address (this should also trigger calculations)
        const finalBasket = await updateBillingAddressForBasket(context, basketId, billingAddress);

        // Update basket with the final state from billing address API call
        // This should include payment instruments, billing address, and calculated totals
        const currentBasket = basket;

        // Check if payment instruments are preserved in the final response
        if (!finalBasket.paymentInstruments?.[0]) {
            // Payment instruments missing from API response, using updatedBasket data
            // Use the payment instrument from the earlier addPaymentInstrument call
            finalUpdatedBasket = {
                ...currentBasket,
                // Update with calculated totals from finalBasket
                orderTotal: finalBasket.orderTotal,
                productTotal: finalBasket.productTotal,
                shippingTotal: finalBasket.shippingTotal,
                merchandizeTotalTax: finalBasket.merchandizeTotalTax,
                taxTotal: finalBasket.taxTotal,
                // Use payment instruments from the earlier successful add operation
                paymentInstruments: updatedBasket.paymentInstruments,
                billingAddress: finalBasket.billingAddress,
            };
            updateBasketResource(context, finalUpdatedBasket);
        } else {
            // Payment instruments are preserved, use the complete final basket
            finalUpdatedBasket = {
                ...currentBasket,
                // Update all relevant fields from the API response
                orderTotal: finalBasket.orderTotal,
                productTotal: finalBasket.productTotal,
                shippingTotal: finalBasket.shippingTotal,
                merchandizeTotalTax: finalBasket.merchandizeTotalTax,
                taxTotal: finalBasket.taxTotal,
                paymentInstruments: finalBasket.paymentInstruments,
                billingAddress: finalBasket.billingAddress,
            };
            updateBasketResource(context, finalUpdatedBasket);
        }
    } catch {
        return Response.json(
            {
                success: false,
                error: t('errors:checkout.paymentProcessingFailed'),
                step: 'payment',
            },
            { status: 500 }
        );
    }

    // Return success data as JSON with updated basket for direct context updates
    return Response.json({
        success: true,
        step: 'payment',
        data: { paymentInfo },
        basket: finalUpdatedBasket,
    });
}
