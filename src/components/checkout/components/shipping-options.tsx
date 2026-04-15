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
import { type FormEvent, useEffect, useMemo, useRef } from 'react';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Typography } from '@/components/typography';
import { useBasket } from '@/providers/basket';
import { getDefaultShippingMethod } from '@/lib/customer-profile-utils';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import type { CheckoutActionData } from '../types';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import CheckoutErrorBanner from './checkout-error-banner';
import { getCheckoutDisplayError } from './checkout-display-error';
import { useTranslation } from 'react-i18next';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { formatCurrency } from '@/lib/currency';

interface ShippingPromotion {
    calloutMsg?: string;
    promotionId?: string;
    promotionName?: string;
}

interface ShippingMethod {
    id: string;
    name: string;
    description?: string;
    price: number;
    shippingPromotions?: ShippingPromotion[];
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
    const { currency } = useSite();
    const { i18n } = useTranslation();

    const availableShippingMethods: ShippingMethod[] = useMemo(
        () =>
            shippingMethods?.applicableShippingMethods
                ?.filter((method): method is NonNullable<typeof method> & { id: string; name: string; price: number } =>
                    Boolean(method.id && method.name && typeof method.price === 'number' && !Number.isNaN(method.price))
                )
                .map((method) => ({
                    id: method.id,
                    name: method.name,
                    description: method.description,
                    price: method.price,
                    shippingPromotions: method.shippingPromotions,
                })) || [],
        [shippingMethods?.applicableShippingMethods]
    );
    const { t } = useTranslation('checkout');

    const shippingDiscount = useMemo(() => {
        const adjustment = cart?.shippingItems?.[0]?.priceAdjustments?.[0];
        if (!adjustment?.appliedDiscount) return undefined;
        return adjustment.appliedDiscount;
    }, [cart?.shippingItems]);

    const getDiscountedPrice = (basePrice: number): number => {
        if (!shippingDiscount) return basePrice;
        switch (shippingDiscount.type) {
            case 'free':
                return 0;
            case 'percentage':
                return basePrice * (1 - (shippingDiscount.amount ?? 0));
            case 'amount':
                return Math.max(0, basePrice - (shippingDiscount.amount ?? 0));
            case 'fixed_price':
                return shippingDiscount.amount ?? basePrice;
            default:
                return basePrice;
        }
    };

    const selectedMethod = cart?.shipments?.[0]?.shippingMethod;
    // Basket may only have shippingMethod.id after prefill; resolve name/price from applicable methods for summary
    const summaryMethod: ShippingMethod | undefined = useMemo(() => {
        if (!selectedMethod?.id) return undefined;
        const fromList = availableShippingMethods.find((m) => m.id === selectedMethod.id);
        if (fromList) return fromList;
        return {
            id: selectedMethod.id,
            name: selectedMethod.name ?? selectedMethod.id,
            description: selectedMethod.description,
            price: typeof selectedMethod.price === 'number' ? selectedMethod.price : 0,
            shippingPromotions: selectedMethod.shippingPromotions,
        };
    }, [selectedMethod, availableShippingMethods]);
    const isGuest = !customerProfile?.customer?.customerId;
    const hideChangeForGuest = isGuest && !selectedMethod;
    const isUpcomingStep = !isEditing && !selectedMethod;

    const defaultShippingMethodId = getDefaultShippingMethod(
        availableShippingMethods,
        selectedMethod,
        shippingMethods?.defaultShippingMethodId
    );
    const shippingOptionsError = getCheckoutDisplayError(actionData, 'shippingOptions');

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
        <span className="text-2xl font-bold leading-8 tracking-[-0.6px] text-card-foreground">
            {t('shippingOptions.title')}
        </span>
    );

    return (
        <ToggleCard
            id="shipping-options"
            title={stepTitle}
            editing={isEditing}
            disabled={false}
            onEdit={onEdit}
            editLabel={t('common.edit')}
            disableEdit={hideChangeForGuest || isUpcomingStep}
            showHeaderSeparator
            isLoading={isLoading}>
            <ToggleCardEdit>
                {/* Body vertical rhythm: header→content uses ToggleCard gap-4 (16px); no extra pt (Figma Body container 25706:53930). */}
                <form method="post" className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    {shippingOptionsError && <CheckoutErrorBanner message={shippingOptionsError} />}

                    <div className="flex flex-col gap-4">
                        {availableShippingMethods.length > 0 ? (
                            <RadioGroup
                                name="shippingMethodId"
                                defaultValue={selectedMethod?.id || defaultShippingMethodId || ''}
                                required
                                aria-label={t('shippingOptions.title')}
                                className="flex flex-col gap-4">
                                {availableShippingMethods.map((method) => (
                                    <label
                                        key={method.id}
                                        htmlFor={method.id}
                                        className="group flex cursor-pointer flex-col gap-1 rounded-lg border border-border-subtle p-4 transition-all duration-200 has-[[data-state=checked]]:border-foreground">
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem
                                                value={method.id}
                                                id={method.id}
                                                className="shrink-0"
                                                autoFocus={isEditing && availableShippingMethods.indexOf(method) === 0}
                                            />
                                            <span className="flex-1 text-sm font-medium leading-none">
                                                {method.description || method.name}
                                            </span>
                                            <span className="flex shrink-0 items-center gap-1.5">
                                                {method.shippingPromotions?.length && method.price > 0 ? (
                                                    <>
                                                        <span className="text-sm text-muted-foreground line-through">
                                                            {formatCurrency(method.price, i18n.language, currency)}
                                                        </span>
                                                        <span className="text-sm font-semibold leading-none">
                                                            {getDiscountedPrice(method.price) === 0
                                                                ? t('shippingOptions.free')
                                                                : formatCurrency(
                                                                      getDiscountedPrice(method.price),
                                                                      i18n.language,
                                                                      currency
                                                                  )}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-sm font-semibold leading-none">
                                                        {method.price === 0
                                                            ? t('shippingOptions.free')
                                                            : formatCurrency(method.price, i18n.language, currency)}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <span className="pl-6 text-sm text-foreground">{method.name}</span>
                                    </label>
                                ))}
                            </RadioGroup>
                        ) : (
                            <div className="flex justify-center rounded-lg border-2 border-dashed border-muted p-8">
                                <div className="space-y-2 text-center">
                                    <Typography variant="p" className="text-muted-foreground">
                                        {t('shippingOptions.noMethodsAvailable')}
                                    </Typography>
                                    <Typography variant="small" className="text-muted-foreground">
                                        {t('shippingOptions.noMethodsAvailableHelp')}
                                    </Typography>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading || availableShippingMethods.length === 0}
                            className="w-full">
                            {isLoading ? t('shippingOptions.saving') : t('shippingOptions.continue')}
                        </Button>
                    </div>
                </form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                {summaryMethod ? (
                    <div className="space-y-1.5">
                        <div className="space-y-1.5">
                            {summaryMethod.description && (
                                <p className="text-sm font-normal leading-5 text-foreground">
                                    {summaryMethod.description}
                                </p>
                            )}
                            <p className="text-sm font-normal leading-5 text-foreground">
                                {summaryMethod.shippingPromotions?.length && summaryMethod.price > 0 ? (
                                    <>
                                        <span className="text-foreground line-through">
                                            {formatCurrency(summaryMethod.price, i18n.language, currency)}
                                        </span>{' '}
                                        {getDiscountedPrice(summaryMethod.price) === 0
                                            ? t('shippingOptions.free')
                                            : formatCurrency(
                                                  getDiscountedPrice(summaryMethod.price),
                                                  i18n.language,
                                                  currency
                                              )}
                                        {' | '}
                                        {summaryMethod.name}
                                    </>
                                ) : (
                                    t('shippingOptions.priceAndMethod', {
                                        price:
                                            summaryMethod.price === 0
                                                ? t('shippingOptions.free')
                                                : formatCurrency(summaryMethod.price ?? 0, i18n.language, currency),
                                        methodName: summaryMethod.name || '',
                                    })
                                )}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {isGuest ? t('shippingOptions.completePreviousSteps') : t('shippingOptions.enterAddressFirst')}
                    </p>
                )}
            </ToggleCardSummary>
        </ToggleCard>
    );
}
