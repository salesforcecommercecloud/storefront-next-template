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
import { isAddressEmpty } from '../utils/checkout-addresses';

export type ShippingAddressDisplayProps = {
    /** Address to display (order/basket address shape). When null/undefined or empty, notProvidedText is shown. */
    address:
        | {
              firstName?: string;
              lastName?: string;
              address1?: string;
              address2?: string;
              city?: string;
              stateCode?: string;
              postalCode?: string;
              phone?: string;
          }
        | null
        | undefined;
    /** Optional phone to show instead of address.phone (e.g. prioritized contact phone in checkout) */
    displayPhone?: string;
    /** Shown when address is missing or empty (e.g. "Shipping address not provided yet") */
    notProvidedText?: string;
};

/**
 * Shipping address display – same structure as checkout shipping-address summary.
 * When address is missing or empty, shows notProvidedText. Used in checkout and order details.
 */
export function ShippingAddressDisplay({
    address,
    displayPhone,
    notProvidedText,
}: ShippingAddressDisplayProps): ReactElement {
    if (!address || isAddressEmpty(address)) {
        return (
            <div className="space-y-2">
                <Typography variant="small" className="text-muted-foreground">
                    {notProvidedText}
                </Typography>
            </div>
        );
    }

    const prioritizedPhoneNumber = displayPhone ?? address.phone;

    return (
        <div className="space-y-2">
            <Typography variant="small" className="text-muted-foreground">
                {address.firstName} {address.lastName}
            </Typography>
            <Typography variant="small" className="text-muted-foreground">
                {address.address1}
            </Typography>
            {address.address2 && (
                <Typography variant="small" className="text-muted-foreground">
                    {address.address2}
                </Typography>
            )}
            <Typography variant="small" className="text-muted-foreground">
                {address.city}
                {address.stateCode && `, ${address.stateCode}`} {address.postalCode}
            </Typography>
            {prioritizedPhoneNumber && (
                <Typography variant="small" className="text-muted-foreground">
                    {prioritizedPhoneNumber}
                </Typography>
            )}
        </div>
    );
}

export default ShippingAddressDisplay;
