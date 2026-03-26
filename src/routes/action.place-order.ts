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
    type PaymentInstrumentForSave,
    saveShippingAddressToCustomer,
    saveBillingAddressToCustomer,
    getCustomerProfileForCheckout,
} from '@/lib/api/customer';
import { getPaymentMethodsFromCustomer } from '@/lib/customer-profile-utils';
import { createErrorResponse } from '@/lib/error-handler';
import { getTranslation } from '@/lib/i18next';
import { buildUrlFromContext } from '@/lib/url.server';
// @sfdc-extension-line SFDC_EXT_MULTISHIP
import { resolveEmptyShipments } from '@/extensions/multiship/lib/api/basket';
import { getLogger } from '@/lib/logger.server';

function placeOrderErrorResponse(body: { success: false; error: string; step: string }) {
    return Response.json(body, { status: 400 });
}

/**
 * Server action for placing an order.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    const { t } = getTranslation();

    try {
        // Parse form data to get create account preference and save-payment option
        const formData = await request.formData();
        const shouldCreateAccount = formData.get('shouldCreateAccount') === 'true';
        const savePaymentToProfile = formData.get('savePaymentToProfile') === 'true';

        // Get current basket
        const basketResource = await getBasket(context);
        const basket = basketResource.current;

        if (!basket || !basket.basketId) {
            return placeOrderErrorResponse({
                success: false,
                error: t('errors:checkout.noActiveBasket'),
                step: 'placeOrder',
            });
        }

        // Validate that basket has all required information
        if (!basket.customerInfo?.email) {
            return placeOrderErrorResponse({
                success: false,
                error: t('checkout:contactInfo.emailRequired'),
                step: 'placeOrder',
            });
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
                return placeOrderErrorResponse({
                    success: false,
                    error: t('errors:api.shippingAddressRequired'),
                    step: 'placeOrder',
                });
            }

            if (!shipment.shippingMethod) {
                return placeOrderErrorResponse({
                    success: false,
                    error: t('errors:checkout.shippingMethodRequired'),
                    step: 'placeOrder',
                });
            }
        }

        if (!basket.paymentInstruments?.[0]) {
            // Check if this is a returning customer with saved payment methods
            const auth = getAuth(context);
            const customerId = auth.customerId;

            if (customerId) {
                try {
                    const customerProfile = await getCustomerProfileForCheckout(context, customerId);
                    if (!customerProfile) {
                        return placeOrderErrorResponse({
                            success: false,
                            error: t('errors:api.unableToLoadCustomerProfile'),
                            step: 'placeOrder',
                        });
                    }
                    const savedPaymentMethods = getPaymentMethodsFromCustomer(customerProfile);

                    if (savedPaymentMethods.length > 0) {
                        const preferredMethod =
                            savedPaymentMethods.find((method) => method.preferred) || savedPaymentMethods[0];

                        // SFCC requires customerPaymentInstrumentId to charge a saved payment instrument.
                        // paymentCard (cardType, maskedNumber, etc.) is display metadata only and cannot
                        // be used to charge a saved card.
                        const paymentInfo = {
                            paymentMethodId: 'CREDIT_CARD',
                            customerPaymentInstrumentId: preferredMethod.id,
                            amount: basket.orderTotal ?? 0,
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
                            return placeOrderErrorResponse({
                                success: false,
                                error: t('errors:api.billingAddressRequired'),
                                step: 'placeOrder',
                            });
                        }
                    } else {
                        return placeOrderErrorResponse({
                            success: false,
                            error: t('errors:api.paymentInformationRequired'),
                            step: 'placeOrder',
                        });
                    }
                } catch {
                    return placeOrderErrorResponse({
                        success: false,
                        error: t('errors:api.paymentInformationRequired'),
                        step: 'placeOrder',
                    });
                }
            } else {
                return placeOrderErrorResponse({
                    success: false,
                    error: t('errors:api.paymentInformationRequired'),
                    step: 'placeOrder',
                });
            }
        }

        // Get the updated basket after potential payment application
        const updatedBasket = (await getBasket(context)).current;

        if (!updatedBasket?.billingAddress) {
            return placeOrderErrorResponse({
                success: false,
                error: t('errors:api.billingAddressRequired'),
                step: 'placeOrder',
            });
        }

        // @sfdc-extension-line SFDC_EXT_MULTISHIP
        await resolveEmptyShipments(context, updatedBasket);

        const currency = getBasketCurrency(context, updatedBasket);

        if (!updatedBasket?.basketId) {
            return placeOrderErrorResponse({
                success: false,
                error: t('errors:api.basketNotFound'),
                step: 'placeOrder',
            });
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

        // Check if user registered via email verification during checkout (passwordless flow)
        const auth = getAuth(context);
        const registeredViaCheckout = auth.userType === 'registered' && auth.customerId && shouldCreateAccount;

        // Save checkout information to customer profile
        if (auth.customerId) {
            const savePromises: Promise<unknown>[] = [];

            // For newly registered customers (via OTP), save all their checkout info
            if (registeredViaCheckout) {
                // Save payment method if opted in
                if (savePaymentToProfile && order.paymentInstruments?.[0]) {
                    savePromises.push(
                        savePaymentMethodToCustomer(
                            context,
                            auth.customerId,
                            order.paymentInstruments[0] as PaymentInstrumentForSave
                        ).catch((error) => {
                            logger.error('Failed to save payment method for new customer', {
                                error: error instanceof Error ? error : String(error),
                            });
                        })
                    );
                }

                // Save shipping address (includes phone number)
                if (order.shipments?.[0]?.shippingAddress) {
                    savePromises.push(
                        saveShippingAddressToCustomer(
                            context,
                            auth.customerId,
                            order.shipments[0].shippingAddress
                        ).catch((error) => {
                            logger.error('Failed to save shipping address for new customer', {
                                error: error instanceof Error ? error : String(error),
                            });
                        })
                    );
                }

                // Save billing address
                if (order.billingAddress) {
                    savePromises.push(
                        saveBillingAddressToCustomer(context, auth.customerId, order.billingAddress).catch((error) => {
                            logger.error('Failed to save billing address for new customer', {
                                error: error instanceof Error ? error : String(error),
                            });
                        })
                    );
                }
            }
            // For existing registered customers, only save payment if opted in
            // Do not automatically save addresses to avoid creating duplicates.
            else if (savePaymentToProfile && order.paymentInstruments?.[0]) {
                savePromises.push(
                    savePaymentMethodToCustomer(
                        context,
                        auth.customerId,
                        order.paymentInstruments[0] as PaymentInstrumentForSave
                    ).catch((error) => {
                        logger.error('Failed to save payment method', {
                            error: error instanceof Error ? error : String(error),
                        });
                    })
                );
            }

            // Execute all save operations in parallel (don't block order confirmation)
            if (savePromises.length > 0) {
                void Promise.all(savePromises);
            }
        }

        // Clear the basket from local cache and storage after successful order placement
        // This follows the PWA Kit pattern - destroy locally, let Commerce Cloud handle server-side lifecycle
        // The basket is auto-converted to an order, no explicit deletion needed
        destroyBasket(context);

        // Redirect to order confirmation page on success
        // Include account creation and auto-login status as query parameters if account was created
        let orderConfirmationUrl = buildUrlFromContext(`/order-confirmation/${order.orderNo}`, context);

        if (registeredViaCheckout && order.customerInfo?.email) {
            // User registered during checkout - include this in query params for order confirmation
            const params = new URLSearchParams({
                accountCreated: 'true',
                email: order.customerInfo.email,
                autoLoggedIn: 'true',
            });

            orderConfirmationUrl += `?${params.toString()}`;
        }

        return redirect(orderConfirmationUrl);
    } catch (error) {
        // Use the error handler to create a standardized response
        return await createErrorResponse(error, 'placeOrder', 500);
    }
}
