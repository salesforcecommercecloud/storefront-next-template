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

import { useState, type ChangeEvent } from 'react';
import { type UseFormReturn, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import AddressSuggestionDropdown, { type AddressSuggestion } from '@/components/address-suggestion-dropdown';
import { MIN_INPUT_LENGTH, useAutocompleteSuggestions } from '@/hooks/use-autocomplete-suggestions';
import { processAddressSuggestion } from '@/lib/address-suggestions';
import { UITarget } from '@/targets/ui-target';

/**
 * Base address field names that the form must support
 */
export interface AddressFields {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    stateCode: string;
    postalCode: string;
    phone?: string;
}

/**
 * Props for the AddressFormFields component
 */
export interface AddressFormFieldsProps<TFormValues extends FieldValues> {
    /** React Hook Form instance */
    form: UseFormReturn<TFormValues>;
    /**
     * Prefix for field names (e.g., 'billing' for billing address fields).
     * When provided, field names become 'billingFirstName', 'billingAddress1', etc.
     * When empty, field names are 'firstName', 'address1', etc.
     */
    fieldPrefix?: string;
    /** Whether to show the phone field (default: true) */
    showPhone?: boolean;
    /** Whether the address1 field should have autoFocus (default: false) */
    autoFocus?: boolean;
    /** Country code for address autocomplete (default: 'US') */
    countryCode?: string;
    /** Custom class name for the container */
    className?: string;
}

/**
 * Shared address form fields component with Google Maps autocomplete integration.
 *
 * This component renders address form fields (firstName, lastName, address1, address2,
 * city, stateCode, postalCode, and optionally phone) with address autocomplete
 * functionality powered by Google Maps Places API.
 *
 * @example
 * ```tsx
 * // For shipping address (no prefix)
 * <AddressFormFields form={form} showPhone={true} autoFocus={isEditing} />
 *
 * // For billing address (with prefix)
 * <AddressFormFields form={form} fieldPrefix="billing" showPhone={false} />
 * ```
 */
export function AddressFormFields<TFormValues extends FieldValues>({
    form,
    fieldPrefix = '',
    showPhone = true,
    autoFocus = false,
    countryCode = 'US',
    className,
}: AddressFormFieldsProps<TFormValues>) {
    const { t } = useTranslation('checkout');

    // Address autocomplete state
    const [addressInput, setAddressInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Use the autocomplete suggestions hook for Google Maps Places API
    const {
        suggestions: addressSuggestions,
        isLoading: isLoadingSuggestions,
        resetSession,
    } = useAutocompleteSuggestions({
        inputString: addressInput,
        countryCode,
    });

    /**
     * Helper to construct field names with optional prefix
     * e.g., with prefix 'billing': 'firstName' becomes 'billingFirstName'
     */
    const getFieldName = (baseName: string): Path<TFormValues> => {
        if (!fieldPrefix) {
            return baseName as Path<TFormValues>;
        }
        // Capitalize first letter of baseName when prefixing
        const capitalizedBaseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        return `${fieldPrefix}${capitalizedBaseName}` as Path<TFormValues>;
    };

    /**
     * Helper to construct autoComplete attribute with proper section prefix
     * e.g., with prefix 'billing': 'given-name' becomes 'billing given-name'
     * e.g., with prefix '' (shipping): 'given-name' becomes 'shipping given-name'
     */
    const getAutoComplete = (autoCompleteValue: string): string => {
        const section = fieldPrefix || 'shipping';
        return `${section} ${autoCompleteValue}`;
    };

    const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
        setShowSuggestions(false);

        // Process the suggestion to get structured address fields
        const addressFields = await processAddressSuggestion(suggestion);

        // Populate address form fields using the prefixed field names
        form.setValue(getFieldName('address1'), addressFields.address1 as TFormValues[Path<TFormValues>]);
        if (addressFields.city) {
            form.setValue(getFieldName('city'), addressFields.city as TFormValues[Path<TFormValues>]);
        }
        if (addressFields.stateCode) {
            form.setValue(getFieldName('stateCode'), addressFields.stateCode as TFormValues[Path<TFormValues>]);
        }
        if (addressFields.postalCode) {
            form.setValue(getFieldName('postalCode'), addressFields.postalCode as TFormValues[Path<TFormValues>]);
        }

        // Reset the autocomplete session after selection
        resetSession();
        setAddressInput('');
    };

    const handleCloseSuggestions = () => {
        setShowSuggestions(false);
    };

    const handleAddressInputChange = (e: ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
        const value = e.target.value;
        fieldOnChange(value);
        setAddressInput(value);
        // Show suggestions dropdown when user starts typing
        if (value.length >= MIN_INPUT_LENGTH) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    /**
     * Renders the address autocomplete dropdown with target extensibility.
     * Uses different targetIds for shipping vs billing addresses to allow
     * extension developers to customize each independently.
     */
    const renderAddressAutocomplete = (): React.ReactNode => {
        if (!showSuggestions || addressSuggestions.length === 0) {
            return null;
        }

        const dropdown = (
            <AddressSuggestionDropdown
                suggestions={addressSuggestions}
                isVisible={showSuggestions}
                isLoading={isLoadingSuggestions}
                onClose={handleCloseSuggestions}
                onSelectSuggestion={(suggestion) => void handleSelectSuggestion(suggestion)}
            />
        );

        if (fieldPrefix === 'billing') {
            return (
                <div>
                    <UITarget targetId="checkout.payment.billingAddress.autocomplete">{dropdown}</UITarget>
                </div>
            );
        }

        // Default: shipping address (no fieldPrefix)
        return (
            <div>
                <UITarget targetId="checkout.shippingAddress.autocomplete">{dropdown}</UITarget>
            </div>
        );
    };

    return (
        <div className={className}>
            {/* First Name and Last Name Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <FormField
                    control={form.control}
                    name={getFieldName('firstName')}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.firstNameLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('addressForm.firstNamePlaceholder')}
                                    autoComplete={getAutoComplete('given-name')}
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={getFieldName('lastName')}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.lastNameLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('addressForm.lastNamePlaceholder')}
                                    autoComplete={getAutoComplete('family-name')}
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />
            </div>

            {/* Address Line 1 with Autocomplete */}
            <div className="mb-4">
                <FormField
                    control={form.control}
                    name={getFieldName('address1')}
                    render={({ field }) => (
                        <FormItem className="relative">
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.addressLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('addressForm.addressPlaceholder')}
                                    autoComplete="off"
                                    autoFocus={autoFocus}
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                    onChange={(e) => handleAddressInputChange(e, field.onChange)}
                                />
                            </FormControl>
                            {renderAddressAutocomplete()}
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />
            </div>

            {/* Address Line 2 */}
            <div className="mb-4">
                <FormField
                    control={form.control}
                    name={getFieldName('address2')}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.address2Label')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('addressForm.address2Placeholder')}
                                    autoComplete={getAutoComplete('address-line2')}
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* City, State, and Postal Code Row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <FormField
                    control={form.control}
                    name={getFieldName('city')}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.cityLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('addressForm.cityPlaceholder')}
                                    autoComplete={getAutoComplete('address-level2')}
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={getFieldName('stateCode')}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.stateLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('addressForm.statePlaceholder')}
                                    autoComplete={getAutoComplete('address-level1')}
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={getFieldName('postalCode')}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.zipLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('addressForm.zipPlaceholder')}
                                    autoComplete={getAutoComplete('postal-code')}
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />
            </div>

            {/* Phone Field (optional) */}
            {showPhone && (
                <FormField
                    control={form.control}
                    name={getFieldName('phone')}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('addressForm.phoneLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="tel"
                                    placeholder={t('addressForm.phonePlaceholder')}
                                    autoComplete="tel"
                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}

export default AddressFormFields;
