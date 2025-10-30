import { type FormEvent, useEffect, useRef } from 'react';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Typography } from '@/components/typography';
import { useBasket } from '@/providers/basket';
import uiStrings from '@/temp-ui-string';
import { getDefaultShippingMethod } from '@/lib/customer-profile-utils';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import type { CheckoutActionData } from '../types';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';

// Extended Commerce Cloud shipping method type to include potential default indicators
interface ExtendedShippingMethod extends ShopperBasketsTypes.ShippingMethod {
    default?: boolean;
    preferred?: boolean;
}

interface ShippingMethod {
    id: string;
    name: string;
    description: string;
    price: number;
    estimatedArrival: string;
    default?: boolean; // Commerce Cloud default indicator
    preferred?: boolean; // Alternative property name
}

interface ShippingOptionsProps {
    onSubmit: (formData: FormData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    shippingMethods?: ShopperBasketsTypes.ShippingMethodResult;
    // Step state managed by container
    isCompleted: boolean;
    isEditing: boolean;
    onEdit: () => void;
}

export default function ShippingOptions({
    onSubmit,
    isLoading,
    actionData,
    shippingMethods,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
}: ShippingOptionsProps) {
    const cart = useBasket();
    const customerProfile = useCustomerProfile();

    const availableShippingMethods: ShippingMethod[] =
        shippingMethods?.applicableShippingMethods?.map((method) => {
            const extendedMethod = method as ExtendedShippingMethod;
            return {
                id: extendedMethod.id || 'unknown',
                name: extendedMethod.name || 'Unknown Method',
                description: extendedMethod.description || '',
                price: extendedMethod.price || 0,
                estimatedArrival: extendedMethod.estimatedArrivalTime || '',
                // Include default/preferred properties if available from Commerce Cloud
                default: extendedMethod.default,
                preferred: extendedMethod.preferred,
            };
        }) || [];

    const selectedMethod = cart?.shipments?.[0]?.shippingMethod;

    // Determine the default shipping method to auto-select
    const defaultShippingMethodId = getDefaultShippingMethod(availableShippingMethods, selectedMethod);

    // Track if we've already auto-submitted to prevent infinite loops
    const hasAutoSubmitted = useRef(false);

    // Auto-apply default shipping method for returning customers only
    // Guest users should always see and choose shipping options manually
    useEffect(() => {
        if (
            isEditing && // Only when user is on this step
            !selectedMethod?.id && // No method currently selected
            customerProfile && // Only for returning customers with profiles
            shippingMethods?.applicableShippingMethods && // We have real Commerce Cloud data
            shippingMethods.applicableShippingMethods.length > 0 && // We have shipping methods available
            !hasAutoSubmitted.current && // Haven't auto-submitted yet
            !isLoading // Not currently processing
        ) {
            hasAutoSubmitted.current = true;

            // Auto-submit the first available method from Commerce Cloud for returning customers
            const firstMethodId = shippingMethods.applicableShippingMethods[0].id;
            if (firstMethodId) {
                const formData = new FormData();
                formData.append('shippingMethodId', firstMethodId);

                // Small delay to ensure component is fully rendered
                const timeoutId = setTimeout(() => {
                    onSubmit(formData);
                }, 100);

                return () => clearTimeout(timeoutId);
            }
        }

        // Reset auto-submit flag when user moves away from this step
        if (!isEditing) {
            hasAutoSubmitted.current = false;
        }
    }, [
        isEditing,
        selectedMethod?.id,
        shippingMethods?.applicableShippingMethods,
        onSubmit,
        isLoading,
        customerProfile,
    ]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmit(formData);
    };

    // For single page layout, always show the component but in collapsed state when not editing
    // The ToggleCard will handle the collapsed/expanded state based on editing prop

    const stepTitle = (
        <span className="text-lg font-semibold text-foreground">{uiStrings.checkout.shippingOptions.title}</span>
    );

    return (
        <ToggleCard
            id="shipping-options"
            title={stepTitle as React.ReactNode}
            editing={isEditing}
            onEdit={onEdit}
            editLabel="Edit"
            isLoading={isLoading}>
            <ToggleCardEdit>
                <form method="post" className="space-y-6" onSubmit={handleSubmit}>
                    {actionData?.formError && actionData.step === 'shippingOptions' && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
                            {actionData.formError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <Typography variant="small" className="text-muted-foreground">
                            Select your preferred shipping method
                        </Typography>

                        {availableShippingMethods.length > 0 ? (
                            <RadioGroup
                                name="shippingMethodId"
                                defaultValue={selectedMethod?.id || defaultShippingMethodId || ''}
                                required>
                                {availableShippingMethods.map((method) => (
                                    <div
                                        key={method.id}
                                        className="flex items-center space-x-4 p-4 border-2 rounded-lg transition-all duration-200 hover:border-primary/50 hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:shadow-md">
                                        <RadioGroupItem
                                            value={method.id}
                                            id={method.id}
                                            className="w-5 h-5"
                                            autoFocus={isEditing && availableShippingMethods.indexOf(method) === 0}
                                        />
                                        <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Typography variant="p" className="font-medium">
                                                        {method.name}
                                                    </Typography>
                                                </div>
                                                <div className="flex justify-between items-center gap-4">
                                                    <Typography variant="small" className="text-muted-foreground">
                                                        {method.description}
                                                    </Typography>
                                                    <Typography
                                                        variant="small"
                                                        className="text-muted-foreground font-medium">
                                                        {method.price === 0 ? 'Free' : `$${method.price.toFixed(2)}`}
                                                    </Typography>
                                                </div>
                                            </div>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        ) : (
                            <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg">
                                <div className="text-center space-y-2">
                                    <Typography variant="p" className="text-muted-foreground">
                                        No shipping methods available
                                    </Typography>
                                    <Typography variant="small" className="text-muted-foreground">
                                        Please ensure your shipping address is complete and try again.
                                    </Typography>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={isLoading || availableShippingMethods.length === 0}
                            size="lg"
                            className="min-w-48">
                            {isLoading
                                ? uiStrings.checkout.shippingOptions.saving
                                : availableShippingMethods.length === 0
                                  ? 'No shipping methods available'
                                  : uiStrings.checkout.shippingOptions.continue}
                        </Button>
                    </div>
                </form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="space-y-2">
                    <Typography variant="small" className="text-muted-foreground">
                        Shipping Method
                    </Typography>
                    {selectedMethod ? (
                        <div>
                            <Typography variant="p" className="font-medium">
                                {selectedMethod.name}
                            </Typography>
                            <Typography variant="small" className="text-muted-foreground">
                                {selectedMethod.price === 0 ? 'Free' : `$${(selectedMethod.price ?? 0).toFixed(2)}`}
                            </Typography>
                        </div>
                    ) : (
                        <Typography variant="p" className="text-muted-foreground">
                            {uiStrings.checkout.shippingOptions.enterAddressFirst}
                        </Typography>
                    )}
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
