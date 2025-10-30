/**
 * Phone country codes utility for checkout phone input
 * Provides international dialing codes (e.g., +1, +44) with their associated countries
 */

export interface PhoneCountryCode {
    dialingCode: string;
    countryName: string;
}

/**
 * Get the most common international dialing codes for checkout phone input
 *
 * @returns Array of phone country codes with their dialing codes and country names
 */
export function getCommonPhoneCountryCodes(): PhoneCountryCode[] {
    return [
        { dialingCode: '+1', countryName: 'United States' },
        { dialingCode: '+1', countryName: 'Canada' },
        { dialingCode: '+44', countryName: 'United Kingdom' },
        { dialingCode: '+49', countryName: 'Germany' },
        { dialingCode: '+33', countryName: 'France' },
        { dialingCode: '+39', countryName: 'Italy' },
        { dialingCode: '+34', countryName: 'Spain' },
        { dialingCode: '+31', countryName: 'Netherlands' },
        { dialingCode: '+61', countryName: 'Australia' },
        { dialingCode: '+81', countryName: 'Japan' },
        { dialingCode: '+86', countryName: 'China' },
        { dialingCode: '+91', countryName: 'India' },
    ];
}
