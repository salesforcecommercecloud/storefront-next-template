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
'use client';

import { useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { createCustomerAddressFormSchema, type CustomerAddressFormData } from '@/components/customer-address-form';
import { COUNTRY_CODES } from '@/components/customer-address-form/constants';
import { getStatesForCountry, getCountryName } from '@/components/customer-address-form/utils';
import { getAddressKey } from '@/extensions/multiship/lib/address-utils';

/**
 * Props for the AddAddressDialog component.
 *
 * @interface AddAddressDialogProps
 * @property {boolean} open - Whether the dialog is currently open
 * @property {(open: boolean) => void} onOpenChange - Callback function invoked when the dialog open state changes
 * @property {(address: ShopperCustomers.schemas['CustomerAddress']) => void} onSave - Callback function invoked when the address form is submitted with valid data
 * @property {Partial<ShopperCustomers.schemas['CustomerAddress']>} [defaultValues] - Optional default values to populate the form fields
 */
interface AddAddressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (address: ShopperCustomers.schemas['CustomerAddress']) => void;
    defaultValues?: Partial<ShopperCustomers.schemas['CustomerAddress']>;
}

/**
 * AddAddressDialog Component
 *
 * A dialog component that allows users to add a new shipping address during checkout.
 * The dialog displays a form with fields for all address information including name,
 * address lines, city, state/province, postal code, country, and phone number.
 *
 * Features:
 * - Form validation using Zod schema
 * - Dynamic state/province options based on selected country
 * - Localized labels and placeholders based on country selection
 * - Supports pre-filling form fields with default values
 * - Automatically generates address key for new addresses
 *
 * @param {AddAddressDialogProps} props - Component props
 * @param {boolean} props.open - Whether the dialog is currently open
 * @param {(open: boolean) => void} props.onOpenChange - Callback function invoked when the dialog open state changes
 * @param {(address: ShopperCustomers.schemas['CustomerAddress']) => void} props.onSave - Callback function invoked when the address form is submitted with valid data
 * @param {Partial<ShopperCustomers.schemas['CustomerAddress']>} [props.defaultValues] - Optional default values to populate the form fields
 *
 * @returns {React.JSX.Element} The rendered AddAddressDialog component
 *
 * @example
 * ```tsx
 * <AddAddressDialog
 *   open={isDialogOpen}
 *   onOpenChange={setIsDialogOpen}
 *   onSave={(address) => handleSaveAddress(address)}
 *   defaultValues={{ countryCode: 'US' }}
 * />
 * ```
 */
export function AddAddressDialog({ open, onOpenChange, onSave, defaultValues }: AddAddressDialogProps) {
    const { t: tAccount } = useTranslation(['errors', 'account']);
    const { t: tAddressForm } = useTranslation(['extMultiship']);
    const schema = useMemo(() => createCustomerAddressFormSchema(tAccount), [tAccount]);

    const form = useForm<CustomerAddressFormData>({
        // @ts-expect-error - zodResolver type mismatch with zod version
        resolver: zodResolver(schema),
        defaultValues: {
            addressId: defaultValues?.addressId || '',
            firstName: defaultValues?.firstName || '',
            lastName: defaultValues?.lastName || '',
            phone: defaultValues?.phone || '',
            countryCode: (defaultValues?.countryCode as 'US' | 'CA') || 'US',
            address1: defaultValues?.address1 || '',
            address2: defaultValues?.address2 || '',
            city: defaultValues?.city || '',
            stateCode: defaultValues?.stateCode || '',
            postalCode: defaultValues?.postalCode || '',
            preferred: Boolean(defaultValues?.preferred ?? false),
        },
    });

    // Type assertion for control to work around zodResolver type mismatch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const control = form.control as any as Control<CustomerAddressFormData>;

    // Watch country code to update state options
    const countryCode = form.watch('countryCode');

    // Build countries list with translated names
    const countries = useMemo(() => {
        return COUNTRY_CODES.map((code) => ({
            code,
            name: getCountryName(code),
        }));
    }, []);

    // Get state/province options based on selected country
    const stateOptions = useMemo(() => {
        return getStatesForCountry(countryCode);
    }, [countryCode]);

    // Determine if current country uses "State" or "Province"
    const statePlaceholder = useMemo(() => {
        return countryCode === 'US'
            ? tAddressForm('checkout.addressForm.selectStatePlaceholder')
            : tAddressForm('checkout.addressForm.selectProvincePlaceholder');
    }, [countryCode, tAddressForm]);

    // Update postal code label based on country
    const postalCodeLabel = useMemo(() => {
        return countryCode === 'US'
            ? tAddressForm('checkout.addressForm.zipCodePlaceholder')
            : tAddressForm('checkout.addressForm.postalCodePlaceholder');
    }, [countryCode, tAddressForm]);

    const handleSubmit = form.handleSubmit((data) => {
        const newAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: getAddressKey(data),
            firstName: data.firstName,
            lastName: data.lastName,
            address1: data.address1,
            address2: data.address2 || undefined,
            city: data.city,
            stateCode: data.stateCode || undefined,
            postalCode: data.postalCode,
            phone: data.phone || undefined,
            countryCode: data.countryCode,
            preferred: data.preferred,
        };
        onSave(newAddress);
        form.reset();
        onOpenChange(false);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>{tAddressForm('checkout.addressForm.addAddressTitle')}</DialogTitle>
                <Form {...form}>
                    <form
                        onSubmit={(e) => {
                            void handleSubmit(e);
                        }}
                        className="space-y-6">
                        <div className="space-y-4">
                            {/* Address Title Field */}
                            <FormField
                                control={control}
                                name="addressId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                maxLength={256}
                                                placeholder={tAccount('account:addressForm.addressTitlePlaceholder')}
                                                className="rounded-md"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* First Name and Last Name Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* First Name Field */}
                                <FormField
                                    control={control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    autoComplete="given-name"
                                                    placeholder={tAddressForm(
                                                        'checkout.addressForm.firstNamePlaceholder'
                                                    )}
                                                    className="rounded-md"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Last Name Field */}
                                <FormField
                                    control={control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    autoComplete="family-name"
                                                    placeholder={tAddressForm(
                                                        'checkout.addressForm.lastNamePlaceholder'
                                                    )}
                                                    className="rounded-md"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Phone Field */}
                            <FormField
                                control={control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="tel"
                                                autoComplete="tel"
                                                maxLength={32}
                                                placeholder={tAccount('account:addressForm.phonePlaceholder')}
                                                className="rounded-md"
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(e) => {
                                                    // Format phone number with standard US format: (XXX) XXX-XXXX
                                                    const digits = e.target.value.replace(/\D/g, '');
                                                    const limitedDigits = digits.slice(0, 10);
                                                    let formatted = '';
                                                    if (limitedDigits.length >= 7) {
                                                        formatted = `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
                                                    } else if (limitedDigits.length >= 4) {
                                                        formatted = `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
                                                    } else if (limitedDigits.length > 0) {
                                                        formatted = `(${limitedDigits}`;
                                                    }
                                                    field.onChange(formatted);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Country Field */}
                            <FormField
                                control={control}
                                name="countryCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <NativeSelect
                                                name={field.name}
                                                value={field.value}
                                                onChange={(e) => {
                                                    field.onChange(e.target.value);
                                                    // Reset state code when country changes
                                                    form.setValue('stateCode', '');
                                                    form.setValue('postalCode', '');
                                                }}
                                                className="rounded-md">
                                                {countries.map((country) => (
                                                    <option key={country.code} value={country.code}>
                                                        {country.name}
                                                    </option>
                                                ))}
                                            </NativeSelect>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Address Line 1 Field */}
                            <FormField
                                control={control}
                                name="address1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                autoComplete="address-line1"
                                                placeholder={tAddressForm('checkout.addressForm.address1Placeholder')}
                                                className="rounded-md"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Address Line 2 Field */}
                            <FormField
                                control={control}
                                name="address2"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                autoComplete="address-line2"
                                                placeholder={tAddressForm('checkout.addressForm.address2Placeholder')}
                                                className="rounded-md"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Postal Code, City, State/Province Row */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-w-0">
                                {/* Postal Code Field */}
                                <div className="min-w-0">
                                    <FormField
                                        control={control}
                                        name="postalCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        autoComplete="postal-code"
                                                        placeholder={postalCodeLabel}
                                                        className="rounded-md"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* City Field */}
                                <div className="min-w-0">
                                    <FormField
                                        control={control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        autoComplete="address-level2"
                                                        placeholder={tAddressForm(
                                                            'checkout.addressForm.cityPlaceholder'
                                                        )}
                                                        className="rounded-md"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* State/Province Field */}
                                <FormField
                                    control={control}
                                    name="stateCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <NativeSelect
                                                    name={field.name}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value)}
                                                    className="rounded-md">
                                                    <option value="">{statePlaceholder}</option>
                                                    {stateOptions.map((state) => (
                                                        <option key={state.code} value={state.code}>
                                                            {state.name}
                                                        </option>
                                                    ))}
                                                </NativeSelect>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    form.reset();
                                    onOpenChange(false);
                                }}
                                size="lg"
                                className="min-w-32 h-12 text-base font-semibold">
                                {tAddressForm('checkout.addressForm.cancelButton')}
                            </Button>
                            <Button type="submit" size="lg" className="min-w-32 h-12 text-base font-semibold">
                                {tAddressForm('checkout.addressForm.saveButton')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
