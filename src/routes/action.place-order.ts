import { redirect, type ActionFunctionArgs } from 'react-router';
import { getBasket, updateBasket, destroyBasket } from '@/middlewares/basket.client';
import { getAuth } from '@/middlewares/auth.client';
import createClient from '@/lib/scapi';
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
import uiStrings from '@/temp-ui-string';
import { createErrorResponse } from '@/lib/error-handler';

export async function clientAction({ request, context }: ActionFunctionArgs) {
    try {
        // Parse form data to get create account preference
        const formData = await request.formData();
        const shouldCreateAccount = formData.get('shouldCreateAccount') === 'true';

        // Get current basket
        const basket = getBasket(context);

        if (!basket || !basket.basketId) {
            return Response.json(
                {
                    success: false,
                    error: uiStrings.errors.checkout.noActiveBasket,
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
                    error: uiStrings.checkout.contactInfo.emailRequired,
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        if (!basket.shipments?.[0]?.shippingAddress) {
            return Response.json(
                {
                    success: false,
                    error: uiStrings.errors.api.shippingAddressRequired,
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        if (!basket.shipments?.[0]?.shippingMethod) {
            return Response.json(
                {
                    success: false,
                    error: uiStrings.errors.checkout.shippingMethodNotAvailable,
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        if (!basket.paymentInstruments?.[0]) {
            // Check if this is a returning customer with saved payment methods
            const auth = getAuth(context);
            const customerId = auth.customer_id;

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
                            updateBasket(context, preservedBasket);
                        } else {
                            return Response.json(
                                {
                                    success: false,
                                    error: uiStrings.errors.api.billingAddressRequired,
                                    step: 'placeOrder',
                                },
                                { status: 400 }
                            );
                        }
                    } else {
                        return Response.json(
                            {
                                success: false,
                                error: uiStrings.errors.api.paymentInformationRequired,
                                step: 'placeOrder',
                            },
                            { status: 400 }
                        );
                    }
                } catch {
                    return Response.json(
                        {
                            success: false,
                            error: uiStrings.errors.api.paymentInformationRequired,
                            step: 'placeOrder',
                        },
                        { status: 400 }
                    );
                }
            } else {
                return Response.json(
                    {
                        success: false,
                        error: uiStrings.errors.api.paymentInformationRequired,
                        step: 'placeOrder',
                    },
                    { status: 400 }
                );
            }
        }

        // Get the updated basket after potential payment application
        const updatedBasket = getBasket(context);

        // Ensure billing address is set (SFCC requirement)
        if (!updatedBasket.billingAddress) {
            return Response.json(
                {
                    success: false,
                    error: uiStrings.errors.api.billingAddressRequired,
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        // Calculate basket totals before creating order (SFCC requirement)
        // Use the updated basket's currency or appropriate fallback
        const currency = getBasketCurrency(updatedBasket);

        if (!updatedBasket.basketId) {
            return Response.json(
                {
                    success: false,
                    error: uiStrings.errors.api.basketNotFound,
                    step: 'placeOrder',
                },
                { status: 400 }
            );
        }

        const calculatedBasket = await calculateBasket(context, updatedBasket.basketId, currency);

        // Update local basket state with calculated totals
        updateBasket(context, calculatedBasket);

        // Create the order
        const order = await createClient(context).ShopperOrders.createOrder({
            body: { basketId: calculatedBasket.basketId },
        });

        if (!order || !order.orderNo) {
            return Response.json(
                {
                    success: false,
                    error: uiStrings.checkout.placeOrder.failed,
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
