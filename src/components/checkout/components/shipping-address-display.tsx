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
import { Typography } from '@/components/typography';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { AddressBookItem } from '@/lib/customer-profile-utils';
import { formatAddress, isAddressEmpty } from '@/lib/address-utils';

export type ShippingAddressDisplayProps = {
    /** Address to display (order/basket address shape). When null/undefined or empty, nothing is rendered. */
    address?: Partial<AddressBookItem> | null;
    /** When true, display address.phone at the end. Default false (phone not shown). */
    displayPhone?: boolean;
    /** Shipping Address display variant */
    variant?: 'summary' | 'card';
};

/**
 * Shipping address display – same structure as checkout shipping-address summary.
 * When address is missing or empty, renders nothing. Used in checkout and order details.
 */
export function ShippingAddressDisplay({
    address,
    displayPhone = false,
    variant = 'summary',
}: ShippingAddressDisplayProps): ReactElement {
    const { t } = useTranslation('checkout');

    if (!address || isAddressEmpty(address)) {
        return <></>;
    }

    const isCard = variant === 'card';
    const { nameLine, streetLine, cityLine } = formatAddress(address);

    return (
        <div className="space-y-2">
            <div className={isCard ? 'flex flex-wrap items-center gap-2' : undefined}>
                <Typography variant="small" className={isCard ? 'text-foreground' : 'text-muted-foreground'}>
                    {nameLine}
                </Typography>
                {isCard && address.preferred && <Badge variant="default">{t('shippingAddress.defaultBadge')}</Badge>}
            </div>
            {streetLine && (
                <Typography variant="small" className="text-muted-foreground">
                    {streetLine}
                </Typography>
            )}
            {cityLine && (
                <Typography variant="small" className="text-muted-foreground">
                    {cityLine}
                </Typography>
            )}
            {displayPhone && address.phone && (
                <Typography variant="small" className="text-muted-foreground">
                    {address.phone}
                </Typography>
            )}
        </div>
    );
}

export default ShippingAddressDisplay;
