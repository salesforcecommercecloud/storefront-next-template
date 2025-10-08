/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/** @sfdc-extension-file SFDC_EXT_STORE_LOCATOR */
import { type ClientLoaderFunctionArgs, data, type LoaderFunctionArgs } from 'react-router';
import type { ShopperStoresTypes } from 'commerce-sdk-isomorphic';
import { extractResponseError } from '@/lib/utils';
import createClient from '@/lib/scapi';

/**
 * Client resource to search for stores
 * @returns Result of searchStores API
 */
export async function searchStores(context: LoaderFunctionArgs['context'], request: Request) {
    try {
        const url = new URL(request.url);
        const mode = url.searchParams.get('mode') ?? 'input';
        const countryCode = url.searchParams.get('countryCode') ?? undefined;
        const postalCode = url.searchParams.get('postalCode') ?? undefined;
        const latitude = url.searchParams.get('latitude');
        const longitude = url.searchParams.get('longitude');
        const maxDistance = url.searchParams.get('maxDistance');
        const distanceUnit = url.searchParams.get('distanceUnit') ?? 'km';
        const limit = url.searchParams.get('limit');

        // siteId seems not required for searchStores API
        const parameters: Omit<ShopperStoresTypes.searchStoresQueryParameters, 'siteId'> =
            mode === 'device'
                ? {
                      latitude: latitude ? Number(latitude) : undefined,
                      longitude: longitude ? Number(longitude) : undefined,
                      maxDistance: maxDistance ? Number(maxDistance) : undefined,
                      distanceUnit: distanceUnit as 'mi' | 'km',
                      limit: limit ? Number(limit) : undefined,
                  }
                : {
                      countryCode,
                      postalCode,
                      maxDistance: maxDistance ? Number(maxDistance) : undefined,
                      distanceUnit: distanceUnit as 'mi' | 'km',
                      limit: limit ? Number(limit) : undefined,
                  };

        const client = createClient(context);
        const stores = await client.ShopperStores.searchStores({ parameters });
        return Response.json({
            success: true,
            stores,
        });
    } catch (error) {
        const { responseMessage, status_code } = await extractResponseError(error as Error);
        return data(
            {
                success: false,
                error: responseMessage,
            },
            { status: Number(status_code) }
        );
    }
}

export function loader({ request, context }: LoaderFunctionArgs) {
    return searchStores(context, request);
}

export function clientLoader({ request, context }: ClientLoaderFunctionArgs) {
    return searchStores(context, request);
}
