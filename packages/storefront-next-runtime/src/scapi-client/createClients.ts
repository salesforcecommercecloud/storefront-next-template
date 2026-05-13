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
import createBaseClient, { type Middleware, type ClientOptions, type Client } from 'openapi-fetch';
import type {
    ShopperAvailability,
    ShopperBasketsV1,
    ShopperBasketsV2,
    ShopperConfigurations,
    ShopperConsents,
    ShopperContext,
    ShopperCustomers,
    ShopperExperience,
    ShopperGiftCertificates,
    ShopperLogin,
    ShopperOrders,
    ShopperPayments,
    ShopperProducts,
    ShopperPromotions,
    ShopperSearch,
    ShopperSeo,
    ShopperStores,
} from './types';
import { createClient, type GlobalRequestParameters } from './createClient';
import { defaultQuerySerializer } from './defaultQuerySerializer';
import type { ProxyClient } from './proxy-types';
import { createAuthHelpers, type AuthNamespace } from './auth';
import { createBasketHelpers, type BasketHelpersNamespace } from './basket';
import { SLAS_AUTH_ENDPOINTS } from './constants';
import { getWorkspaceSlasOrgId } from '../workspace';

/**
 * Configuration for creating Commerce API clients.
 *
 * Extends openapi-fetch ClientOptions with required organizationId and siteId
 * which will be automatically merged into all API calls as global request parameters.
 */
export interface CommerceApiClientConfig extends ClientOptions {
    /** Base URL for Commerce API (required for building auth URLs) */
    baseUrl: string;
    /** Organization ID - automatically merged into path parameters */
    organizationId: string;
    /** Site ID - automatically merged into query parameters */
    siteId: string;
    /** Locale - automatically merged into query parameters (optional) */
    locale?: string;
    /** SLAS client ID - required for auth operations */
    clientId: string;
    /** SLAS client secret - required for private client auth operations */
    clientSecret?: string;
    /** OAuth redirect URI - must be registered in SLAS configuration */
    redirectUri: string;
    /** Optional callback when access token is invalidated */
    onAuthTokenInvalid?: (response: Response) => void;
    /**
     * Direct SCAPI proxy URL for workspace environments (e.g., 'https://scw:25010').
     * When set, the SDK automatically:
     * - Strips 'f_ecom_' prefix from organizationId for SLAS auth endpoints
     * - Rewrites org IDs back to full form for product/search API endpoints
     * - Uses client_credentials grant for guest login (no PKCE)
     */
    proxyHost?: string;
}

// Import operation maps for all APIs
import { operations as shopperAvailabilityOps } from './generated/shopper-availability-v1.operations';
import { operations as shopperBasketsV1Ops } from './generated/shopper-baskets-v1.operations';
import { operations as shopperBasketsV2Ops } from './generated/shopper-baskets-v2.operations';
import { operations as shopperConfigurationsOps } from './generated/shopper-configurations-v1.operations';
import { operations as shopperConsentsOps } from './generated/shopper-consents-v1.operations';
import { operations as shopperContextOps } from './generated/shopper-context-v1.operations';
import { operations as shopperCustomersOps } from './generated/shopper-customers-v1.operations';
import { operations as shopperExperienceOps } from './generated/shopper-experience-v1.operations';
import { operations as shopperGiftCertificatesOps } from './generated/shopper-gift-certificates-v1.operations';
// May 2026 - The shopper login has been renamed to auth but we continue to ship the client namespace as `shopperLogin` for backwards compatibility
import { operations as shopperLoginOps } from './generated/auth-v1.operations';
import { operations as shopperOrdersOps } from './generated/shopper-orders-v1.operations';
import { operations as shopperPaymentsOps } from './generated/shopper-payments-v1.operations';
import { operations as shopperProductsOps } from './generated/shopper-products-v1.operations';
import { operations as shopperPromotionsOps } from './generated/shopper-promotions-v1.operations';
import { operations as shopperSearchOps } from './generated/shopper-search-v1.operations';
import { operations as shopperSeoOps } from './generated/shopper-seo-v1.operations';
import { operations as shopperStoresOps } from './generated/shopper-stores-v1.operations';

export type Clients = {
    shopperAvailability: ProxyClient<Client<ShopperAvailability.endpoints>, typeof shopperAvailabilityOps>;
    shopperBasketsV1: ProxyClient<Client<ShopperBasketsV1.endpoints>, typeof shopperBasketsV1Ops>;
    shopperBasketsV2: ProxyClient<Client<ShopperBasketsV2.endpoints>, typeof shopperBasketsV2Ops>;
    shopperConfigurations: ProxyClient<Client<ShopperConfigurations.endpoints>, typeof shopperConfigurationsOps>;
    shopperConsents: ProxyClient<Client<ShopperConsents.endpoints>, typeof shopperConsentsOps>;
    shopperContext: ProxyClient<Client<ShopperContext.endpoints>, typeof shopperContextOps>;
    shopperCustomers: ProxyClient<Client<ShopperCustomers.endpoints>, typeof shopperCustomersOps>;
    shopperExperience: ProxyClient<Client<ShopperExperience.endpoints>, typeof shopperExperienceOps>;
    shopperGiftCertificates: ProxyClient<Client<ShopperGiftCertificates.endpoints>, typeof shopperGiftCertificatesOps>;
    shopperLogin: ProxyClient<Client<ShopperLogin.endpoints>, typeof shopperLoginOps>;
    shopperOrders: ProxyClient<Client<ShopperOrders.endpoints>, typeof shopperOrdersOps>;
    shopperPayments: ProxyClient<Client<ShopperPayments.endpoints>, typeof shopperPaymentsOps>;
    shopperProducts: ProxyClient<Client<ShopperProducts.endpoints>, typeof shopperProductsOps>;
    shopperPromotions: ProxyClient<Client<ShopperPromotions.endpoints>, typeof shopperPromotionsOps>;
    shopperSearch: ProxyClient<Client<ShopperSearch.endpoints>, typeof shopperSearchOps>;
    shopperSeo: ProxyClient<Client<ShopperSeo.endpoints>, typeof shopperSeoOps>;
    shopperStores: ProxyClient<Client<ShopperStores.endpoints>, typeof shopperStoresOps>;
    /** Authentication helpers for SLAS operations */
    auth: AuthNamespace;
    /** Basket helper utilities */
    basket: BasketHelpersNamespace;
    use: (middleware: Middleware) => void;
};

export function createCommerceApiClients(config: CommerceApiClientConfig): Clients {
    const {
        baseUrl,
        fetch: customFetch,
        querySerializer,
        organizationId: rawOrganizationId,
        siteId,
        locale,
        clientId,
        clientSecret,
        redirectUri,
        onAuthTokenInvalid,
        proxyHost,
        ...rest
    } = config;

    // In workspace environments (proxyHost set), SLAS auth endpoints use the org ID
    // without the 'f_ecom_' prefix, but product/search APIs need the full org ID.
    // We pass the stripped org ID to the SDK and use middleware to rewrite for non-SLAS endpoints.
    const isWorkspace = !!proxyHost;
    const organizationId = isWorkspace ? getWorkspaceSlasOrgId(rawOrganizationId) : rawOrganizationId;

    // Validate required parameters
    const requiredParams = { baseUrl, organizationId, siteId, clientId, redirectUri } as const;
    const missingParams = Object.entries(requiredParams)
        .filter(([, value]) => !value)
        .map(([key]) => key);
    if (missingParams.length > 0) {
        throw new Error(
            `Missing required configuration: ${missingParams.join(', ')}. These parameters are required for creating Commerce API clients.`
        );
    }

    const clientOptions = {
        ...(customFetch ? { fetch: customFetch } : {}),
        querySerializer: querySerializer || defaultQuerySerializer,
        ...rest,
    };

    // Global request parameters to merge organizationId, siteId, and locale into all calls
    const globalParams: GlobalRequestParameters = {
        organizationId,
        siteId,
        ...(locale ? { locale } : {}),
    };

    const createClientOptions = onAuthTokenInvalid ? { onAuthTokenInvalid } : undefined;

    // Some APIs don't support locale parameter - exclude it for those clients
    const globalParamsWithoutLocale: GlobalRequestParameters = {
        organizationId,
        siteId,
    };

    // Create base clients and wrap with proxy for operation methods
    const shopperAvailability = createClient(
        createBaseClient<ShopperAvailability.endpoints>({
            baseUrl: `${baseUrl}/product/shopper-availability/v1`,
            ...clientOptions,
        }),
        shopperAvailabilityOps,
        globalParamsWithoutLocale, // API does not accept locale parameter
        createClientOptions
    );
    const shopperBasketsV1 = createClient(
        createBaseClient<ShopperBasketsV1.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-baskets/v1`,
            ...clientOptions,
        }),
        shopperBasketsV1Ops,
        globalParams,
        createClientOptions
    );
    const shopperBasketsV2 = createClient(
        createBaseClient<ShopperBasketsV2.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-baskets/v2`,
            ...clientOptions,
        }),
        shopperBasketsV2Ops,
        globalParams,
        createClientOptions
    );
    const shopperConfigurations = createClient(
        createBaseClient<ShopperConfigurations.endpoints>({
            baseUrl: `${baseUrl}/configuration/shopper-configurations/v1`,
            ...clientOptions,
        }),
        shopperConfigurationsOps,
        globalParamsWithoutLocale, // API does not accept locale parameter
        createClientOptions
    );
    const shopperConsents = createClient(
        createBaseClient<ShopperConsents.endpoints>({
            baseUrl: `${baseUrl}/shopper/shopper-consents/v1`,
            ...clientOptions,
        }),
        shopperConsentsOps,
        globalParams,
        createClientOptions
    );
    const shopperContext = createClient(
        createBaseClient<ShopperContext.endpoints>({
            baseUrl: `${baseUrl}/shopper/shopper-context/v1`,
            ...clientOptions,
        }),
        shopperContextOps,
        globalParamsWithoutLocale, // API does not accept locale parameter
        createClientOptions
    );
    const shopperCustomers = createClient(
        createBaseClient<ShopperCustomers.endpoints>({
            baseUrl: `${baseUrl}/customer/shopper-customers/v1`,
            ...clientOptions,
        }),
        shopperCustomersOps,
        globalParamsWithoutLocale, // API does not accept locale parameter
        createClientOptions
    );
    const shopperExperience = createClient(
        createBaseClient<ShopperExperience.endpoints>({
            baseUrl: `${baseUrl}/experience/shopper-experience/v1`,
            ...clientOptions,
        }),
        shopperExperienceOps,
        globalParams,
        createClientOptions
    );
    const shopperGiftCertificates = createClient(
        createBaseClient<ShopperGiftCertificates.endpoints>({
            baseUrl: `${baseUrl}/pricing/shopper-gift-certificates/v1`,
            ...clientOptions,
        }),
        shopperGiftCertificatesOps,
        globalParamsWithoutLocale, // API does not accept locale parameter
        createClientOptions
    );
    const shopperLogin = createClient(
        createBaseClient<ShopperLogin.endpoints>({
            baseUrl: `${baseUrl}/shopper/auth/v1`,
            ...clientOptions,
        }),
        shopperLoginOps,
        globalParamsWithoutLocale, // API does not accept locale parameter
        createClientOptions
    );
    const shopperOrders = createClient(
        createBaseClient<ShopperOrders.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-orders/v1`,
            ...clientOptions,
        }),
        shopperOrdersOps,
        globalParams,
        createClientOptions
    );
    const shopperPayments = createClient(
        createBaseClient<ShopperPayments.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-payments/v1`,
            ...clientOptions,
        }),
        shopperPaymentsOps,
        globalParamsWithoutLocale, // API does not accept locale parameter
        createClientOptions
    );
    const shopperProducts = createClient(
        createBaseClient<ShopperProducts.endpoints>({
            baseUrl: `${baseUrl}/product/shopper-products/v1`,
            ...clientOptions,
        }),
        shopperProductsOps,
        globalParams,
        createClientOptions
    );
    const shopperPromotions = createClient(
        createBaseClient<ShopperPromotions.endpoints>({
            baseUrl: `${baseUrl}/pricing/shopper-promotions/v1`,
            ...clientOptions,
        }),
        shopperPromotionsOps,
        globalParams,
        createClientOptions
    );
    const shopperSearch = createClient(
        createBaseClient<ShopperSearch.endpoints>({
            baseUrl: `${baseUrl}/search/shopper-search/v1`,
            ...clientOptions,
        }),
        shopperSearchOps,
        globalParams,
        createClientOptions
    );
    const shopperSeo = createClient(
        createBaseClient<ShopperSeo.endpoints>({
            baseUrl: `${baseUrl}/site/shopper-seo/v1`,
            ...clientOptions,
        }),
        shopperSeoOps,
        globalParams,
        createClientOptions
    );
    const shopperStores = createClient(
        createBaseClient<ShopperStores.endpoints>({
            baseUrl: `${baseUrl}/store/shopper-stores/v1`,
            ...clientOptions,
        }),
        shopperStoresOps,
        globalParams,
        createClientOptions
    );

    const allClients = [
        shopperAvailability,
        shopperBasketsV1,
        shopperBasketsV2,
        shopperConfigurations,
        shopperConsents,
        shopperContext,
        shopperCustomers,
        shopperExperience,
        shopperGiftCertificates,
        shopperLogin,
        shopperOrders,
        shopperPayments,
        shopperProducts,
        shopperPromotions,
        shopperSearch,
        shopperSeo,
        shopperStores,
    ];

    // In workspace environments, automatically register middleware to rewrite org IDs.
    // SLAS auth endpoints use the stripped org ID (e.g., 'zzzz_s01') while
    // product/search APIs need the full org ID (e.g., 'f_ecom_zzzz_s01').
    if (isWorkspace && organizationId !== rawOrganizationId) {
        const workspaceOrgIdMiddleware: Middleware = {
            onRequest({ request }) {
                const url = new URL(request.url);
                const isSlasAuthEndpoint = SLAS_AUTH_ENDPOINTS.some((path) => url.pathname.includes(path));

                // Only rewrite non-SLAS endpoints (product, search, etc.)
                if (!isSlasAuthEndpoint) {
                    url.pathname = url.pathname.replace(
                        `/organizations/${organizationId}/`,
                        `/organizations/${rawOrganizationId}/`
                    );
                    return new Request(url, request);
                }

                return request;
            },
        };
        allClients.forEach((client) => client.use(workspaceOrgIdMiddleware));
    }

    // Create auth helpers namespace
    const auth = createAuthHelpers({
        shopperLoginClient: shopperLogin,
        clientId,
        clientSecret,
        redirectUri,
        organizationId,
        siteId,
        baseUrl,
        proxyHost,
    });
    const basket = createBasketHelpers({ shopperBasketsClient: shopperBasketsV2 });

    return {
        shopperAvailability,
        shopperBasketsV1,
        shopperBasketsV2,
        shopperConfigurations,
        shopperConsents,
        shopperContext,
        shopperCustomers,
        shopperExperience,
        shopperGiftCertificates,
        shopperLogin,
        shopperOrders,
        shopperPayments,
        shopperProducts,
        shopperPromotions,
        shopperSearch,
        shopperSeo,
        shopperStores,
        auth,
        basket,
        use: (middleware: Middleware) => {
            allClients.forEach((client) => client.use(middleware));
        },
    };
}
