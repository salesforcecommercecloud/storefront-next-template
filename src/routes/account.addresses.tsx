// React core
import { type ReactElement, Fragment, Suspense, useState } from 'react';
import { useOutletContext, Await } from 'react-router';

// Third-party libraries
import { MapPin } from 'lucide-react';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

// UI components
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import AddressCard from '@/components/address-card';
import { AccountAddressesSkeleton } from '@/components/account-addresses-skeleton';
import { CustomerAddressForm, type CustomerAddressFormData } from '@/components/customer-address-form';
import { RemoveAddressConfirmationDialog } from '@/components/remove-address-confirmation-dialog';
import { useToast } from '@/components/toast';

// Hooks
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';

// Providers
import { useAuth } from '@/providers/auth';

type AccountLayoutContext = {
    customer: Promise<ShopperCustomers.schemas['Customer'] | null>;
};

type EditingAddressId = string | null;
const NEW_ADDRESS_ID = 'new' as const;

/**
 * Arrow indicator component that points from an address card to its edit form
 */
function EditIndicator(): ReactElement {
    return (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <svg className="w-6 h-[26px] text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 17l6-8 6 8z" />
            </svg>
        </div>
    );
}

/**
 * Account addresses content component that renders when customer data is loaded.
 * This component receives the resolved customer data and displays all addresses.
 */
function AccountAddressesContent({
    customer,
}: {
    customer: ShopperCustomers.schemas['Customer'] | null;
}): ReactElement {
    const { t } = useTranslation('account');

    const addresses = customer?.addresses || [];
    const { addToast } = useToast();
    const auth = useAuth();
    const customerId = auth?.customer_id;
    const [addressToRemove, setAddressToRemove] = useState<string | null>(null);
    const [editingAddressId, setEditingAddressId] = useState<EditingAddressId>(null);

    // Create fetcher for creating customer address
    const createAddressFetcher = useScapiFetcher('shopperCustomers', 'createCustomerAddress', {
        params: {
            path: {
                customerId: customerId || '',
            },
        },
        body: {} as ShopperCustomers.schemas['CustomerAddress'],
    });

    // Create fetcher for updating customer address
    // We'll dynamically update the parameters when editing as you cannot update the addressName
    // at the time of the submit call.
    // NOTE: When updating the addressName, the API response will be a 301 redirect which causes the browser
    // to make an additional PATCH request to the new resource which will always fail. I believe this is a bug in the API
    // and that the 301 was incorrectly returned.
    const [updateAddressName, setUpdateAddressName] = useState<string>('');
    const updateAddressFetcher = useScapiFetcher('shopperCustomers', 'updateCustomerAddress', {
        params: {
            path: {
                customerId: customerId || '',
                addressName: updateAddressName,
            },
        },
        body: {} as ShopperCustomers.schemas['CustomerAddress'],
    });

    const handleAdd = () => {
        // Clear any existing editing state and switch to "Add Address" mode
        setEditingAddressId(NEW_ADDRESS_ID);
    };

    const handleEdit = (addressId?: string) => {
        if (!addressId) return;
        setEditingAddressId(addressId);
    };

    const handleCancel = () => {
        setEditingAddressId(null);
    };

    const handleRemove = (addressId?: string) => {
        if (addressId) {
            setAddressToRemove(addressId);
        }
    };

    // Handle successful address creation
    useScapiFetcherEffect(createAddressFetcher, {
        onSuccess: () => {
            addToast(t('addresses.addSuccess'), 'success');
            setEditingAddressId(null);
        },
        onError: (errors) => {
            const errorMessage = errors?.length > 0 ? errors.join(', ') : t('addresses.addError');
            addToast(errorMessage, 'error');
        },
    });

    // Handle successful address update
    useScapiFetcherEffect(updateAddressFetcher, {
        onSuccess: () => {
            addToast(t('addresses.updateSuccess'), 'success');
            setEditingAddressId(null);
            setUpdateAddressName('');
        },
        onError: (errors) => {
            const errorMessage = errors?.length > 0 ? errors.join(', ') : t('addresses.updateError');
            addToast(errorMessage, 'error');
        },
    });

    // Get the address being edited
    const editingAddress =
        editingAddressId && editingAddressId !== NEW_ADDRESS_ID
            ? addresses.find((addr) => addr.addressId === editingAddressId)
            : null;

    // Determine which fetcher to use based on whether we're creating or updating
    const addressFetcher = editingAddressId === NEW_ADDRESS_ID ? createAddressFetcher : updateAddressFetcher;

    const hasAddresses = addresses.length > 0;
    const isEditingAnyAddress = editingAddressId !== null;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                    {t('navigation.addresses')}
                </h1>
            </div>

            {/* No Saved Addresses Empty State */}
            {!hasAddresses && !isEditingAnyAddress && (
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-8 text-center">
                        <div className="space-y-6">
                            {/* Location Icon */}
                            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <MapPin className="w-8 h-8 text-muted-foreground" />
                            </div>

                            {/* Empty State Message */}
                            <div className="space-y-2">
                                <Typography variant="h2" as="h2" className="text-xl font-semibold text-foreground">
                                    {t('addresses.noSavedAddresses')}
                                </Typography>
                                <p className="text-muted-foreground">{t('addresses.empty')}</p>
                            </div>

                            {/* Add Address Button */}
                            <Button onClick={handleAdd} className="w-full">
                                {t('addresses.addAddress')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Addresses Content */}
            {hasAddresses && (
                <div className="grid grid-flow-dense grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Add Address Button */}
                    <div className="relative">
                        <Card className="border-border gap-0 py-2 h-full flex flex-col">
                            <div className="flex-1 flex items-center justify-center">
                                <Button
                                    onClick={handleAdd}
                                    variant="link"
                                    className="w-full h-full min-h-[200px] flex items-center justify-center gap-2 font-bold">
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    <span className="text-sm font-medium">{t('addresses.addAddress')}</span>
                                </Button>
                            </div>
                        </Card>
                        {/* Indicator pointing to add address card when editing */}
                        {editingAddressId === NEW_ADDRESS_ID && <EditIndicator />}
                    </div>

                    {/* Form for "Add Address" - spans all columns when editing */}
                    {editingAddressId === NEW_ADDRESS_ID && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <Card className="border-2 border-primary">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">{t('addresses.addAddress')}</h3>
                                    <CustomerAddressForm
                                        key={NEW_ADDRESS_ID}
                                        initialData={undefined}
                                        updateFetcher={addressFetcher}
                                        onSuccess={(_formData: CustomerAddressFormData) => {
                                            // Success is handled by useScapiFetcherEffect
                                        }}
                                        onError={(_error: string) => {
                                            // Error is handled by useScapiFetcherEffect
                                        }}
                                        onCancel={handleCancel}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Existing Address Cards */}
                    {addresses.map((address) => {
                        const isEditing = editingAddressId === address.addressId;

                        return (
                            <Fragment key={address.addressId}>
                                <div className="relative">
                                    <AddressCard
                                        address={address}
                                        onEdit={() => handleEdit(address.addressId)}
                                        onRemove={() => handleRemove(address.addressId)}
                                        isPreferred={address.preferred || false}
                                    />
                                    {/* Indicator pointing to address card being edited */}
                                    {isEditing && <EditIndicator />}
                                </div>

                                {/* Form for editing this address - spans all columns */}
                                {isEditing && (
                                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                        <Card className="border-2 border-primary">
                                            <CardContent className="p-6">
                                                <h3 className="text-lg font-semibold mb-4">
                                                    {t('addresses.editAddress')}
                                                </h3>
                                                <CustomerAddressForm
                                                    key={address.addressId}
                                                    initialData={{
                                                        addressId: editingAddress?.addressId,
                                                        firstName: editingAddress?.firstName || '',
                                                        lastName: editingAddress?.lastName || '',
                                                        phone: editingAddress?.phone || '',
                                                        countryCode:
                                                            (editingAddress?.countryCode as 'US' | 'CA') || 'US',
                                                        address1: editingAddress?.address1 || '',
                                                        city: editingAddress?.city || '',
                                                        stateCode: editingAddress?.stateCode || '',
                                                        postalCode: editingAddress?.postalCode || '',
                                                        preferred: editingAddress?.preferred || false,
                                                    }}
                                                    updateFetcher={addressFetcher}
                                                    onSuccess={(_formData: CustomerAddressFormData) => {
                                                        // Success is handled by useScapiFetcherEffect
                                                    }}
                                                    onError={(_error: string) => {
                                                        // Error is handled by useScapiFetcherEffect
                                                    }}
                                                    onCancel={handleCancel}
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}
                </div>
            )}

            {/* Show Add Address form when no addresses and editing */}
            {!hasAddresses && isEditingAnyAddress && editingAddressId === NEW_ADDRESS_ID && (
                <Card className="border-2 border-primary max-w-2xl mx-auto">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">{t('addresses.addAddress')}</h3>
                        <CustomerAddressForm
                            key={NEW_ADDRESS_ID}
                            initialData={undefined}
                            updateFetcher={addressFetcher}
                            onSuccess={(_formData: CustomerAddressFormData) => {
                                // Success is handled by useScapiFetcherEffect
                            }}
                            onError={(_error: string) => {
                                // Error is handled by useScapiFetcherEffect
                            }}
                            onCancel={handleCancel}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Remove Confirmation Dialog */}
            {addressToRemove && (
                <RemoveAddressConfirmationDialog
                    open={!!addressToRemove}
                    onOpenChange={(open) => {
                        if (!open) {
                            setAddressToRemove(null);
                        }
                    }}
                    addressId={addressToRemove}
                    customerId={customerId || ''}
                />
            )}
        </div>
    );
}

/**
 * Account addresses page component that uses Await to handle customer data loading.
 * Shows a skeleton while the customer data is being loaded.
 */
export default function AccountAddresses(): ReactElement {
    // Get customer data from parent layout context
    const { customer: customerPromise } = useOutletContext<AccountLayoutContext>();

    return (
        <Suspense fallback={<AccountAddressesSkeleton />}>
            <Await resolve={customerPromise}>
                {(customer: ShopperCustomers.schemas['Customer'] | null) => (
                    <AccountAddressesContent customer={customer} />
                )}
            </Await>
        </Suspense>
    );
}
