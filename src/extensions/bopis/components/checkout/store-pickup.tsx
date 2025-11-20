'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/typography';
import { useBasket } from '@/providers/basket';
import { usePickup } from '@/extensions/bopis/context/pickup-context';
import { useCheckoutContext } from '@/hooks/use-checkout';
import bopisUiStrings from '@/extensions/bopis/temp-ui-string-bopis';
import { getPickupStoreFromMap } from '@/extensions/bopis/lib/store-utils';
import StoreDetails from '@/extensions/store-locator/components/store-locator/details';
import { getPickupShipment } from '@/extensions/bopis/lib/basket-utils';

export default function StorePickup() {
    const basket = useBasket();
    const pickupContext = usePickup();
    const checkoutContext = useCheckoutContext();
    const shipment = getPickupShipment(basket);
    const store = getPickupStoreFromMap(shipment?.c_fromStoreId, pickupContext?.pickupStores);
    // Avoid rendering until the shipping defaults are set in the basket.
    // Pickup address and method setting failure will be caught by checkout error boundary.
    use(checkoutContext.shippingDefaultSet);

    return (
        <Card className="gap-3">
            <CardHeader>
                <Typography variant="h3" className="text-lg font-semibold">
                    {bopisUiStrings.storePickup.title}
                </Typography>
            </CardHeader>
            <CardContent>
                <StoreDetails
                    store={store}
                    showDistance={true}
                    showEmail={true}
                    showStoreHours={true}
                    showPhone={true}
                    mobileLayout={true} // Always show vertical layout
                    compactAddress={true} // Use compact address format with store name inline
                />
            </CardContent>
        </Card>
    );
}
