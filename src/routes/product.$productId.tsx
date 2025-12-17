import { use, useEffect, useRef } from 'react';
import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { type ShopperProducts, type ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import ProductSkeleton from '@/components/product-skeleton';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import ProductView from '@/components/product-view';
import { Typography } from '@/components/typography';
import ChildProducts from '@/components/product-view/child-products';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import ProductRecommendations from '@/components/product-recommendations';
import { EINSTEIN_RECOMMENDERS } from '@/adapters/einstein';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/hooks/use-analytics';
import { Region } from '@/components/region';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { collectComponentDataPromises, fetchPageFromLoader } from '@/lib/util/pageLoader';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import {
    getCookieFromRequestAs,
    getCookieFromDocumentAs,
    getSelectedStoreInfoCookieName,
} from '@/extensions/store-locator/utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import PickupProvider from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS
import { PluginComponent } from '@/plugins/plugin-components';
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
    page: Promise<ShopperExperience.schemas['Page']>;
    componentData: Promise<Record<string, Promise<unknown>>>;
    pageKey: string;
};

/**
 * Internal helper function that fetches product data and category information.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @param selectedStoreInfo - Optional store information for inventory-specific data
 * @returns Promise that resolves to an object containing product and category data promises
 */
function getPageData(
    // @sfdc-extension-line SFDC_EXT_BOPIS
    selectedStoreInfo: SelectedStoreInfo | null,
    { request, params, context }: LoaderFunctionArgs
): ProductPageData {
    const { productId = '' } = params;
    const { searchParams } = new URL(request.url);

    // Check for variant product ID in search params (for product variants)
    const clients = createApiClients(context);
    const productPromise = clients.shopperProducts
        .getProduct({
            params: {
                path: {
                    id: searchParams.get('pid') || productId,
                },
                query: {
                    expand: [
                        'availability',
                        'bundled_products',
                        'images',
                        'options',
                        'page_meta_tags',
                        'prices',
                        'promotions',
                        'set_products',
                        'variations',
                    ],
                    allImages: true,
                    perPricebook: true,
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

    // Fetch page data from Page Designer API
    const pagePromise = fetchPageFromLoader(
        { request, params, context },
        {
            pageId: 'pdp',
        }
    );

    // Collect component data promises for components in regions
    // Handle errors gracefully - return empty object if page fetch failed
    const componentDataPromises = pagePromise
        .then((page) => {
            return collectComponentDataPromises({ request, params, context }, Promise.resolve(page));
        })
        .catch(() => {
            return Promise.resolve({});
        });

    return {
        product: productPromise,
        category: categoryPromise,
        page: pagePromise,
        componentData: componentDataPromises,
        pageKey: productId,
    };
}
/**
 * Server-side loader function that fetches product data and category information.
 * This function runs on the server during SSR and can access cookies for store information.
 * @returns Promise that resolves to an object containing product and category promises
 */
export function loader({ request, params, context }: LoaderFunctionArgs) {
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const cookieName = getSelectedStoreInfoCookieName();
    const selectedStoreInfo = getCookieFromRequestAs<SelectedStoreInfo>(request, cookieName);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    return getPageData(
        // @sfdc-extension-line SFDC_EXT_BOPIS
        selectedStoreInfo,
        { request, params, context }
    );
}

/**
 * Client-side loader function that handles data loading for client-side navigation.
 * This function can access client-side cookies to get store selection information
 * and fetch product data with inventory-specific information.
 * @returns Promise that resolves to an object containing product and category promises
 */
export function clientLoader({ request, params, context }: ClientLoaderFunctionArgs): ProductPageData {
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const cookieName = getSelectedStoreInfoCookieName();
    const selectedStoreInfo = getCookieFromDocumentAs<SelectedStoreInfo>(cookieName);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    return getPageData(
        // @sfdc-extension-line SFDC_EXT_BOPIS
        selectedStoreInfo,
        { request, params, context }
    );
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

/**
 * Product Recommendations Section
 * Displays 3 Einstein recommenders: You might also like, Complete the look, and Recently viewed
 */
// eslint-disable-next-line react-refresh/only-export-components
function ProductRecommendationsSection({ product }: { product: ShopperProducts.schemas['Product'] }) {
    const { t } = useTranslation('product');

    return (
        <div className="mt-16 space-y-16">
            <ProductRecommendations
                recommender={{
                    name: EINSTEIN_RECOMMENDERS.PDP_COMPLETE_SET,
                    title: t('recommendations.completeTheLook'),
                }}
                products={[product]}
            />
            <ProductRecommendations
                recommender={{
                    name: EINSTEIN_RECOMMENDERS.PDP_MIGHT_ALSO_LIKE,
                    title: t('recommendations.youMightAlsoLike'),
                }}
                products={[product]}
            />
            <ProductRecommendations
                recommender={{
                    name: EINSTEIN_RECOMMENDERS.PDP_RECENTLY_VIEWED,
                    title: t('recommendations.recentlyViewed'),
                }}
                products={[product]}
            />
        </div>
    );
}

/**
 * Product view component that displays the product content.
 * This component receives loader data and renders the main product view including
 * breadcrumbs and product details.
 * @returns JSX element representing the product page layout
 */
// eslint-disable-next-line react-refresh/only-export-components
function ProductDetailView({ loaderData }: RouteComponentProps<ProductPageData>) {
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
    const renderPageContent = (page: Promise<ShopperExperience.schemas['Page']>) => {
        return (
            <>
                {/* Promo Content Region - Promotional content above main product */}
                {
                    <div className="mb-8">
                        <Region
                            page={page}
                            regionId="promoContent"
                            componentData={loaderData.componentData}
                            fallback={<div />}
                        />
                    </div>
                }

                {/* Mobile Product Title - shown on mobile only, always shown */}
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
                    <Region
                        page={page}
                        regionId="engagementContent"
                        componentData={loaderData.componentData}
                        fallback={<ProductRecommendationsSection product={productData} />}
                    />
                </div>
            </>
        );
    };

    const content = (
        <>
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderPageContent(loaderData.page)}</div>
        </div>
        </>
    );

    let finalContent = content;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    finalContent = <PickupProvider>{content}</PickupProvider>;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
    return (
        <>
            {finalContent}
            <PluginComponent pluginId='product.detail.after.content' />
        </>
    );
}

/**
 * Product page component that displays a product with its details and category breadcrumbs.
 * This component uses the createPage factory to handle Suspense patterns and data loading.
 * The page factory automatically handles the Suspense boundary and passes loader data
 * directly to the ProductView component.
 * @returns A page component created by the createPage factory
 */
// eslint-disable-next-line react-refresh/only-export-components
export default createPage<ProductPageData>({
    component: ProductDetailView,
    fallback: <ProductSkeleton />,
    getPageKey: (_loaderData) => {
        // we only want to show skeleton again if the product has changed and don't worry about params
        // changes. This will give us the ability to fetch variant product lazily in the background
        // (using pid search params) without interupting UX
        return _loaderData.pageKey;
    },
});
