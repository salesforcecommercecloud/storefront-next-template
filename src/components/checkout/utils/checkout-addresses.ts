import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Checks if an address has no meaningful content (all fields are empty/falsy)
 * Ignores the id field and only checks actual address fields
 * @param address - Address object to check
 * @returns true if address is empty or has no meaningful content
 */
export function isAddressEmpty(address: ShopperBasketsV2.schemas['OrderAddress'] | undefined | null): boolean {
    if (!address) return true;
    const normalize = (value: string | undefined | null) => (!value ? '' : value);
    return (
        normalize(address.address1) === '' &&
        normalize(address.city) === '' &&
        normalize(address.countryCode) === '' &&
        normalize(address.firstName) === '' &&
        normalize(address.lastName) === '' &&
        normalize(address.phone) === '' &&
        normalize(address.postalCode) === '' &&
        normalize(address.stateCode) === ''
    );
}
