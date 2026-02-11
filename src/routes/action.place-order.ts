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
import { redirect, type ActionFunctionArgs } from 'react-router';
import { getBasket, updateBasketResource, destroyBasket } from '@/middlewares/basket.server';
import { getAuth } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients';
import {
    calculateBasket,
    getBasketCurrency,
    addPaymentInstrumentToBasket,
    updateBillingAddressForBasket,
} from '@/lib/api/basket';
import {
    savePaymentMethodToCustomer,
    registerGuestUser,
    saveShippingAddressToCustomer,
    saveBillingAddressToCustomer,
    updateCustomerContactInfo,
    getCustomerProfileForCheckout,
} from '@/lib/api/customer';
import { getPaymentMethodsFromCustomer } from '@/lib/customer-profile-utils';
import { createErrorResponse } from '@/lib/error-handler';
import { getTranslation } from '@/lib/i18next';
// @sfdc-extension-line SFDC_EXT_MULTISHIP
import { resolveEmptyShipments } from '@/extensions/multiship/lib/api/basket';

/**
 * Server action for placing an order.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const { t } = getTranslation();

    try {
        // Parse form data to get create account preference
        const formData = await request.formData();
        const shouldCreateAccount = formData.get('shouldCreateAccount') === 'true';

        // Get current basket
        const basketResource = await getBasket(context);
        const basket = basketResource.current;

        if (!basket || !basket.basketId) {
            return Response.json(
                {
                    success: false,
                    error: t('errors:checkout.noActiveBasket'),
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        // Validate that basket has all required information
        if (!basket.customerInfo?.email) {
            return Response.json(
                {
                    success: false,
                    error: t('checkout:contactInfo.emailRequired'),
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        // Build a map of shipmentId -> item count for efficient lookups
        const shipmentItemCounts = new Map<string, number>();
        if (basket.productItems) {
            basket.productItems.forEach((item) => {
                if (item.shipmentId) {
                    shipmentItemCounts.set(item.shipmentId, (shipmentItemCounts.get(item.shipmentId) || 0) + 1);
                }
            });
        }

        // Filter to get only non-empty shipments (shipments with at least one item assigned)
        const nonEmptyShipments = (basket.shipments || []).filter((shipment) => {
            if (!shipment.shipmentId) return false;
            return (shipmentItemCounts.get(shipment.shipmentId) || 0) > 0;
        });

        // Check that all non-empty shipments have shipping address and method
        for (const shipment of nonEmptyShipments) {
            if (!shipment.shippingAddress) {
                return Response.json(
                    {
                        success: false,
                        error: t('errors:api.shippingAddressRequired'),
                        step: 'placeOrder',
                    },
                    { status: 400 }
                );
            }

            if (!shipment.shippingMethod) {
                return Response.json(
                    {
                        success: false,
                        error: t('errors:checkout.shippingMethodRequired'),
                        step: 'placeOrder',
                    },
                    { status: 400 }
                );
            }
        }

        if (!basket.paymentInstruments?.[0]) {
            // Check if this is a returning customer with saved payment methods
            const auth = getAuth(context);
            const customerId = auth.customerId;

            if (customerId) {
                try {
                    const customerProfile = await getCustomerProfileForCheckout(context, customerId);
                    const savedPaymentMethods = getPaymentMethodsFromCustomer(customerProfile);

                    if (savedPaymentMethods.length > 0) {
                        // Apply the first/preferred saved payment method to the basket
                        const preferredMethod =
                            savedPaymentMethods.find((method) => method.preferred) || savedPaymentMethods[0];

                        const paymentInfo = {
                            paymentMethodId: 'CREDIT_CARD',
                            customerPaymentInstrumentId: preferredMethod.id,
                        };

                        // Get billing address (use shipping address or customer's billing address)
                        const billingAddress =
                            basket.shipments?.[0]?.shippingAddress || customerProfile.preferredBillingAddress;

                        if (billingAddress) {
                            // Apply saved payment method to basket
                            const updatedBasket = await addPaymentInstrumentToBasket(
                                context,
                                basket.basketId,
                                paymentInfo
                            );
                            const finalBasket = await updateBillingAddressForBasket(
                                context,
                                basket.basketId,
                                billingAddress
                            );

                            // Update the local basket state
                            const preservedBasket = {
                                ...basket,
                                orderTotal: finalBasket.orderTotal,
                                productTotal: finalBasket.productTotal,
                                shippingTotal: finalBasket.shippingTotal,
                                merchandizeTotalTax: finalBasket.merchandizeTotalTax,
                                taxTotal: finalBasket.taxTotal,
                                paymentInstruments: updatedBasket.paymentInstruments || finalBasket.paymentInstruments,
                                billingAddress: finalBasket.billingAddress,
                            };
                            updateBasketResource(context, preservedBasket);
                        } else {
                            return Response.json(
                                {
                                    success: false,
                                    error: t('errors:api.billingAddressRequired'),
                                    step: 'placeOrder',
                                },
                                { status: 400 }
                            );
                        }
                    } else {
                        return Response.json(
                            {
                                success: false,
                                error: t('errors:api.paymentInformationRequired'),
                                step: 'placeOrder',
                            },
                            { status: 400 }
                        );
                    }
                } catch {
                    return Response.json(
                        {
                            success: false,
                            error: t('errors:api.paymentInformationRequired'),
                            step: 'placeOrder',
                        },
                        { status: 400 }
                    );
                }
            } else {
                return Response.json(
                    {
                        success: false,
                        error: t('errors:api.paymentInformationRequired'),
                        step: 'placeOrder',
                    },
                    { status: 400 }
                );
            }
        }

        // Get the updated basket after potential payment application
        const updatedBasket = (await getBasket(context)).current;

        if (!updatedBasket?.billingAddress) {
            return Response.json(
                {
                    success: false,
                    error: t('errors:api.billingAddressRequired'),
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        // @sfdc-extension-line SFDC_EXT_MULTISHIP
        await resolveEmptyShipments(context, updatedBasket);

        const currency = getBasketCurrency(context, updatedBasket);

        if (!updatedBasket?.basketId) {
            return Response.json(
                {
                    success: false,
                    error: t('errors:api.basketNotFound'),
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        const calculatedBasket = await calculateBasket(context, updatedBasket.basketId, currency);

        // Update local basket state with calculated totals
        updateBasketResource(context, calculatedBasket);

        const clients = createApiClients(context);

        const { data: order } = await clients.shopperOrders.createOrder({
            params: {},
            body: { basketId: calculatedBasket.basketId },
        });

        if (!order || !order.orderNo) {
            return Response.json(
                {
                    success: false,
                    error: t('checkout:placeOrder.failed'),
                    step: 'placeOrder',
                },
                { status: 500 }
            );
        }

        // Create account for guest user if shopper opted for registration
        let registrationResult = undefined;
        if (shouldCreateAccount && order.customerInfo?.email) {
            try {
                registrationResult = await registerGuestUser(context, order.customerInfo.email, {
                    orderNo: order.orderNo,
                    customerInfo: order.customerInfo,
                    shippingAddress: order.shipments?.[0]?.shippingAddress,
                });

                if (registrationResult.success) {
                    // Save customer information to the newly created account if auto-login succeeded
                    if (registrationResult.customerId && registrationResult.autoLoggedIn) {
                        const savePromises = [];

                        // Save payment method
                        if (order.paymentInstruments?.[0]) {
                            savePromises.push(
                                savePaymentMethodToCustomer(
                                    context,
                                    registrationResult.customerId,
                                    order.paymentInstruments[0]
                                )
                            );
                        }

                        // Save shipping address
                        if (order.shipments?.[0]?.shippingAddress) {
                            savePromises.push(
                                saveShippingAddressToCustomer(
                                    context,
                                    registrationResult.customerId,
                                    order.shipments[0].shippingAddress
                                )
                            );
                        }

                        // Save billing address (always save if exists)
                        if (order.billingAddress) {
                            savePromises.push(
                                saveBillingAddressToCustomer(
                                    context,
                                    registrationResult.customerId,
                                    order.billingAddress
                                )
                            );
                        }

                        // Update customer contact information (phone, etc.)
                        const contactInfo = {
                            phone: order.shipments?.[0]?.shippingAddress?.phone || order.billingAddress?.phone,
                            email: order.customerInfo?.email,
                            firstName: order.customerInfo?.firstName,
                            lastName: order.customerInfo?.lastName,
                        };

                        if (contactInfo.phone || contactInfo.firstName || contactInfo.lastName) {
                            savePromises.push(
                                updateCustomerContactInfo(context, registrationResult.customerId, contactInfo)
                            );
                        }

                        // Execute all save operations in parallel
                        // Don't wait for them to complete to avoid delaying the order confirmation
                        void Promise.all(savePromises);
                    }
                } else {
                    // Don't fail the order if account creation fails
                    // TODO: Need to discuss error handling in UX requirements. Show we show a toast type message?
                }
            } catch {
                // Don't fail the order if account creation fails
            }
        }

        // Clear the basket from local cache and storage after successful order placement
        // This follows the PWA Kit pattern - destroy locally, let Commerce Cloud handle server-side lifecycle
        // The basket is auto-converted to an order, no explicit deletion needed
        destroyBasket(context);

        // Redirect to order confirmation page on success
        // This uses React Router's redirect utility for proper navigation
        // Include account creation and auto-login status as query parameters if account was created
        let orderConfirmationUrl = `/order-confirmation/${order.orderNo}`;

        if (shouldCreateAccount && order.customerInfo?.email) {
            const params = new URLSearchParams({
                accountCreated: 'true',
                email: order.customerInfo.email,
            });

            // Add auto-login status if available (only set if we actually attempted registration)
            if (typeof registrationResult !== 'undefined') {
                params.set('autoLoggedIn', registrationResult.autoLoggedIn ? 'true' : 'false');
            }

            orderConfirmationUrl += `?${params.toString()}`;
        }

        return redirect(orderConfirmationUrl);
    } catch (error) {
        // Use the error handler to create a standardized response
        return await createErrorResponse(error, 'placeOrder', 500);
    }
}
