/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import uiStringsSL from '@/extensions/store-locator/temp-ui-string-store-locator';

interface StoreAddressProps {
    /** Store object containing address information */
    store: ShopperStores.schemas['Store'];
    /** Whether to show each address line on separate lines */
    multiline?: boolean;
}

/**
 * StoreAddress
 *
 * Renders a store address in an i18n-friendly way. The field order and separators
 * come from UI strings so they can be localized per locale.
 *
 * @param store - Store object containing address information
 * @param multiline - Whether to render each line separately (default true)
 * @returns ReactElement | null
 *
 * @example
 * <StoreAddress store={store} />
 *
 * @example
 * <StoreAddress store={store} multiline={false} />
 */
export default function StoreAddress({ store, multiline = true }: StoreAddressProps) {
    if (!store) {
        return null;
    }

    const format = multiline
        ? uiStringsSL.storeLocator.address.multilineFormat
        : uiStringsSL.storeLocator.address.singleLineFormat;
    const formattedAddress = format
        .replace('{address1}', store.address1 || '')
        .replace('{city}', store.city || '')
        .replace('{stateCode}', store.stateCode || '')
        .replace('{postalCode}', store.postalCode || '');
    const lines = multiline ? formattedAddress.split('\n') : [formattedAddress];

    return (
        <>
            {lines.map((line) => (
                <div key={`address-${line}`}>{line}</div>
            ))}
        </>
    );
}
