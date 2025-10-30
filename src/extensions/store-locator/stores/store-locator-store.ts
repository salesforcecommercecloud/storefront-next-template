/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { createStore } from 'zustand/vanilla';
import Cookies from 'js-cookie';
import { getCookieConfig } from '@/lib/cookie-utils';

export type StoreLocatorConfig = {
    supportedCountries: Array<{ countryCode: string; countryName: string }>;
    radius: number;
    radiusUnit: 'mi' | 'km';
    limit: number;
    geoTimeout: number;
};

export type GeoCoordinates = {
    latitude: number | null;
    longitude: number | null;
};

export type FormSearchParams = {
    countryCode: string;
    postalCode: string;
};

type StoreLocatorState = {
    isOpen: boolean;
    mode: 'input' | 'device';
    shouldSearch: boolean;
    searchParams: FormSearchParams | null;
    deviceCoordinates: GeoCoordinates;
    geoError: boolean;
    selectedStoreId: string | null;
    config: StoreLocatorConfig;
};

type StoreLocatorActions = {
    open: () => void;
    close: () => void;
    searchByForm: (params: FormSearchParams) => void;
    setShouldSearch: (should: boolean) => void;
    setDeviceCoordinates: (coords: GeoCoordinates) => void;
    setGeoError: (value: boolean) => void;
    setSelectedStoreId: (id: string | null) => void;
};

export type StoreLocatorStore = StoreLocatorState & StoreLocatorActions;

const defaultConfig: StoreLocatorConfig = {
    supportedCountries: [
        { countryCode: 'US', countryName: 'United States' },
        { countryCode: 'GB', countryName: 'United Kingdom' },
    ],
    radius: 100,
    radiusUnit: 'km',
    limit: 200, // This is an API limit and is therefore not configurable
    geoTimeout: 10000,
};

/**
 * Compute cookie name for selected store id, scoped by site id.
 * @returns Cookie name string
 */
const selectedStoreIdCookieName = () => {
    const siteId = import.meta.env.PUBLIC_COMMERCE_API_SITE_ID || 'site-default';
    return `selectedStore_${siteId}`;
};

/**
 * Persist the selected store id cookie (client-only). Clears cookie when id is null.
 * Throws on server to highlight accidental invocation in SSR.
 *
 * @param id - Selected store id or null to clear
 */
const writeSelectedStoreIdCookie = (id: string | null) => {
    try {
        const cookieName = selectedStoreIdCookieName();
        const cookieConfig = getCookieConfig();

        if (id) {
            Cookies.set(cookieName, id, cookieConfig);
        } else {
            // Use same config for removal to ensure path and domain match
            Cookies.remove(cookieName, cookieConfig);
        }
    } catch (e) {
        // draw attention to failed attempts to write cookie on server
        if (typeof window === 'undefined') {
            throw e;
        }
    }
};

/**
 * Read the selected store id cookie (client-only). Returns null on errors.
 * @returns Selected store id or null
 */
export const readSelectedStoreIdCookie = (): string | null => {
    try {
        const cookieName = selectedStoreIdCookieName();
        const match = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : null;
    } catch {
        // ignore cookie parsing errors
        return null;
    }
};

/**
 * Create a Zustand store for the store locator feature.
 * Allows overriding parts of initial state via `init` for hydration and tests.
 *
 * @param init - Partial initial state overrides
 * @returns Vanilla store instance for use with `useStore`
 */
export const createStoreLocatorStore = (init?: Partial<StoreLocatorState>) => {
    const initialState: StoreLocatorState = {
        isOpen: false,
        mode: 'input',
        shouldSearch: false,
        searchParams: null,
        deviceCoordinates: { latitude: null, longitude: null },
        geoError: false,
        selectedStoreId: null,
        config: defaultConfig,
        ...init,
    };

    return createStore<StoreLocatorStore>()((set) => ({
        ...initialState,
        open: () => set({ isOpen: true }),
        close: () => set({ isOpen: false }),
        searchByForm: (params) =>
            set(() => ({ mode: 'input', searchParams: params, shouldSearch: true, geoError: false })),
        setDeviceCoordinates: (coords) =>
            set(() => ({
                mode: 'device',
                deviceCoordinates: coords,
                searchParams: null,
                shouldSearch: true,
                geoError: false,
            })),
        setGeoError: (value) => set(() => ({ geoError: value })),
        setShouldSearch: (should) => set(() => ({ shouldSearch: should })),
        setSelectedStoreId: (id) =>
            set(() => {
                writeSelectedStoreIdCookie(id);
                return { selectedStoreId: id };
            }),
    }));
};
