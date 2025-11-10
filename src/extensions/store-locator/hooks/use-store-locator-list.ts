/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useFetcher, useSearchParams } from 'react-router';
import type { ShopperStoresTypes } from 'commerce-sdk-isomorphic';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';

/**
 * Result of searchStores API
 * @property success - Whether the search was successful
 * @property stores - Result of searchStores API
 * @property error - Error message if the search was not successful
 */
export interface SearchStoresResult {
    success: boolean;
    stores?: ShopperStoresTypes.StoreResult;
    error?: string;
}

/**
 * Hook to fetch and manage store locator list.
 * Triggers searchStores API when shouldSearch is true.
 *
 * @returns Read-only view of state and actions, including pagination helper
 *
 * @example
 * const { storesPaginated, setPage } = useStoreLocatorList();
 * // render list and call setPage((p)=>p+1) for Load More
 */
export function useStoreLocatorList() {
    const mode = useStoreLocator((s) => s.mode);
    const searchParams = useStoreLocator((s) => s.searchParams);
    const deviceCoordinates = useStoreLocator((s) => s.deviceCoordinates);
    const config = useStoreLocator((s) => s.config);
    const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
    const setSelectedStoreInfoRaw = useStoreLocator((s) => s.setSelectedStoreInfo);
    const geoError = useStoreLocator((s) => s.geoError);
    const shouldSearch = useStoreLocator((s) => s.shouldSearch);
    const setShouldSearch = useStoreLocator((s) => s.setShouldSearch);

    const [urlSearchParams, setUrlSearchParams] = useSearchParams();
    const fetcher = useFetcher<SearchStoresResult>();
    const [page, setPage] = useState<number>(1);
    const [hasSearched, setHasSearched] = useState<boolean>(false);

    useEffect(() => {
        if (!shouldSearch) return;

        const params = new URLSearchParams();
        params.set('mode', mode);
        params.set('maxDistance', String(config.radius));
        params.set('distanceUnit', config.radiusUnit);
        params.set('limit', String(config.limit));
        let canFetch = false;

        if (mode === 'input') {
            const hasCountry = Boolean(searchParams?.countryCode);
            const hasPostal = Boolean(searchParams?.postalCode);
            if (hasCountry && hasPostal && searchParams) {
                params.set('countryCode', searchParams.countryCode);
                params.set('postalCode', searchParams.postalCode);
                canFetch = true;
            }
        } else if (mode === 'device') {
            const hasLat = typeof deviceCoordinates.latitude === 'number';
            const hasLng = typeof deviceCoordinates.longitude === 'number';
            if (hasLat && hasLng) {
                params.set('latitude', String(deviceCoordinates.latitude));
                params.set('longitude', String(deviceCoordinates.longitude));
                canFetch = true;
            }
        }

        if (canFetch) {
            setHasSearched(true);
            void fetcher.load(`/resource/stores?${params.toString()}`);
            setShouldSearch(false);
        }
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        shouldSearch,
        mode,
        searchParams?.countryCode,
        searchParams?.postalCode,
        deviceCoordinates.latitude,
        deviceCoordinates.longitude,
    ]);

    const stores = useMemo(() => fetcher.data?.stores?.data ?? [], [fetcher.data]);
    const hasError = useMemo(() => fetcher.data?.success === false, [fetcher.data]);
    const showCount = page * 10;
    const storesPaginated = stores.slice(0, showCount);

    const isLoading = fetcher.state === 'loading';

    // Wrapper function that updates both store and URL
    const setSelectedStoreInfo = useCallback(
        (info: SelectedStoreInfo | null) => {
            setSelectedStoreInfoRaw(info);

            // Update URL with inventoryId parameter so that it triggers a new fetch
            const currentInventoryId = urlSearchParams.get('inventoryId');
            if (info?.inventoryId && currentInventoryId !== info.inventoryId) {
                const newSearchParams = new URLSearchParams(urlSearchParams);
                newSearchParams.set('inventoryId', info.inventoryId);
                setUrlSearchParams(newSearchParams, { replace: true });
            }
        },
        [setSelectedStoreInfoRaw, urlSearchParams, setUrlSearchParams]
    );

    return {
        // store state
        mode,
        searchParams,
        config,
        selectedStoreInfo,
        setSelectedStoreInfo,
        geoError,
        // fetch state
        hasSearched,
        hasError,
        isLoading,
        stores,
        storesPaginated,
        setPage,
    } as const;
}
