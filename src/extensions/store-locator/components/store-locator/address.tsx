/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useTranslation } from 'react-i18next';
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';

interface StoreAddressProps {
    /** Store object containing address information */
    store: ShopperStores.schemas['Store'];
    /** Whether to show each address line on separate lines */
    multiline?: boolean;
    /** Include store name inline with first address line */
    includeStoreName?: boolean;
}

/**
 * StoreAddress
 *
 * Renders a store address in an i18n-friendly way. The field order and separators
 * come from UI strings so they can be localized per locale.
 *
 * @param store - Store object containing address information
 * @param multiline - Whether to render each line separately (default true)
 * @param includeStoreName - Include store name inline with first address line
 * @returns ReactElement | null
 *
 * @example
 * <StoreAddress store={store} />
 *
 * @example
 * <StoreAddress store={store} multiline={false} />
 *
 * @example
 * <StoreAddress store={store} includeStoreName={true} />
 */
export default function StoreAddress({ store, multiline = true, includeStoreName = false }: StoreAddressProps) {
    const { t } = useTranslation('extStoreLocator');

    if (!store) {
        return null;
    }

    const formatKey = multiline ? 'storeLocator.address.multilineFormat' : 'storeLocator.address.singleLineFormat';
    const formattedAddress = t(formatKey, {
        address1: store.address1 || '',
        city: store.city || '',
        stateCode: store.stateCode || '',
        postalCode: store.postalCode || '',
    });
    const lines = multiline ? formattedAddress.split('\n') : [formattedAddress];

    return (
        <>
            {lines.map((line, index) => (
                <div key={`address-${line}`}>
                    {index === 0 && includeStoreName && store.name && <span>{store.name} - </span>}
                    {line}
                </div>
            ))}
        </>
    );
}
