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
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createPaymentSchema, parsePaymentFromFormData } from '@/lib/checkout-schemas';
import { addPaymentInstrumentToBasket, updateBillingAddressForBasket } from '@/lib/api/basket';
import { detectCardType } from '@/lib/payment-utils';
import { getTranslation } from '@/lib/i18next';

/**
 * Server action for submitting checkout payment information.
 */
export async function action(formData: FormData, context: RouterContextProvider) {
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
        // Use saved payment instrument (PWA Kit pattern)
        paymentInfo = {
            paymentMethodId: 'CREDIT_CARD',
            customerPaymentInstrumentId: selectedSavedPaymentMethod,
        };
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

        paymentInfo = {
            paymentMethodId: 'CREDIT_CARD',
            paymentCard: {
                holder: cardholderName,
                maskedNumber: cleanCardNumber.slice(0, -4).replace(/\d/g, '*') + cleanCardNumber.slice(-4),
                cardType: detectCardType(cleanCardNumber),
                expirationMonth: parseInt(expiryMonth),
                expirationYear: parseInt(`20${expiryYear}`),
                // Note: issueNumber, validFromMonth, validFromYear are legacy fields
                // for older card systems and are not needed for modern credit cards
            },
        };
    }

    // Prepare billing address
    const billingAddress = billingSameAsShipping
        ? basket.shipments?.[0]?.shippingAddress
        : {
              firstName: result.data.billingFirstName || '',
              lastName: result.data.billingLastName || '',
              address1: result.data.billingAddress1 || '',
              address2: result.data.billingAddress2 || '',
              city: result.data.billingCity || '',
              stateCode: result.data.billingStateCode || '',
              postalCode: result.data.billingPostalCode || '',
              phone: result.data.billingPhone || '',
              countryCode: 'US', // Default to US, in real app this would be from form
          };

    // Add payment instrument to basket via Commerce API
    let finalUpdatedBasket;
    try {
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

        // First add the payment instrument
        const updatedBasket = await addPaymentInstrumentToBasket(context, basketId, paymentInfo);

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
