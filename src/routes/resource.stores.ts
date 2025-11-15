/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/** @sfdc-extension-file SFDC_EXT_STORE_LOCATOR */
import { type ClientLoaderFunctionArgs, data, type LoaderFunctionArgs } from 'react-router';
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';

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

        const config = getConfig(context);
        const clients = createApiClients(context);

        const queryParams: ShopperStores.operations['searchStores']['parameters']['query'] =
            mode === 'device'
                ? {
                      latitude: latitude ? Number(latitude) : undefined,
                      longitude: longitude ? Number(longitude) : undefined,
                      maxDistance: maxDistance ? Number(maxDistance) : undefined,
                      distanceUnit: distanceUnit as 'mi' | 'km',
                      limit: limit ? Number(limit) : undefined,
                      siteId: config.commerce.api.siteId,
                  }
                : {
                      countryCode,
                      postalCode,
                      maxDistance: maxDistance ? Number(maxDistance) : undefined,
                      distanceUnit: distanceUnit as 'mi' | 'km',
                      limit: limit ? Number(limit) : undefined,
                      siteId: config.commerce.api.siteId,
                  };

        const { data: stores } = await clients.shopperStores.searchStores({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                },
                query: queryParams,
            },
        });

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
