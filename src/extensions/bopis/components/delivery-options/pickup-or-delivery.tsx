/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DELIVERY_OPTIONS, type DeliveryOption } from '@/extensions/bopis/constants';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import { getStoreName } from '@/extensions/bopis/lib/store-utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';

interface PickupOrDeliveryProps {
    /** Current selected delivery option */
    value?: DeliveryOption;
    /** Callback function when delivery option changes */
    onChange?: (value: DeliveryOption) => void;
    /** Whether pickup option is disabled */
    isPickupDisabled?: boolean;
    /** The pickup store for basket items, if pickup option is selected. */
    pickupStore?: SelectedStoreInfo | null;
    /** Whether delivery option is disabled */
    isDeliveryDisabled?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * PickupOrDelivery component that allows users to choose between shipping and pickup options
 *
 * @param props - The component props
 * @returns A React element representing the pickup or delivery selection
 *
 * @example
 * ```tsx
 * <PickupOrDelivery
 *   value={DELIVERY_OPTIONS.DELIVERY}
 *   onChange={(value) => setDeliveryOption(value)}
 *   isPickupDisabled={!hasStoreInventory}
 *   pickupStore={pickupStore}
 *   isDeliveryDisabled={isSiteOutOfStock}
 * />
 * ```
 */
export default function PickupOrDelivery({
    value = DELIVERY_OPTIONS.DELIVERY,
    onChange,
    isPickupDisabled = false,
    pickupStore,
    isDeliveryDisabled = false,
    className,
}: PickupOrDeliveryProps): ReactElement {
    const { t } = useTranslation('extBopis');
    const handleValueChange = (newValue: string) => {
        if (onChange && (newValue === DELIVERY_OPTIONS.DELIVERY || newValue === DELIVERY_OPTIONS.PICKUP)) {
            onChange(newValue as DeliveryOption);
        }
    };
    const openStoreLocator = useStoreLocator((state) => state.open);

    // Memoize storeSelectiontText for performance
    const storeSelectiontText = useMemo(() => {
        if (pickupStore) {
            return getStoreName(pickupStore);
        } else {
            // If no pickup store is selected, use the 'selectStore' prompt
            return t('deliveryOptions.pickupOrDelivery.selectStore');
        }
    }, [pickupStore, t]);

    return (
        <div className={cn('space-y-3', className)}>
            <RadioGroup
                value={value}
                onValueChange={handleValueChange}
                className="space-y-3"
                data-testid="delivery-option-select">
                {/* Delivery Option */}
                <div className="flex items-start space-x-2">
                    <RadioGroupItem
                        value={DELIVERY_OPTIONS.DELIVERY}
                        id="delivery-option"
                        disabled={isDeliveryDisabled}
                    />
                    <Label
                        htmlFor="delivery-option"
                        className={cn(
                            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                            isDeliveryDisabled && 'opacity-50 cursor-not-allowed'
                        )}>
                        {t('deliveryOptions.pickupOrDelivery.shipToAddress')}
                    </Label>
                </div>
                {/* Pickup Option */}
                <div className="flex items-start space-x-2">
                    <RadioGroupItem value={DELIVERY_OPTIONS.PICKUP} id="pickup-option" disabled={isPickupDisabled} />
                    <div className="flex flex-col">
                        {/* Pickup Label */}
                        <div className="flex items-center space-x-1">
                            <Label
                                htmlFor="pickup-option"
                                className={cn(
                                    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                                    isPickupDisabled && 'opacity-50 cursor-not-allowed'
                                )}>
                                {!isPickupDisabled
                                    ? t('deliveryOptions.pickupOrDelivery.pickUpInStore')
                                    : t('deliveryOptions.pickupOrDelivery.unavailablePickUpIn')}
                            </Label>
                            {/* Store Name */}
                            <div className="text-sm">
                                <p>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            openStoreLocator();
                                        }}
                                        className="text-primary underline hover:text-primary/80 cursor-pointer">
                                        {storeSelectiontText}
                                    </button>
                                </p>
                            </div>
                        </div>
                        {/* Stock message - Render only if a store is selected (pickupStore is truthy) */}
                        {pickupStore &&
                            (!isPickupDisabled ? (
                                <span className="text-sm font-normal select-none text-muted-foreground mt-1">
                                    {t('deliveryOptions.pickupOrDelivery.inStockAtStore')}
                                </span>
                            ) : (
                                <span className="text-sm font-normal select-none text-destructive opacity-50 mt-1">
                                    {t('deliveryOptions.pickupOrDelivery.outOfStockAtStore')}
                                </span>
                            ))}
                    </div>
                </div>
            </RadioGroup>
        </div>
    );
}
