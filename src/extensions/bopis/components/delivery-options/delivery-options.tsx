/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { type ReactElement, useMemo } from 'react';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import PickupOrDelivery from './pickup-or-delivery';
import { useDeliveryOptions } from '@/extensions/bopis/hooks/use-delivery-options';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import { Typography } from '@/components/typography';
import uiStringsBopis from '@/extensions/bopis/temp-ui-string-bopis';

interface DeliveryOptionsProps {
    /** The product to check inventory for */
    product?: ShopperProductsTypes.Product;
    /** The selected quantity to check inventory against */
    quantity: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * DeliveryOptions component that provides the complete delivery options experience.
 * This includes the pickup/delivery selection and any relevant messaging.
 *
 * @param props - The component props
 * @returns A React element representing the delivery options section
 *
 * @example
 * ```tsx
 * <DeliveryOptions
 *   product={productData}
 *   quantity={2}
 * />
 * ```
 */
export default function DeliveryOptions({ product, quantity, className }: DeliveryOptionsProps): ReactElement | null {
    const { selectedDeliveryOption, isStoreOutOfStock, isSiteOutOfStock, handleDeliveryOptionChange } =
        useDeliveryOptions({ product, quantity });

    // Get store locator state and actions
    const selectedStore = useStoreLocator((state) => state.selectedStoreInfo);
    const openStoreLocator = useStoreLocator((state) => state.open);

    // Calculate display content based on store state (memoized for performance)
    const storeMessage = useMemo(() => {
        if (!selectedStore) {
            return {
                text: uiStringsBopis.deliveryOptions.storeSelection.pickUpIn,
                buttonText: uiStringsBopis.deliveryOptions.storeSelection.selectStore,
            };
        }

        if (isStoreOutOfStock) {
            return {
                text: uiStringsBopis.deliveryOptions.storeSelection.outOfStockAt,
                buttonText: selectedStore.name,
            };
        }

        return {
            text: uiStringsBopis.deliveryOptions.storeSelection.inStockAt,
            buttonText: selectedStore.name,
        };
    }, [selectedStore, isStoreOutOfStock]);

    return (
        <div className={className}>
            <div className="space-y-4">
                <Typography variant="h3" className="text-lg font-semibold">
                    {uiStringsBopis.deliveryOptions.title}
                </Typography>

                <PickupOrDelivery
                    value={selectedDeliveryOption}
                    onChange={handleDeliveryOptionChange}
                    isPickupDisabled={isStoreOutOfStock}
                    isDeliveryDisabled={isSiteOutOfStock}
                />

                {/* Store message - single div with conditional content */}
                <div className="text-sm text-muted-foreground">
                    <p>
                        <strong>{storeMessage.text}</strong>{' '}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                openStoreLocator();
                            }}
                            className="text-primary underline hover:text-primary/80 cursor-pointer">
                            {storeMessage.buttonText}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
