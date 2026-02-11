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
import { use, useEffect, useRef, useMemo, Suspense, Fragment } from 'react';
import { type LoaderFunctionArgs } from 'react-router';
import { type ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { currencyContext } from '@/lib/currency';
import ProductSkeleton from '@/components/product-skeleton';
import ProductView from '@/components/product-view';
import { Typography } from '@/components/typography';
import ChildProducts from '@/components/product-view/child-products';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import ProductRecommendations from '@/components/product-recommendations';
import { EINSTEIN_RECOMMENDERS } from '@/adapters/einstein';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/hooks/use-analytics';
import { Region } from '@/components/region';
import { ProductProvider } from '@/providers/product-context';
import ProductContentProvider from '@/providers/product-content';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { fetchPageWithComponentData, type PageWithComponentData } from '@/lib/util/pageLoader';
import { JsonLd } from '@/components/json-ld';
import { generateProductSchema } from '@/utils/product-schema';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { getCookieFromRequestAs, getSelectedStoreInfoCookieName } from '@/extensions/store-locator/utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import PickupProvider from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

@PageType({
    name: 'Product Detail Page',
    description: 'Product detail page with product information, images, and recommendations',
    supportedAspectTypes: ['pdp'],
})
@RegionDefinition([
    {
        id: 'promoContent',
        name: 'Promo Content Region',
        description: 'Promotional content region above main product content',
        maxComponents: 1,
    },
    {
        id: 'engagementContent',
        name: 'Engagement Content Region',
        description: 'Engagement content region for recommendations and related products below main content',
        maxComponents: 1,
    },
])
export class ProductPageMetadata {}

export type ProductPageData = {
    product: Promise<ShopperProducts.schemas['Product']>;
    category: Promise<ShopperProducts.schemas['Category'] | undefined>;
    page: Promise<PageWithComponentData>;
    pageKey: string;
    productSchema: Promise<ReturnType<typeof generateProductSchema> | null>;
};

/**
 * Server-side loader function that fetches product data and category information.
 * This function runs on the server during SSR and can access cookies for store information.
 * @returns Object containing product, category, page data, and component data promises
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs): ProductPageData {
    const { request, params, context } = args;
    const { productId = '' } = params;
    const { searchParams } = new URL(request.url);

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const cookieName = getSelectedStoreInfoCookieName();
    const selectedStoreInfo = getCookieFromRequestAs<SelectedStoreInfo>(request, cookieName);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Get currency from context for product pricing
    const currency = context.get(currencyContext) as string;
    if (!currency) {
        throw new Error('Currency not found in context');
    }

    const clients = createApiClients(context);
    const productPromise = clients.shopperProducts
        .getProduct({
            params: {
                path: {
                    // Check for variant product ID in search params (for product variants)
                    id: searchParams.get('pid') || productId,
                },
                query: {
                    expand: [
                        'availability', // <-- TTL = 60s (!)
                        'bundled_products',
                        'images',
                        'options',
                        'page_meta_tags',
                        'prices', // <-- TTL = 900s
                        'promotions', // <-- TTL = 900s
                        'set_products',
                        'variations',
                    ],
                    allImages: true,
                    perPricebook: true,
                    ...(currency ? { currency } : {}),
                    // @sfdc-extension-block-start SFDC_EXT_BOPIS
                    // Include inventoryIds parameter when store is selected
                    ...(selectedStoreInfo?.inventoryId ? { inventoryIds: [selectedStoreInfo.inventoryId] } : {}),
                    // @sfdc-extension-block-end SFDC_EXT_BOPIS
                },
            },
        })
        .then(({ data }) => data);

    // Create category promise that handles the optional fetch
    const categoryPromise = productPromise.then((product) => {
        if (product.primaryCategoryId) {
            return clients.shopperProducts
                .getCategory({
                    params: {
                        path: {
                            id: product.primaryCategoryId,
                        },
                        query: {
                            levels: 1,
                        },
                    },
                })
                .then(({ data }) => data)
                .catch(() => undefined);
        }

        // For variant products, try to get the master product's category
        if (!product.primaryCategoryId && product.master?.masterId) {
            return clients.shopperProducts
                .getProduct({
                    params: {
                        path: {
                            id: product.master.masterId,
                        },
                        query: {
                            ...(currency ? { currency } : {}),
                        },
                    },
                })
                .then(({ data: masterProduct }) => {
                    if (masterProduct.primaryCategoryId) {
                        return clients.shopperProducts
                            .getCategory({
                                params: {
                                    path: {
                                        id: masterProduct.primaryCategoryId,
                                    },
                                    query: {
                                        levels: 1, // Get subcategories
                                    },
                                },
                            })
                            .then(({ data }) => data);
                    }
                    return undefined;
                })
                .catch(() => undefined);
        }

        return undefined;
    });

    // Generate product schema in loader (server-side) for SEO
    // This ensures it's available immediately and can be rendered outside Suspense
    const productSchemaPromise = productPromise
        .then((product) => {
            try {
                // Construct absolute URL from request
                const url = new URL(request.url);
                const productUrl = `${url.origin}${url.pathname}${url.search}`;
                return generateProductSchema(product, productUrl);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error generating product schema in loader:', error);
                return null;
            }
        })
        .catch(() => null);

    return {
        product: productPromise,
        category: categoryPromise,
        /**
         * Fetch page data from Page Designer API with nested componentData promises.
         * Handle errors gracefully - return page with empty componentData if fetch failed.
         */
        page: fetchPageWithComponentData(args, {
            pageId: 'pdp',
            productId: searchParams.get('pid') || productId,
        }),
        pageKey: productId,
        productSchema: productSchemaPromise,
    };
}

/**
 * Prevent loader from re-running on variant parameter changes to avoid skeleton
 * https://reactrouter.com/start/data/route-object#shouldrevalidate
 * we don't want the page to show skeleton when loading variant product after first initial load
 */
// eslint-disable-next-line react-refresh/only-export-components
export function shouldRevalidate({
    currentUrl,
    nextUrl,
    defaultShouldRevalidate,
}: {
    currentUrl: string;
    nextUrl: string;
    defaultShouldRevalidate: boolean;
}) {
    const currentUrlObj = new URL(currentUrl);
    const nextUrlObj = new URL(nextUrl);

    // Revalidate if pathname changes (different product)
    if (currentUrlObj.pathname !== nextUrlObj.pathname) {
        return true;
    }

    // Revalidate if pid parameter changes (different variant product)
    const currentPid = currentUrlObj.searchParams.get('pid');
    const nextPid = nextUrlObj.searchParams.get('pid');
    if (currentPid !== nextPid) {
        return true;
    }

    // If defaultShouldRevalidate is true (e.g., from explicit revalidator.revalidate() call),
    // allow it to proceed even if URL hasn't changed
    // This allows store changes to trigger revalidation
    if (defaultShouldRevalidate) {
        return true;
    }

    // Don't revalidate for other search parameter changes (color, size, etc.)
    return false;
}

function ProductRecommendationsSection() {
    const { t } = useTranslation('product');

    // Memoize recommender configs to prevent unnecessary re-renders
    const completeSetRecommender = useMemo(
        () => ({
            name: EINSTEIN_RECOMMENDERS.PDP_COMPLETE_SET,
            title: t('recommendations.completeTheLook'),
        }),
        [t]
    );

    const mightAlsoLikeRecommender = useMemo(
        () => ({
            name: EINSTEIN_RECOMMENDERS.PDP_MIGHT_ALSO_LIKE,
            title: t('recommendations.youMightAlsoLike'),
        }),
        [t]
    );

    const recentlyViewedRecommender = useMemo(
        () => ({
            name: EINSTEIN_RECOMMENDERS.PDP_RECENTLY_VIEWED,
            title: t('recommendations.recentlyViewed'),
        }),
        [t]
    );

    return (
        <div className="mt-16 space-y-16">
            <ProductRecommendations recommender={completeSetRecommender} />
            <ProductRecommendations recommender={mightAlsoLikeRecommender} />
            <ProductRecommendations recommender={recentlyViewedRecommender} />
        </div>
    );
}

/**
 * Product view component that displays the product content.
 * This component receives loader data and renders the main product view including
 * breadcrumbs and product details. Uses React's use() hook to unwrap promises.
 * @returns JSX element representing the product page layout
 */

function ProductDetailView({ loaderData }: { loaderData: ProductPageData }) {
    const { product, category } = loaderData;
    const productData = use(product);
    const categoryData = use(category);
    const analytics = useAnalytics();
    const lastTrackedProductIdRef = useRef<string | null>(null);

    // Track product view on mount and whenever productData changes
    useEffect(() => {
        // Only track if we haven't already tracked this product
        if (productData.id !== lastTrackedProductIdRef.current) {
            void analytics.trackViewProduct({
                product: productData,
            });
            lastTrackedProductIdRef.current = productData.id;
        }
    }, [analytics, productData]);

    const isProductASet = isProductSet(productData);
    const isProductABundle = isProductBundle(productData);

    // Main product content - product view with details and images
    const mainProductContent = (
        <div className="space-y-8">
            {/* Mobile Product Title - shown on mobile only */}
            <div className="block md:hidden">
                <Typography variant="h1" className="text-2xl font-bold text-foreground">
                    {productData.name}
                </Typography>
                {productData.shortDescription && (
                    <Typography variant="p" className="mt-2 text-muted-foreground">
                        {productData.shortDescription}
                    </Typography>
                )}
            </div>
            {isProductASet || isProductABundle ? (
                <>
                    <ProductView product={productData} category={categoryData} />
                    <ChildProducts parentProduct={productData} />
                </>
            ) : (
                <ProductView product={productData} category={categoryData} />
            )}
        </div>
    );

    /**
     * Renders the page content based on Page Designer regions
     */
    const renderPageContent = (page: Promise<PageWithComponentData>) => {
        return (
            <>
                {/* Promo Content Region - Promotional content above main product */}
                <div className="mb-8">
                    <Region page={page} regionId="promoContent" errorElement={<div />} />
                </div>

                {/* Mobile Product Title - shown on mobile only */}
                <div className="block md:hidden mb-8">
                    <Typography variant="h1" className="text-2xl font-bold text-foreground">
                        {productData.name}
                    </Typography>
                    {productData.shortDescription && (
                        <Typography variant="p" className="mt-2 text-muted-foreground">
                            {productData.shortDescription}
                        </Typography>
                    )}
                </div>

                {/* Main Product Content - Always shown */}
                {mainProductContent}

                {/* Engagement Content Region - Shows page content or recommendations */}
                <div className="mt-16">
                    <Region page={page} regionId="engagementContent" errorElement={<ProductRecommendationsSection />} />
                </div>
            </>
        );
    };

    // Wrap entire page content with ProductContentProvider (PDP modals) and ProductProvider (product context)
    const content = (
        <ProductContentProvider>
            <ProductProvider product={productData}>
                <div className="min-h-screen bg-background">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {renderPageContent(loaderData.page)}
                    </div>
                </div>
            </ProductProvider>
        </ProductContentProvider>
    );

    let finalContent = content;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    finalContent = <PickupProvider>{content}</PickupProvider>;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    return finalContent;
}

/**
 * Product page component that displays a product with its details and category breadcrumbs.
 * This component wraps ProductDetailView with Suspense and uses a page key to prevent
 * skeleton from showing when switching between product variants (color, size, etc.).
 * The page key ensures React only remounts when navigating to a different product, not variants.
 * Uses React's use() hook internally to handle async data fetching.
 * @returns JSX element representing the product page with Suspense boundary
 */
/**
 * Component that renders JSON-LD schema when productSchema promise resolves.
 * Must be inside Suspense boundary to ensure it streams correctly in SSR.
 */
function JsonLdWrapper({
    productSchemaPromise,
}: {
    productSchemaPromise: Promise<ReturnType<typeof generateProductSchema> | null>;
}) {
    const productSchema = use(productSchemaPromise);
    return productSchema ? <JsonLd data={productSchema} id="product-schema" /> : null;
}

export default function ProductPage({ loaderData }: { loaderData: ProductPageData }) {
    // Use pageKey from loaderData to force remount only when productId changes
    // This prevents showing skeleton when switching variants (pid parameter)
    const pageKey = loaderData.pageKey;

    return (
        <Fragment key={pageKey}>
            {/* Product JSON-LD Schema for SEO - separate Suspense to ensure it appears at the very top of body */}
            <Suspense fallback={null}>
                <JsonLdWrapper productSchemaPromise={loaderData.productSchema} />
            </Suspense>
            <Suspense fallback={<ProductSkeleton />}>
                <ProductDetailView loaderData={loaderData} />
            </Suspense>
        </Fragment>
    );
}
