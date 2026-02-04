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
}

// Import operation maps for all APIs
import { operations as shopperBasketsV1Ops } from './generated/shopper-baskets-v1.operations';
import { operations as shopperBasketsV2Ops } from './generated/shopper-baskets-v2.operations';
import { operations as shopperConfigurationsOps } from './generated/shopper-configurations-v1.operations';
import { operations as shopperConsentsOps } from './generated/shopper-consents-v1.operations';
import { operations as shopperContextOps } from './generated/shopper-context-v1.operations';
import { operations as shopperCustomersOps } from './generated/shopper-customers-v1.operations';
import { operations as shopperExperienceOps } from './generated/shopper-experience-v1.operations';
import { operations as shopperGiftCertificatesOps } from './generated/shopper-gift-certificates-v1.operations';
import { operations as shopperLoginOps } from './generated/shopper-login-v1.operations';
import { operations as shopperOrdersOps } from './generated/shopper-orders-v1.operations';
import { operations as shopperPaymentsOps } from './generated/shopper-payments-v1.operations';
import { operations as shopperProductsOps } from './generated/shopper-products-v1.operations';
import { operations as shopperPromotionsOps } from './generated/shopper-promotions-v1.operations';
import { operations as shopperSearchOps } from './generated/shopper-search-v1.operations';
import { operations as shopperSeoOps } from './generated/shopper-seo-v1.operations';
import { operations as shopperStoresOps } from './generated/shopper-stores-v1.operations';

export type Clients = {
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
        organizationId,
        siteId,
        locale,
        clientId,
        clientSecret,
        redirectUri,
        ...rest
    } = config;

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

    // Some APIs don't support locale parameter - exclude it for those clients
    const globalParamsWithoutLocale: GlobalRequestParameters = {
        organizationId,
        siteId,
    };

    // Create base clients and wrap with proxy for operation methods
    const shopperBasketsV1 = createClient(
        createBaseClient<ShopperBasketsV1.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-baskets/v1`,
            ...clientOptions,
        }),
        shopperBasketsV1Ops,
        globalParams
    );
    const shopperBasketsV2 = createClient(
        createBaseClient<ShopperBasketsV2.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-baskets/v2`,
            ...clientOptions,
        }),
        shopperBasketsV2Ops,
        globalParams
    );
    const shopperConfigurations = createClient(
        createBaseClient<ShopperConfigurations.endpoints>({
            baseUrl: `${baseUrl}/configuration/shopper-configurations/v1`,
            ...clientOptions,
        }),
        shopperConfigurationsOps,
        globalParamsWithoutLocale // API does not accept locale parameter
    );
    const shopperConsents = createClient(
        createBaseClient<ShopperConsents.endpoints>({
            baseUrl: `${baseUrl}/shopper/shopper-consents/v1`,
            ...clientOptions,
        }),
        shopperConsentsOps,
        globalParams
    );
    const shopperContext = createClient(
        createBaseClient<ShopperContext.endpoints>({
            baseUrl: `${baseUrl}/shopper/shopper-context/v1`,
            ...clientOptions,
        }),
        shopperContextOps,
        globalParamsWithoutLocale // API does not accept locale parameter
    );
    const shopperCustomers = createClient(
        createBaseClient<ShopperCustomers.endpoints>({
            baseUrl: `${baseUrl}/customer/shopper-customers/v1`,
            ...clientOptions,
        }),
        shopperCustomersOps,
        globalParamsWithoutLocale // API does not accept locale parameter
    );
    const shopperExperience = createClient(
        createBaseClient<ShopperExperience.endpoints>({
            baseUrl: `${baseUrl}/experience/shopper-experience/v1`,
            ...clientOptions,
        }),
        shopperExperienceOps,
        globalParams
    );
    const shopperGiftCertificates = createClient(
        createBaseClient<ShopperGiftCertificates.endpoints>({
            baseUrl: `${baseUrl}/pricing/shopper-gift-certificates/v1`,
            ...clientOptions,
        }),
        shopperGiftCertificatesOps,
        globalParamsWithoutLocale // API does not accept locale parameter
    );
    const shopperLogin = createClient(
        createBaseClient<ShopperLogin.endpoints>({
            baseUrl: `${baseUrl}/shopper/auth/v1`,
            ...clientOptions,
        }),
        shopperLoginOps,
        globalParams
    );
    const shopperOrders = createClient(
        createBaseClient<ShopperOrders.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-orders/v1`,
            ...clientOptions,
        }),
        shopperOrdersOps,
        globalParams
    );
    const shopperPayments = createClient(
        createBaseClient<ShopperPayments.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-payments/v1`,
            ...clientOptions,
        }),
        shopperPaymentsOps,
        globalParamsWithoutLocale // API does not accept locale parameter
    );
    const shopperProducts = createClient(
        createBaseClient<ShopperProducts.endpoints>({
            baseUrl: `${baseUrl}/product/shopper-products/v1`,
            ...clientOptions,
        }),
        shopperProductsOps,
        globalParams
    );
    const shopperPromotions = createClient(
        createBaseClient<ShopperPromotions.endpoints>({
            baseUrl: `${baseUrl}/pricing/shopper-promotions/v1`,
            ...clientOptions,
        }),
        shopperPromotionsOps,
        globalParams
    );
    const shopperSearch = createClient(
        createBaseClient<ShopperSearch.endpoints>({
            baseUrl: `${baseUrl}/search/shopper-search/v1`,
            ...clientOptions,
        }),
        shopperSearchOps,
        globalParams
    );
    const shopperSeo = createClient(
        createBaseClient<ShopperSeo.endpoints>({
            baseUrl: `${baseUrl}/site/shopper-seo/v1`,
            ...clientOptions,
        }),
        shopperSeoOps,
        globalParams
    );
    const shopperStores = createClient(
        createBaseClient<ShopperStores.endpoints>({
            baseUrl: `${baseUrl}/store/shopper-stores/v1`,
            ...clientOptions,
        }),
        shopperStoresOps,
        globalParams
    );

    const allClients = [
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

    // Create auth helpers namespace
    const auth = createAuthHelpers({
        shopperLoginClient: shopperLogin,
        clientId,
        clientSecret,
        redirectUri,
        organizationId,
        siteId,
        baseUrl,
    });
    const basket = createBasketHelpers({ shopperBasketsClient: shopperBasketsV2 });

    return {
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
