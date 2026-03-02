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
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useBasket } from '@/providers/basket';
import { createShippingAddressSchema, type ShippingAddressData } from '@/lib/checkout-schemas';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getShippingAddressFromCustomer, getAddressBookFromCustomer } from '@/lib/customer-profile-utils';
import { AddressFormFields } from '@/components/address-form-fields';
import SavedAddressesList from './saved-addresses-list';
import type { CheckoutActionData } from '../types';
import { addressToFormData } from '@/lib/address-utils';
import CheckoutErrorBanner from './checkout-error-banner';
import { getCheckoutDisplayError } from './checkout-display-error';
import ShippingAddressDisplay from './shipping-address-display';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface ShippingAddressProps {
    onSubmit: (formData: FormData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    // Step state managed by container
    isCompleted: boolean;
    isEditing: boolean;
    onEdit: () => void;
    // @sfdc-extension-block-start SFDC_EXT_MULTISHIP
    enableMultiAddress: boolean;
    handleToggleShippingAddressMode: () => void;
    // @sfdc-extension-block-end SFDC_EXT_MULTISHIP
}

export default function ShippingAddress({
    onSubmit,
    isLoading,
    actionData,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
    // @sfdc-extension-block-start SFDC_EXT_MULTISHIP
    enableMultiAddress,
    handleToggleShippingAddressMode,
    // @sfdc-extension-block-end SFDC_EXT_MULTISHIP
}: ShippingAddressProps) {
    const cart = useBasket();
    const customerProfile = useCustomerProfile();
    const { t } = useTranslation('checkout');
    // @sfdc-extension-line SFDC_EXT_MULTISHIP
    const { t: tMultiship } = useTranslation('extMultiship');

    const shippingAddress = cart?.shipments?.[0]?.shippingAddress;

    // Get auto-populated shipping address from customer profile
    const customerShippingAddress = getShippingAddressFromCustomer(customerProfile);

    // Get phone from contact info (prioritize this for auto-population)
    const contactInfoPhone = cart?.customerInfo?.phone;

    // Phone priority: saved shipping phone > contact info phone > customer profile phone
    const prioritizedPhoneNumber = (shippingAddress?.phone ||
        contactInfoPhone ||
        customerShippingAddress.phone ||
        '') as string;
    const schema = useMemo(() => createShippingAddressSchema(t as unknown as TFunction), [t]);
    const shippingFormError = getCheckoutDisplayError(actionData, 'shippingAddress');

    const form = useForm<ShippingAddressData>({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: shippingAddress?.firstName || customerShippingAddress.firstName || '',
            lastName: shippingAddress?.lastName || customerShippingAddress.lastName || '',
            address1: shippingAddress?.address1 || customerShippingAddress.address1 || '',
            address2: shippingAddress?.address2 || customerShippingAddress.address2 || '',
            city: shippingAddress?.city || customerShippingAddress.city || '',
            stateCode: shippingAddress?.stateCode || customerShippingAddress.stateCode || '',
            postalCode: shippingAddress?.postalCode || customerShippingAddress.postalCode || '',
            phone: prioritizedPhoneNumber,
        },
    });

    const savedAddresses = getAddressBookFromCustomer(customerProfile);
    const hasSavedAddresses = savedAddresses.length > 0;
    const defaultSelectedId = savedAddresses.find((a) => a.preferred)?.id ?? savedAddresses[0]?.id ?? '';
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const effectiveSelectedId = selectedAddressId ?? defaultSelectedId;

    const handleFormSubmit = (data: ShippingAddressData) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value) {
                formData.append(key, value);
            }
        });
        onSubmit(formData);
    };

    const handleSavedAddressSubmit = () => {
        const address = savedAddresses.find((a) => a.id === effectiveSelectedId);
        if (!address) return;
        const formData = addressToFormData(address);
        onSubmit(formData);
    };

    // For single page layout, always show the component but in collapsed state when not editing
    // The ToggleCard will handle the collapsed/expanded state based on editing prop

    const stepTitle = <span className="text-lg font-semibold text-foreground">{t('shippingAddress.title')}</span>;

    return (
        <ToggleCard
            id="shipping-address"
            // @ts-expect-error CardTitle accepts ReactNode; strict downstream type excludes null
            title={stepTitle as React.ReactNode}
            editing={isEditing}
            onEdit={onEdit}
            editLabel={t('common.edit')}
            // @sfdc-extension-block-start SFDC_EXT_MULTISHIP
            editAction={enableMultiAddress ? tMultiship('checkout.deliverToMultipleAddresses') : undefined}
            onEditActionClick={enableMultiAddress ? handleToggleShippingAddressMode : undefined}
            // @sfdc-extension-block-end SFDC_EXT_MULTISHIP
            isLoading={isLoading}>
            <ToggleCardEdit>
                {hasSavedAddresses ? (
                    <div className="space-y-6">
                        {shippingFormError && <CheckoutErrorBanner message={shippingFormError} />}
                        {actionData?.fieldErrors && (
                            <div className="space-y-2">
                                {Object.entries(actionData.fieldErrors).map(([field, error]) => (
                                    <CheckoutErrorBanner key={field} message={error} />
                                ))}
                            </div>
                        )}
                        <SavedAddressesList
                            addresses={savedAddresses}
                            value={effectiveSelectedId}
                            onValueChange={setSelectedAddressId}
                        />
                        <div className="flex justify-end pt-4">
                            <Button
                                type="button"
                                disabled={isLoading}
                                size="lg"
                                className="min-w-56 h-12 text-base font-semibold"
                                onClick={handleSavedAddressSubmit}>
                                {isLoading ? t('common.submitting') : t('shippingAddress.continue')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={(e) => void form.handleSubmit(handleFormSubmit)(e)} className="space-y-6">
                            {shippingFormError && <CheckoutErrorBanner message={shippingFormError} />}
                            {actionData?.fieldErrors && (
                                <div className="space-y-2">
                                    {Object.entries(actionData.fieldErrors).map(([field, error]) => (
                                        <CheckoutErrorBanner key={field} message={error} />
                                    ))}
                                </div>
                            )}
                            <AddressFormFields form={form} showPhone={true} autoFocus={isEditing} countryCode="US" />
                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    size="lg"
                                    className="min-w-56 h-12 text-base font-semibold">
                                    {isLoading ? t('common.submitting') : t('shippingAddress.continue')}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="space-y-2">
                    <ShippingAddressDisplay address={shippingAddress} />
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
