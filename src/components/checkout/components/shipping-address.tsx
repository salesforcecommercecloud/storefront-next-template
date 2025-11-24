import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/typography';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useBasket } from '@/providers/basket';
import { shippingAddressSchema, type ShippingAddressData } from '@/lib/checkout-schemas';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getShippingAddressFromCustomer } from '@/lib/customer-profile-utils';
import uiStrings from '@/temp-ui-string';
import type { CheckoutActionData } from '../types';
import type { ReactNode } from 'react';

interface ShippingAddressProps {
    onSubmit: (formData: FormData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    // Step state managed by container
    isCompleted: boolean;
    isEditing: boolean;
    onEdit: () => void;
}

export default function ShippingAddress({
    onSubmit,
    isLoading,
    actionData,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
}: ShippingAddressProps) {
    const cart = useBasket();
    const customerProfile = useCustomerProfile();

    const shippingAddress = cart?.shipments?.[0]?.shippingAddress;

    // Get auto-populated shipping address from customer profile
    const customerShippingAddress = getShippingAddressFromCustomer(customerProfile);

    // Get phone from contact info (prioritize this for auto-population)
    const contactInfoPhone = cart?.customerInfo?.phone;

    const form = useForm<ShippingAddressData>({
        resolver: zodResolver(shippingAddressSchema),
        defaultValues: {
            firstName: shippingAddress?.firstName || customerShippingAddress.firstName || '',
            lastName: shippingAddress?.lastName || customerShippingAddress.lastName || '',
            address1: shippingAddress?.address1 || customerShippingAddress.address1 || '',
            address2: shippingAddress?.address2 || customerShippingAddress.address2 || '',
            city: shippingAddress?.city || customerShippingAddress.city || '',
            stateCode: shippingAddress?.stateCode || customerShippingAddress.stateCode || '',
            postalCode: shippingAddress?.postalCode || customerShippingAddress.postalCode || '',
            // Phone priority: saved shipping phone > contact info phone > customer profile phone
            phone: shippingAddress?.phone || contactInfoPhone || customerShippingAddress.phone || '',
        },
    });

    const handleFormSubmit = (data: ShippingAddressData) => {
        // Convert typed data to FormData for the action route
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value) {
                formData.append(key, value);
            }
        });
        onSubmit(formData);
    };

    // For single page layout, always show the component but in collapsed state when not editing
    // The ToggleCard will handle the collapsed/expanded state based on editing prop

    const stepTitle: ReactNode = (
        <span className="text-lg font-semibold text-foreground">{uiStrings.checkout.shippingAddress.title}</span>
    );

    return (
        <ToggleCard
            id="shipping-address"
            title={stepTitle as React.ReactNode}
            editing={isEditing}
            onEdit={onEdit}
            editLabel={uiStrings.checkout.common.edit}
            isLoading={isLoading}>
            <ToggleCardEdit>
                <Form {...form}>
                    <form onSubmit={(e) => void form.handleSubmit(handleFormSubmit)(e)} className="space-y-6">
                        {actionData?.fieldErrors && (
                            <div className="space-y-2">
                                {Object.entries(actionData.fieldErrors).map(([field, error]) => (
                                    <div
                                        key={field}
                                        className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-xl font-bold">
                                        {error}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                            {uiStrings.checkout.shippingAddress.firstNameLabel}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={uiStrings.checkout.shippingAddress.firstNamePlaceholder}
                                                autoComplete="given-name"
                                                autoFocus={isEditing}
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
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                            {uiStrings.checkout.shippingAddress.lastNameLabel}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={uiStrings.checkout.shippingAddress.lastNamePlaceholder}
                                                autoComplete="family-name"
                                                className="h-12 text-base border-2 focus:border-primary transition-colors"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xl font-bold" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address1"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                        {uiStrings.checkout.shippingAddress.addressLabel}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={uiStrings.checkout.shippingAddress.addressPlaceholder}
                                            autoComplete="address-line1"
                                            className="h-12 text-base border-2 focus:border-primary transition-colors"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address2"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                        {uiStrings.checkout.shippingAddress.address2Label}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={uiStrings.checkout.shippingAddress.address2Placeholder}
                                            autoComplete="address-line2"
                                            className="h-12 text-base border-2 focus:border-primary transition-colors"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                            {uiStrings.checkout.shippingAddress.cityLabel}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={uiStrings.checkout.shippingAddress.cityPlaceholder}
                                                autoComplete="address-level2"
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
                                name="stateCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                            {uiStrings.checkout.shippingAddress.stateLabel}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={uiStrings.checkout.shippingAddress.statePlaceholder}
                                                autoComplete="address-level1"
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
                                name="postalCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                            {uiStrings.checkout.shippingAddress.zipLabel}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={uiStrings.checkout.shippingAddress.zipPlaceholder}
                                                autoComplete="postal-code"
                                                className="h-12 text-base border-2 focus:border-primary transition-colors"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xl font-bold" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                        {uiStrings.checkout.shippingAddress.phoneLabel}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="tel"
                                            placeholder={uiStrings.checkout.shippingAddress.phonePlaceholder}
                                            autoComplete="tel"
                                            className="h-12 text-base border-2 focus:border-primary transition-colors"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                size="lg"
                                className="min-w-56 h-12 text-base font-semibold">
                                {isLoading
                                    ? uiStrings.checkout.common.submitting
                                    : uiStrings.checkout.shippingAddress.continue}
                            </Button>
                        </div>
                    </form>
                </Form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="space-y-3">
                    {shippingAddress ? (
                        <div className="rounded-lg p-3 space-y-2 bg-muted/50">
                            <Typography variant="p" className="font-medium">
                                {shippingAddress.firstName} {shippingAddress.lastName}
                            </Typography>
                            <Typography variant="p" className="text-muted-foreground">
                                {shippingAddress.address1}
                                {shippingAddress.address2 && (
                                    <>
                                        <br />
                                        {shippingAddress.address2}
                                    </>
                                )}
                                <br />
                                {shippingAddress.city}
                                {shippingAddress.stateCode && `, ${shippingAddress.stateCode}`}{' '}
                                {shippingAddress.postalCode}
                                {shippingAddress.phone && (
                                    <>
                                        <br />
                                        {shippingAddress.phone}
                                    </>
                                )}
                            </Typography>
                        </div>
                    ) : (
                        <div className="rounded-lg p-3 space-y-2 bg-muted/50">
                            <Typography variant="p" className="text-muted-foreground">
                                {uiStrings.checkout.shippingAddress.notProvided}
                            </Typography>
                        </div>
                    )}
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
