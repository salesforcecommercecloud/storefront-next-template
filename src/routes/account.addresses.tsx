import { type ReactElement, Suspense, useState } from 'react';
import { useOutletContext, Await } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import AddressCard from '@/components/address-card';
import { AccountAddressesSkeleton } from '@/components/account-addresses-skeleton';
import { RemoveAddressConfirmationDialog } from '@/components/remove-address-confirmation-dialog';
import { useAuth } from '@/providers/auth';
import uiStrings from '@/temp-ui-string';
import type { ShopperCustomersTypes } from 'commerce-sdk-isomorphic';

type AccountLayoutContext = {
    customer: Promise<ShopperCustomersTypes.Customer | null>;
};

/**
 * Account addresses content component that renders when customer data is loaded.
 * This component receives the resolved customer data and displays all addresses.
 */
function AccountAddressesContent({ customer }: { customer: ShopperCustomersTypes.Customer | null }): ReactElement {
    const addresses = customer?.addresses || [];
    const auth = useAuth();
    const customerId = auth?.customer_id;
    const [addressToRemove, setAddressToRemove] = useState<string | null>(null);

    const handleEdit = (addressId?: string) => {
        // TODO: Implement edit functionality
        // eslint-disable-next-line no-console
        console.log('Edit address:', addressId);
    };

    const handleRemove = (addressId?: string) => {
        if (addressId) {
            setAddressToRemove(addressId);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                    {uiStrings.account.navigation.addresses}
                </h1>
            </div>

            {/* Addresses Content */}
            {addresses.length === 0 ? (
                <Card className="border-border">
                    <CardContent className="p-6">
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">{uiStrings.account.addresses.empty}</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {addresses.map((address) => (
                        <AddressCard
                            key={address.addressId || `address-${addresses.indexOf(address)}`}
                            address={address}
                            onEdit={() => handleEdit(address.addressId)}
                            onRemove={() => handleRemove(address.addressId)}
                            isPreferred={address.preferred || false}
                        />
                    ))}
                </div>
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
                {(customer: ShopperCustomersTypes.Customer | null) => <AccountAddressesContent customer={customer} />}
            </Await>
        </Suspense>
    );
}
