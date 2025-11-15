import createBaseClient, { type Middleware, type ClientOptions, type Client } from 'openapi-fetch';
import type {
    ShopperBasketsV1,
    ShopperBasketsV2,
    ShopperConsents,
    ShopperContext,
    ShopperCustomers,
    ShopperExperience,
    ShopperGiftCertificates,
    ShopperLogin,
    ShopperOrders,
    ShopperProducts,
    ShopperPromotions,
    ShopperSearch,
    ShopperSeo,
    ShopperStores,
} from './types';
import { createClient } from './createClient';
import { defaultQuerySerializer } from './defaultQuerySerializer';
import type { ProxyClient } from './proxy-types';

// Import operation maps for all APIs
import { operations as shopperBasketsV1Ops } from './generated/shopper-baskets-v1.operations';
import { operations as shopperBasketsV2Ops } from './generated/shopper-baskets-v2.operations';
import { operations as shopperConsentsOps } from './generated/shopper-consents-v1.operations';
import { operations as shopperContextOps } from './generated/shopper-context-v1.operations';
import { operations as shopperCustomersOps } from './generated/shopper-customers-v1.operations';
import { operations as shopperExperienceOps } from './generated/shopper-experience-v1.operations';
import { operations as shopperGiftCertificatesOps } from './generated/shopper-gift-certificates-v1.operations';
import { operations as shopperLoginOps } from './generated/shopper-login-v1.operations';
import { operations as shopperOrdersOps } from './generated/shopper-orders-v1.operations';
import { operations as shopperProductsOps } from './generated/shopper-products-v1.operations';
import { operations as shopperPromotionsOps } from './generated/shopper-promotions-v1.operations';
import { operations as shopperSearchOps } from './generated/shopper-search-v1.operations';
import { operations as shopperSeoOps } from './generated/shopper-seo-v1.operations';
import { operations as shopperStoresOps } from './generated/shopper-stores-v1.operations';

export type Clients = {
    shopperBasketsV1: ProxyClient<Client<ShopperBasketsV1.endpoints>, typeof shopperBasketsV1Ops>;
    shopperBasketsV2: ProxyClient<Client<ShopperBasketsV2.endpoints>, typeof shopperBasketsV2Ops>;
    shopperConsents: ProxyClient<Client<ShopperConsents.endpoints>, typeof shopperConsentsOps>;
    shopperContext: ProxyClient<Client<ShopperContext.endpoints>, typeof shopperContextOps>;
    shopperCustomers: ProxyClient<Client<ShopperCustomers.endpoints>, typeof shopperCustomersOps>;
    shopperExperience: ProxyClient<Client<ShopperExperience.endpoints>, typeof shopperExperienceOps>;
    shopperGiftCertificates: ProxyClient<Client<ShopperGiftCertificates.endpoints>, typeof shopperGiftCertificatesOps>;
    shopperLogin: ProxyClient<Client<ShopperLogin.endpoints>, typeof shopperLoginOps>;
    shopperOrders: ProxyClient<Client<ShopperOrders.endpoints>, typeof shopperOrdersOps>;
    shopperProducts: ProxyClient<Client<ShopperProducts.endpoints>, typeof shopperProductsOps>;
    shopperPromotions: ProxyClient<Client<ShopperPromotions.endpoints>, typeof shopperPromotionsOps>;
    shopperSearch: ProxyClient<Client<ShopperSearch.endpoints>, typeof shopperSearchOps>;
    shopperSeo: ProxyClient<Client<ShopperSeo.endpoints>, typeof shopperSeoOps>;
    shopperStores: ProxyClient<Client<ShopperStores.endpoints>, typeof shopperStoresOps>;
    use: (middleware: Middleware) => void;
};

export function createCommerceApiClients(config: ClientOptions): Clients {
    const { baseUrl, fetch: customFetch, querySerializer, ...rest } = config;

    const clientOptions = {
        ...(customFetch ? { fetch: customFetch } : {}),
        querySerializer: querySerializer || defaultQuerySerializer,
        ...rest,
    };

    // Create base clients and wrap with proxy for operation methods
    const shopperBasketsV1 = createClient(
        createBaseClient<ShopperBasketsV1.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-baskets/v1`,
            ...clientOptions,
        }),
        shopperBasketsV1Ops
    );
    const shopperBasketsV2 = createClient(
        createBaseClient<ShopperBasketsV2.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-baskets/v2`,
            ...clientOptions,
        }),
        shopperBasketsV2Ops
    );
    const shopperConsents = createClient(
        createBaseClient<ShopperConsents.endpoints>({
            baseUrl: `${baseUrl}/shopper/shopper-consents/v1`,
            ...clientOptions,
        }),
        shopperConsentsOps
    );
    const shopperContext = createClient(
        createBaseClient<ShopperContext.endpoints>({
            baseUrl: `${baseUrl}/shopper/shopper-context/v1`,
            ...clientOptions,
        }),
        shopperContextOps
    );
    const shopperCustomers = createClient(
        createBaseClient<ShopperCustomers.endpoints>({
            baseUrl: `${baseUrl}/customer/shopper-customers/v1`,
            ...clientOptions,
        }),
        shopperCustomersOps
    );
    const shopperExperience = createClient(
        createBaseClient<ShopperExperience.endpoints>({
            baseUrl: `${baseUrl}/experience/shopper-experience/v1`,
            ...clientOptions,
        }),
        shopperExperienceOps
    );
    const shopperGiftCertificates = createClient(
        createBaseClient<ShopperGiftCertificates.endpoints>({
            baseUrl: `${baseUrl}/pricing/shopper-gift-certificates/v1`,
            ...clientOptions,
        }),
        shopperGiftCertificatesOps
    );
    const shopperLogin = createClient(
        createBaseClient<ShopperLogin.endpoints>({
            baseUrl: `${baseUrl}/shopper/auth/v1`,
            ...clientOptions,
        }),
        shopperLoginOps
    );
    const shopperOrders = createClient(
        createBaseClient<ShopperOrders.endpoints>({
            baseUrl: `${baseUrl}/checkout/shopper-orders/v1`,
            ...clientOptions,
        }),
        shopperOrdersOps
    );
    const shopperProducts = createClient(
        createBaseClient<ShopperProducts.endpoints>({
            baseUrl: `${baseUrl}/product/shopper-products/v1`,
            ...clientOptions,
        }),
        shopperProductsOps
    );
    const shopperPromotions = createClient(
        createBaseClient<ShopperPromotions.endpoints>({
            baseUrl: `${baseUrl}/pricing/shopper-promotions/v1`,
            ...clientOptions,
        }),
        shopperPromotionsOps
    );
    const shopperSearch = createClient(
        createBaseClient<ShopperSearch.endpoints>({
            baseUrl: `${baseUrl}/search/shopper-search/v1`,
            ...clientOptions,
        }),
        shopperSearchOps
    );
    const shopperSeo = createClient(
        createBaseClient<ShopperSeo.endpoints>({
            baseUrl: `${baseUrl}/site/shopper-seo/v1`,
            ...clientOptions,
        }),
        shopperSeoOps
    );
    const shopperStores = createClient(
        createBaseClient<ShopperStores.endpoints>({
            baseUrl: `${baseUrl}/store/shopper-stores/v1`,
            ...clientOptions,
        }),
        shopperStoresOps
    );

    const allClients = [
        shopperBasketsV1,
        shopperBasketsV2,
        shopperConsents,
        shopperContext,
        shopperCustomers,
        shopperExperience,
        shopperGiftCertificates,
        shopperLogin,
        shopperOrders,
        shopperProducts,
        shopperPromotions,
        shopperSearch,
        shopperSeo,
        shopperStores,
    ];

    return {
        shopperBasketsV1,
        shopperBasketsV2,
        shopperConsents,
        shopperContext,
        shopperCustomers,
        shopperExperience,
        shopperGiftCertificates,
        shopperLogin,
        shopperOrders,
        shopperProducts,
        shopperPromotions,
        shopperSearch,
        shopperSeo,
        shopperStores,
        use: (middleware: Middleware) => {
            allClients.forEach((client) => client.use(middleware));
        },
    };
}
