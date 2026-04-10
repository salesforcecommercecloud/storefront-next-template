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
import { type ReactElement, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import StoreAddress from '@/extensions/store-locator/components/store-locator/address';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import { useChangePickupStore } from '@/extensions/bopis/hooks/use-change-pickup-store';

interface CartPickupProps {
    /** Store object containing store information */
    store: ShopperStores.schemas['Store'];
}

/**
 * CartPickup
 *
 * Displays store information for pickup orders on the cart page.
 * Shows store name and address. Provides a "Change Store"
 * button that opens the store locator.
 *
 * @param store - Store object returned by Shopper Stores API
 * @returns ReactElement
 *
 * @example
 * <CartPickup store={store} />
 */
export default function CartPickup({ store }: CartPickupProps): ReactElement {
    const { t } = useTranslation('extBopis');
    const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
    const isStoreLocatorOpen = useStoreLocator((s) => s.isOpen);
    const openStoreLocator = useStoreLocator((s) => s.open);
    const setSelectedStoreInfoRaw = useStoreLocator((s) => s.setSelectedStoreInfo);
    const { changeStore } = useChangePickupStore();

    // Handle "Change Store" button click
    // Set selectedStoreInfo to current store before opening locator
    // This prevents automatic store change when locator opens
    const handleChangeStoreClick = useCallback(() => {
        setSelectedStoreInfoRaw(store);
        openStoreLocator();
    }, [store, setSelectedStoreInfoRaw, openStoreLocator]);

    // Watch for store selection changes from the store locator
    // When store locator global state is opened and a new store is selected,
    // trigger the store change to update the basket.
    // Note: When the store locator is opened from store locator badge,
    // store locator global state is not opened so changeStore will not be called.
    useEffect(() => {
        if (
            selectedStoreInfo &&
            selectedStoreInfo.id !== store.id &&
            selectedStoreInfo.inventoryId &&
            isStoreLocatorOpen
        ) {
            // Trigger the store change to update the basket
            void changeStore(selectedStoreInfo);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStoreInfo?.id, selectedStoreInfo?.inventoryId, isStoreLocatorOpen, store.id]);

    return (
        <div className="pb-4" data-testid="cart-pickup-card">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                    {/* Store Icon and Pickup Label */}
                    <div className="flex items-center gap-2">
                        <Store className="size-4" />
                        <Typography variant="large" as="div" className="font-normal">
                            {(() => {
                                const template = t('cart.pickupStoreInfo.pickupInStore', { storeName: '{storeName}' });
                                const [before, after] = template.split('{storeName}');
                                return (
                                    <>
                                        {before}
                                        <span className="font-semibold">{store.name}</span>
                                        {after}
                                    </>
                                );
                            })()}
                        </Typography>
                    </div>

                    {/* Store Address */}
                    <div className="ml-7">
                        <Typography variant="muted" as="div" className="text-sm">
                            <StoreAddress store={store} />
                        </Typography>
                    </div>
                </div>

                {/* Change Store Button */}
                <Button variant="outline" onClick={handleChangeStoreClick}>
                    {t('cart.pickupStoreInfo.changeStore')}
                </Button>
            </div>
        </div>
    );
}
