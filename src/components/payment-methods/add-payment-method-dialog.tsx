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

import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, CreditCard } from 'lucide-react';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { type CountryCode } from '@/components/customer-address-form';
import { AddressFormFields } from '@/components/address-form-fields';
import { CreditCardInputFields } from '@/components/credit-card-input-fields';
import { Form } from '@/components/ui/form';

// Define the payment form data type
interface PaymentFormData {
    cardholderName: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    saveAsDefault: boolean;
}

// Define the address form data type
interface BillingAddressFormData {
    billingFirstName: string;
    billingLastName: string;
    billingAddress1: string;
    billingAddress2: string;
    billingCity: string;
    billingStateCode: string;
    billingPostalCode: string;
    billingPhone: string;
}

export interface AddPaymentMethodDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit?: () => void;
    addresses: ShopperCustomers.schemas['CustomerAddress'][];
}

/**
 * Add payment method dialog component
 */
export function AddPaymentMethodDialog({
    open,
    onOpenChange,
    onSubmit,
    addresses,
}: AddPaymentMethodDialogProps): ReactElement {
    const { t } = useTranslation('account');
    const [selectedAddress, setSelectedAddress] = useState('');
    const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
    const [countryCode] = useState<CountryCode>('US');

    // Initialize form for payment data
    const paymentForm = useForm<PaymentFormData>({
        defaultValues: {
            cardholderName: '',
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            saveAsDefault: false,
        },
    });

    // Initialize form for new billing address
    const addressForm = useForm<BillingAddressFormData>({
        defaultValues: {
            billingFirstName: '',
            billingLastName: '',
            billingAddress1: '',
            billingAddress2: '',
            billingCity: '',
            billingStateCode: '',
            billingPostalCode: '',
            billingPhone: '',
        },
    });

    const handleClose = () => {
        setSelectedAddress('');
        setIsAddingNewAddress(false);
        paymentForm.reset();
        addressForm.reset();
        onOpenChange(false);
    };

    const handleSubmit = () => {
        // TODO: Implement actual payment method addition
        onSubmit?.();
        handleClose();
    };

    const handleToggleAddAddress = () => {
        if (!isAddingNewAddress) {
            setSelectedAddress(''); // Reset dropdown when opening new address form
        }
        setIsAddingNewAddress(!isAddingNewAddress);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-xl font-semibold">
                        {t('paymentMethods.addPaymentMethodTitle')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Credit Card Radio Option */}
                    <div className="border border-primary rounded-lg bg-background">
                        <label className="flex items-center gap-3 p-4 cursor-pointer">
                            <input
                                type="radio"
                                name="paymentMethod"
                                className="w-4 h-4 text-primary border-input"
                                defaultChecked
                            />
                            <span className="text-sm font-medium">{t('paymentMethods.creditCard')}</span>
                            <div className="ml-auto">
                                <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                        </label>

                        {/* Card Form Fields - Reusing checkout component */}
                        <div className="px-4 pb-4 space-y-3 border-t pt-3">
                            <Form {...paymentForm}>
                                <CreditCardInputFields
                                    form={paymentForm}
                                    autoFocus={false}
                                    showIsDefaultOption
                                    defaultOptionLabel={t('paymentMethods.saveAsDefault')}
                                />
                            </Form>
                        </div>
                    </div>

                    {/* Billing Address Section */}
                    <div className="pt-2">
                        <Label className="text-sm font-medium mb-2 block">{t('paymentMethods.billingAddress')}</Label>

                        <div className="[&_[data-slot=native-select-wrapper]]:w-full">
                            <NativeSelect
                                id="billing-address"
                                value={selectedAddress}
                                onChange={(e) => {
                                    setSelectedAddress(e.target.value);
                                    if (e.target.value) {
                                        setIsAddingNewAddress(false);
                                    }
                                }}
                                required
                                aria-required="true">
                                <NativeSelectOption value="">{t('paymentMethods.selectAddress')}</NativeSelectOption>
                                {addresses.map((address) => (
                                    <NativeSelectOption key={address.addressId} value={address.addressId || ''}>
                                        {address.firstName} {address.lastName} - {address.address1}
                                        {address.city && `, ${address.city}`}...
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </div>

                        {!isAddingNewAddress ? (
                            <button
                                type="button"
                                onClick={handleToggleAddAddress}
                                className="flex items-center gap-1 mt-2 text-sm text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors">
                                <Plus className="w-4 h-4" />
                                {t('paymentMethods.addNewAddress')}
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleToggleAddAddress}
                                    className="flex items-center gap-1 mt-2 text-sm text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors">
                                    <X className="w-4 h-4" />
                                    {t('paymentMethods.cancel')}
                                </button>

                                {/* New Address Form - Using AddressFormFields component */}
                                <div className="mt-4">
                                    <Form {...addressForm}>
                                        <AddressFormFields
                                            form={addressForm}
                                            fieldPrefix="billing"
                                            showPhone={false}
                                            autoFocus={false}
                                            countryCode={countryCode}
                                        />
                                    </Form>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Dialog Footer */}
                <div className="flex items-center justify-end gap-3 mt-2 pt-6 border-t">
                    <Button variant="outline" onClick={handleClose}>
                        {t('paymentMethods.cancel')}
                    </Button>
                    <Button onClick={handleSubmit}>{t('paymentMethods.save')}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
