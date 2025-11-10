/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { type ReactElement } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import uiStringsBopis from '@/extensions/bopis/temp-ui-string-bopis';
import { DELIVERY_OPTIONS, type DeliveryOption } from '@/extensions/bopis/constants';

interface PickupOrDeliveryProps {
    /** Current selected delivery option */
    value?: DeliveryOption;
    /** Callback function when delivery option changes */
    onChange?: (value: DeliveryOption) => void;
    /** Whether pickup option is disabled */
    isPickupDisabled?: boolean;
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
 *   isDeliveryDisabled={isSiteOutOfStock}
 * />
 * ```
 */
export default function PickupOrDelivery({
    value = DELIVERY_OPTIONS.DELIVERY,
    onChange,
    isPickupDisabled = false,
    isDeliveryDisabled = false,
    className,
}: PickupOrDeliveryProps): ReactElement {
    const handleValueChange = (newValue: string) => {
        if (onChange && (newValue === DELIVERY_OPTIONS.DELIVERY || newValue === DELIVERY_OPTIONS.PICKUP)) {
            onChange(newValue as DeliveryOption);
        }
    };

    return (
        <div className={cn('space-y-3', className)}>
            <RadioGroup
                value={value}
                onValueChange={handleValueChange}
                className="space-y-3"
                data-testid="delivery-option-select">
                <div className="flex items-center space-x-2">
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
                        {uiStringsBopis.deliveryOptions.pickupOrDelivery.shipToAddress}
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value={DELIVERY_OPTIONS.PICKUP} id="pickup-option" disabled={isPickupDisabled} />
                    <Label
                        htmlFor="pickup-option"
                        className={cn(
                            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                            isPickupDisabled && 'opacity-50 cursor-not-allowed'
                        )}>
                        {uiStringsBopis.deliveryOptions.pickupOrDelivery.pickUpInStore}
                    </Label>
                </div>
            </RadioGroup>
        </div>
    );
}
