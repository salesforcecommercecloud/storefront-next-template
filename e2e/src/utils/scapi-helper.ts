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

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse as parseDotenv } from 'dotenv';

export interface ScapiConfig {
    clientId: string;
    organizationId: string;
    shortCode: string;
    siteId: string;
    slasSecret?: string;
}

export interface GuestTokens {
    accessToken: string;
    refreshToken: string;
    usid: string;
    customerId: string;
    expiresIn: number;
}

export interface BasketInfo {
    basketId: string;
    totalItemCount: number;
    uniqueProductCount: number;
}

export interface ApiCartResult {
    tokens: GuestTokens;
    basket: BasketInfo;
}

let _appEnvCache: Record<string, string> | null = null;

/**
 * Load and cache the parent storefront app's .env file.
 * Reads commerce API config directly from the app's .env so credentials
 * don't need to be duplicated in the E2E .env.
 */
function loadAppEnv(): Record<string, string> {
    if (_appEnvCache) return _appEnvCache;

    const appEnvPath = resolve(__dirname, '..', '..', '..', '.env');
    if (!existsSync(appEnvPath)) {
        _appEnvCache = {};
        return _appEnvCache;
    }

    _appEnvCache = parseDotenv(readFileSync(appEnvPath));
    return _appEnvCache;
}

/**
 * Build SCAPI config from the parent storefront app's .env.
 * Returns null if required vars are missing, causing API cart setup to fall back to the UI flow.
 */
export function getScapiConfig(): ScapiConfig | null {
    const appEnv = loadAppEnv();

    const {
        PUBLIC__app__commerce__api__clientId: clientId,
        PUBLIC__app__commerce__api__organizationId: organizationId,
        PUBLIC__app__commerce__api__shortCode: shortCode,
        COMMERCE_API_SLAS_SECRET: slasSecret,
    } = appEnv;
    const siteId = process.env.SITE_ID;

    if (!clientId || !organizationId || !shortCode || !siteId) {
        return null;
    }

    return { clientId, organizationId, shortCode, siteId, slasSecret };
}

function getBaseUrl(config: ScapiConfig): string {
    return `https://${config.shortCode}.api.commercecloud.salesforce.com`;
}

export async function loginGuest(config: ScapiConfig): Promise<GuestTokens> {
    const baseUrl = getBaseUrl(config);
    const tokenUrl = `${baseUrl}/shopper/auth/v1/organizations/${config.organizationId}/oauth2/token`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (config.slasSecret) {
        headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.slasSecret}`).toString('base64')}`;
    }

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        channel_id: config.siteId,
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers,
        body: body.toString(),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SLAS guest login failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        usid: data.usid,
        customerId: data.customer_id,
        expiresIn: data.expires_in,
    };
}

export async function createBasket(
    config: ScapiConfig,
    tokens: GuestTokens,
    currency: string = 'USD'
): Promise<string> {
    const baseUrl = getBaseUrl(config);
    const url =
        `${baseUrl}/checkout/shopper-baskets/v2/organizations/${config.organizationId}/baskets` +
        `?siteId=${config.siteId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Create basket failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.basketId;
}

export async function addItemToBasket(
    config: ScapiConfig,
    tokens: GuestTokens,
    basketId: string,
    productId: string,
    quantity: number = 1
): Promise<BasketInfo> {
    const baseUrl = getBaseUrl(config);
    const url =
        `${baseUrl}/checkout/shopper-baskets/v2/organizations/${config.organizationId}` +
        `/baskets/${basketId}/items?siteId=${config.siteId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ productId, quantity }]),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Add item to basket failed (${response.status}) for product ${productId}: ${text}`);
    }

    const data = await response.json();
    const productItems = data.productItems ?? [];
    const totalItemCount = productItems.reduce(
        (sum: number, item: { quantity?: number }) => sum + (item.quantity ?? 0),
        0
    );

    return {
        basketId: data.basketId,
        totalItemCount,
        uniqueProductCount: productItems.length,
    };
}

/**
 * Guest login, create basket, and add item in a single sequence.
 * Returns the tokens and basket info needed for cookie injection.
 */
export async function createCartViaApi(
    config: ScapiConfig,
    productId: string,
    options?: { quantity?: number; currency?: string }
): Promise<ApiCartResult> {
    const tokens = await loginGuest(config);
    const basketId = await createBasket(config, tokens, options?.currency);
    const basket = await addItemToBasket(config, tokens, basketId, productId, options?.quantity ?? 1);

    return { tokens, basket };
}
