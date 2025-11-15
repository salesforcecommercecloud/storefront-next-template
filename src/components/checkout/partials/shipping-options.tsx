import { type FormEvent, useEffect, useMemo, useRef } from 'react';
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
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';

interface ShippingMethod {
    id: string;
    name: string;
    description?: string;
    price: number;
    estimatedArrivalTime?: string;
}

interface ShippingOptionsProps {
    onSubmit: (formData: FormData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    shippingMethods?: ShopperBasketsV2.schemas['ShippingMethodResult'];
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

    const availableShippingMethods: ShippingMethod[] = useMemo(
        () =>
            shippingMethods?.applicableShippingMethods
                ?.filter(
                    (method) => method.id && method.name && typeof method.price === 'number' && !isNaN(method.price)
                )
                .map((method) => ({
                    id: method.id,
                    name: method.name,
                    description: method.description,
                    price: method.price,
                    estimatedArrivalTime: method.estimatedArrivalTime,
                })) || [],
        [shippingMethods?.applicableShippingMethods]
    );

    const selectedMethod = cart?.shipments?.[0]?.shippingMethod;

    const defaultShippingMethodId = getDefaultShippingMethod(
        availableShippingMethods,
        selectedMethod,
        shippingMethods?.defaultShippingMethodId
    );

    // Track if we've already auto-submitted to prevent infinite loops
    const hasAutoSubmitted = useRef(false);

    // Auto-apply default shipping method for returning customers only
    // Guest users should always see and choose shipping options manually
    useEffect(() => {
        if (
            isEditing &&
            !selectedMethod?.id &&
            customerProfile &&
            availableShippingMethods.length > 0 &&
            !hasAutoSubmitted.current &&
            !isLoading
        ) {
            hasAutoSubmitted.current = true;

            const isDefaultValid =
                defaultShippingMethodId &&
                availableShippingMethods.some((method) => method.id === defaultShippingMethodId);
            const methodIdToSubmit = isDefaultValid ? defaultShippingMethodId : availableShippingMethods[0]?.id;

            if (methodIdToSubmit) {
                const formData = new FormData();
                formData.append('shippingMethodId', methodIdToSubmit);
                onSubmit(formData);
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
        defaultShippingMethodId,
        onSubmit,
        isLoading,
        customerProfile,
        availableShippingMethods,
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
                                            <div className="space-y-1">
                                                {method.estimatedArrivalTime && (
                                                    <Typography variant="small" className="text-muted-foreground">
                                                        {uiStrings.checkout.shippingOptions.arrives.replace(
                                                            '{estimatedArrivalTime}',
                                                            method.estimatedArrivalTime
                                                        )}
                                                    </Typography>
                                                )}
                                                <Typography variant="small" className="text-muted-foreground">
                                                    {uiStrings.checkout.shippingOptions.priceAndMethod
                                                        .replace(
                                                            '{price}',
                                                            method.price === 0
                                                                ? uiStrings.checkout.shippingOptions.free
                                                                : `$${method.price.toFixed(2)}`
                                                        )
                                                        .replace('{methodName}', method.name)}
                                                </Typography>
                                                {method.description && (
                                                    <Typography variant="small" className="text-muted-foreground">
                                                        {method.description}
                                                    </Typography>
                                                )}
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
                        <div className="space-y-1">
                            {selectedMethod.estimatedArrivalTime && (
                                <Typography variant="small" className="text-muted-foreground">
                                    {uiStrings.checkout.shippingOptions.arrives.replace(
                                        '{estimatedArrivalTime}',
                                        selectedMethod.estimatedArrivalTime
                                    )}
                                </Typography>
                            )}
                            <Typography variant="small" className="text-muted-foreground">
                                {uiStrings.checkout.shippingOptions.priceAndMethod
                                    .replace(
                                        '{price}',
                                        selectedMethod.price === 0
                                            ? uiStrings.checkout.shippingOptions.free
                                            : `$${(selectedMethod.price ?? 0).toFixed(2)}`
                                    )
                                    .replace('{methodName}', selectedMethod.name || '')}
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
