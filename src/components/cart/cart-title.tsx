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
import type { ReactElement } from 'react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CartTitleProps {
    basket: ShopperBasketsV2.schemas['Basket'];
    deliveryCount: number;
}

function formatShippingAddress(address: ShopperBasketsV2.schemas['OrderAddress']): string | null {
    const parts = [address.address1, address.city, address.stateCode, address.postalCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
}

export default function CartTitle({ basket, deliveryCount }: CartTitleProps): ReactElement {
    const { t } = useTranslation('cart');
    const totalCount = basket?.productItems?.length ?? 0;
    const shippingAddress = basket?.shipments?.[0]?.shippingAddress;
    const formattedAddress = shippingAddress ? formatShippingAddress(shippingAddress) : null;

    return (
        <div className="flex items-center gap-2 mb-6">
            <Info className="w-4.5 h-4.5 text-foreground shrink-0" />
            <div>
                <h2 className="text-lg-xl font-medium text-foreground">
                    {t('delivery.heading', { deliveryCount, totalCount })}
                </h2>
                {formattedAddress && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">{formattedAddress}</p>
                )}
            </div>
        </div>
    );
}
