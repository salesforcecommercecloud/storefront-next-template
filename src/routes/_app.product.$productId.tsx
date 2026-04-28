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
import { use, useEffect, useRef, useMemo, Suspense, Fragment, lazy } from 'react';
import { Await, type LoaderFunctionArgs } from 'react-router';
import { type ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients.server';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import ProductContentSkeleton from '@/components/product-skeleton';
import ProductView from '@/components/product-view';
import ChildProducts from '@/components/product-view/child-products';
import CategoryBreadcrumbs from '@/components/category-breadcrumbs';
import { CategoryBreadcrumbsSkeleton } from '@/components/category-breadcrumbs/skeleton';

// Lazy-load reviews section to reduce initial PDP bundle (reviews chunk loads with product page)
const CustomerReviewsSection = lazy(() =>
    import('@/components/customer-reviews-section').then((m) => ({ default: m.CustomerReviewsSection }))
);
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import ProductRecommendations from '@/components/product-recommendations';
import { EINSTEIN_RECOMMENDERS } from '@/adapters/einstein';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/hooks/use-analytics';
import { Region } from '@/components/region';
import { ProductProvider } from '@/providers/product-context';
import ProductContentProvider from '@/providers/product-content';
import { ProductReviewsProvider } from '@/providers/product-reviews-context';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { fetchPageWithComponentData } from '@/lib/util/pageLoader.server';
import { JsonLd } from '@/components/json-ld';
import { SeoMeta } from '@/components/seo-meta';
import { generateProductSchema } from '@/utils/product-schema';
import { getPublicOrigin } from '@/utils/schema-url';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { getLogger } from '@/lib/logger.server';
import { UITarget } from '@/targets/ui-target';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { selectedStoreContext } from '@/extensions/store-locator/middlewares/selected-store.server';
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
    page: ReturnType<typeof fetchPageWithComponentData>;
    pageKey: string;
    pageUrl: string;
    productSchema: Promise<ReturnType<typeof generateProductSchema> | null>;
};

/**
 * Server-side loader function that fetches product data and category information.
 * This function runs on the server during SSR and can access cookies for store information.
 * @returns Object containing product, category, page data, and component data promises
 */
export function loader(args: LoaderFunctionArgs): ProductPageData {
    const { request, params, context } = args;
    const logger = getLogger(context);
    const { productId = '' } = params;
    const requestUrl = new URL(request.url);
    const { searchParams } = requestUrl;
    const variantPid = searchParams.get('pid');
    logger.debug('Product: loader starting', { productId, variantPid: variantPid || undefined });

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const selectedStoreInfo = context.get(selectedStoreContext);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Get currency from context for product pricing
    const siteCtx = context.get(siteContext);
    if (!siteCtx) {
        logger.error('Product: site context is not available');
        throw new Response('Site context is not available', { status: 500 });
    }
    const { currency } = siteCtx;

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

    const pageUrl = buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search);

    // Generate product schema in loader (server-side) for SEO
    // This ensures it's available immediately and can be rendered outside Suspense
    const productSchemaPromise = productPromise
        .then((product) => {
            try {
                // Use public origin from request headers instead of request.url
                // to avoid exposing internal AWS Lambda URLs in schema
                const publicOrigin = getPublicOrigin(request);
                const url = new URL(request.url);
                const productUrl = `${publicOrigin}${url.pathname}${url.search}`;
                return generateProductSchema(product, productUrl);
            } catch (error) {
                logger.error('Error generating product schema in loader', {
                    error,
                });
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
        pageUrl,
        productSchema: productSchemaPromise,
    };
}

/**
 * Prevent loader from re-running on variant parameter changes to avoid skeleton
 * https://reactrouter.com/start/data/route-object#shouldrevalidate
 * we don't want the page to show skeleton when loading variant product after first initial load
 */
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
            <ProductRecommendations recommender={completeSetRecommender} className="max-w-none px-0" />
            <ProductRecommendations recommender={mightAlsoLikeRecommender} className="max-w-none px-0" />
            <ProductRecommendations recommender={recentlyViewedRecommender} className="max-w-none px-0" />
        </div>
    );
}

function ProductContent({ product, url }: { product: ShopperProducts.schemas['Product']; url: string }) {
    const analytics = useAnalytics();
    const lastTrackedProductIdRef = useRef<string | null>(null);

    const primaryImage =
        product.imageGroups?.find((g) => g.viewType === 'large')?.images?.[0]?.link ??
        product.imageGroups?.[0]?.images?.[0]?.link;

    // Track product view on mount and whenever productData changes
    useEffect(() => {
        // Only track if we haven't already tracked this product
        if (product.id !== lastTrackedProductIdRef.current) {
            void analytics.trackViewProduct({
                product,
            });
            lastTrackedProductIdRef.current = product.id;
        }
    }, [analytics, product]);

    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);

    return (
        <ProductProvider product={product}>
            <ProductContentProvider>
                <ProductReviewsProvider>
                    <SeoMeta
                        title={product.name}
                        description={product.pageDescription || product.shortDescription}
                        openGraph={{
                            type: 'product',
                            url,
                            image: primaryImage,
                        }}
                    />
                    <div className="space-y-8">
                        {isProductASet || isProductABundle ? (
                            <>
                                <ProductView product={product} />
                                <ChildProducts parentProduct={product} />
                            </>
                        ) : (
                            <ProductView product={product} />
                        )}

                        {/* Customer Reviews Section (lazy-loaded to reduce initial bundle) */}
                        <Suspense fallback={null}>
                            <CustomerReviewsSection />
                        </Suspense>
                        <UITarget targetId="sfcc.pdp.reviews.qna" />
                    </div>
                </ProductReviewsProvider>
            </ProductContentProvider>
        </ProductProvider>
    );
}

/**
 * Product detail shell that composes the page layout with granular Suspense boundaries.
 * Regions render independently (they manage their own async via Suspense/Await),
 * while the core product content suspends only where use() data is needed.
 */
function ProductDetailView({ loaderData }: { loaderData: ProductPageData }) {
    const content = (
        <div className="min-h-screen bg-background">
            <div className="section-container pb-4 lg:pb-8">
                {/* Promo Content Region - Promotional content above main product */}
                <Region className="mb-8" page={loaderData.page} regionId="promoContent" />

                {/* Category breadcrumbs - streams independently of product data */}
                <Suspense fallback={<CategoryBreadcrumbsSkeleton />}>
                    <Await resolve={loaderData.category}>
                        {(category) => (category ? <CategoryBreadcrumbs category={category} /> : null)}
                    </Await>
                </Suspense>

                {/* Main Product Content - Suspends until product data resolves */}
                <Suspense fallback={<ProductContentSkeleton />}>
                    <Await resolve={loaderData.product}>
                        {(product) => <ProductContent product={product} url={loaderData.pageUrl} />}
                    </Await>
                </Suspense>

                {/* Engagement Content Region - Shows page content or recommendations */}
                <Region
                    className="mt-16"
                    page={loaderData.page}
                    regionId="engagementContent"
                    errorElement={<ProductRecommendationsSection />}
                />
            </div>
        </div>
    );

    let finalContent = content;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    finalContent = <PickupProvider>{content}</PickupProvider>;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    return finalContent;
}

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

/**
 * Product page component that displays a product with its details and category breadcrumbs.
 * The page key ensures React only remounts when navigating to a different product, not variants.
 * Uses React's use() hook internally to handle async data fetching.
 * @returns JSX element representing the product page with Suspense boundary
 */
export default function ProductPage({ loaderData }: { loaderData: ProductPageData }) {
    // Use pageKey from loaderData to force remount only when productId changes
    // This prevents showing skeleton when switching variants (pid parameter)
    const pageKey = loaderData.pageKey;

    return (
        <Fragment key={pageKey}>
            <ProductDetailView loaderData={loaderData} />

            {/* Product JSON-LD Schema for SEO - render after page content so it appears at end of body flow */}
            <Suspense fallback={null}>
                <JsonLdWrapper productSchemaPromise={loaderData.productSchema} />
            </Suspense>
        </Fragment>
    );
}
