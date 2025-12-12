import type translations from '@/locales/en-US/translations.json';

// Derive country codes from translations.json
export type CountryCode = keyof typeof translations.countries;

// Derive state codes from translations.json
type USStateCode = keyof typeof translations.countries.US.states;
type CAStateCode = keyof typeof translations.countries.CA.states;

// Type for state/province code based on country
export type StateCode<T extends CountryCode> = T extends 'US' ? USStateCode : T extends 'CA' ? CAStateCode : never;

// List of supported country codes (names are retrieved from i18next at runtime)
export const COUNTRY_CODES: readonly CountryCode[] = ['US', 'CA'] as const;

// US Postal Code validation (5 digits or 5+4 format)
export const usPostalCodeRegex = /^\d{5}(-\d{4})?$/;

// Canadian Postal Code validation (A1A 1A1 format)
export const canadianPostalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
