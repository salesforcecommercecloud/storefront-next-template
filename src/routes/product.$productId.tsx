import { use, useEffect, useRef, Suspense } from 'react';
import { Await, type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import {
    type ShopperProducts,
    type ShopperSearch,
    type ShopperExperience,
} from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import ProductSkeleton from '@/components/product-skeleton';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import ProductView from '@/components/product-view';
import { Typography } from '@/components/typography';
import ChildProducts from '@/components/product-view/child-products';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import { generateRecommendationPromises } from '@/lib/recommendations';
import { ProductRecommendationsSkeleton } from '@/components/product/skeletons';
import withSuspense from '@/components/with-suspense';
import { ProductCarouselWithSuspense } from '@/components/product-carousel';
import { useAnalytics } from '@/hooks/use-analytics';
import { Region } from '@/components/region';
import { PageType } from '@/lib/decorators/page-type';
import { getRegionDefinition, RegionDefinition } from '@/lib/decorators/region-definition';
import { collectComponentDataPromises, fetchPageFromLoader } from '@/lib/util/pageLoader';
import { getTranslation } from '@/lib/i18next';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import {
    getCookieFromRequestAs,
    getCookieFromDocumentAs,
    getSelectedStoreInfoCookieName,
} from '@/extensions/store-locator/utils';
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

type ProductPageData = {
    product: Promise<ShopperProducts.schemas['Product']>;
    category: Promise<ShopperProducts.schemas['Category'] | undefined>;
    recommendations: Promise<
        Array<{
            config: { id: string; title: string };
            promise: Promise<ShopperSearch.schemas['ProductSearchResult']>;
        }>
    >;
    page: Promise<ShopperExperience.schemas['Page']>;
    componentData: Promise<Record<string, Promise<unknown>>>;
    pageKey: string;
};

/**
 * Internal helper function that fetches product data and category information.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @param selectedStoreInfo - Optional store information for inventory-specific data
 * @param i18nextInstance - i18next instance for translations (server-only, null on client)
 * @returns Promise that resolves to an object containing product and category data promises
 */
function getPageData(
    // @sfdc-extension-line SFDC_EXT_BOPIS
    selectedStoreInfo: SelectedStoreInfo | null,
    { request, params, context }: LoaderFunctionArgs,
    i18nextInstance: i18n | null = null
): ProductPageData {
    const { productId = '' } = params;
    const { searchParams } = new URL(request.url);
    const config = getConfig(context);

    // Check for variant product ID in search params (for product variants)
    const clients = createApiClients(context);
    const productPromise = clients.shopperProducts
        .getProduct({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                    id: searchParams.get('pid') || productId,
                },
                query: {
                    siteId: config.commerce.api.siteId,
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
                            organizationId: config.commerce.api.organizationId,
                            id: product.primaryCategoryId,
                        },
                        query: {
                            siteId: config.commerce.api.siteId,
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
                            organizationId: config.commerce.api.organizationId,
                            id: product.master.masterId,
                        },
                        query: {
                            siteId: config.commerce.api.siteId,
                        },
                    },
                })
                .then(({ data: masterProduct }) => {
                    if (masterProduct.primaryCategoryId) {
                        return clients.shopperProducts
                            .getCategory({
                                params: {
                                    path: {
                                        organizationId: config.commerce.api.organizationId,
                                        id: masterProduct.primaryCategoryId,
                                    },
                                    query: {
                                        siteId: config.commerce.api.siteId,
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

    // Generate recommendations promise that depends on product and category data
    const recommendationsPromise = Promise.all([productPromise, categoryPromise]).then(async ([product, category]) => {
        // Always use the master product ID for recommendations to ensure consistency
        const baseProduct = {
            ...product,
            // Force the ID to be the master product ID for recommendations
            id: product.master?.masterId || product.id,
        };

        // Extract subcategories from the parent category for recommendations
        let subcategories: Array<{ id: string; name: string; parentCategoryId: string }> = [];
        if (category?.parentCategoryId) {
            const parentCategoryResponse = await clients.shopperProducts.getCategory({
                params: {
                    path: {
                        organizationId: config.commerce.api.organizationId,
                        id: category.parentCategoryId,
                    },
                    query: {
                        siteId: config.commerce.api.siteId,
                        levels: 1, // Get subcategories
                    },
                },
            });
            const parentCategory = parentCategoryResponse.data;
            subcategories =
                parentCategory.categories?.map((sub) => ({
                    id: sub.id,
                    name: sub.name || '',
                    parentCategoryId: sub.parentCategoryId || category.parentCategoryId || '',
                })) || [];
        }

        return generateRecommendationPromises(
            context,
            {
                product: baseProduct,
                category,
                subcategories,
            },
            i18nextInstance
        );
    });

    // Fetch page data from Page Designer API
    // Catch 404 errors (page doesn't exist) and return empty page structure
    const pagePromise = fetchPageFromLoader(
        { request, params, context },
        {
            pageId: 'pdp',
        }
    ).catch((error) => {
        // If page doesn't exist (404), return empty page structure
        // This allows the fallback content to render
        if (error?.status === 404 || error?.message?.includes('404')) {
            return {
                id: '',
                typeId: '',
                regions: [],
            } as ShopperExperience.schemas['Page'];
        }
        // Re-throw other errors
        throw error;
    }) as Promise<ShopperExperience.schemas['Page']>;

    // Collect component data promises for components in regions
    // Handle errors gracefully - return empty object if page fetch failed
    const componentDataPromises = pagePromise
        .then((page) => {
            return collectComponentDataPromises({ request, params, context }, Promise.resolve(page));
        })
        .catch(() => {
            // Return empty component data if collection fails
            return Promise.resolve({});
        });

    return {
        product: productPromise,
        category: categoryPromise,
        recommendations: recommendationsPromise,
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

    const { i18next } = getTranslation(context);

    return getPageData(
        // @sfdc-extension-line SFDC_EXT_BOPIS
        selectedStoreInfo,
        { request, params, context },
        i18next
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

    // On client side, we don't have access to i18next instance (server-only)
    // Fall back to titleKey as the title
    return getPageData(
        // @sfdc-extension-line SFDC_EXT_BOPIS
        selectedStoreInfo,
        { request, params, context },
        null
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

type PageRegion = NonNullable<ShopperExperience.schemas['Page']['regions']>[number];

/**
 * Helper function to check if a region exists and has valid components
 */
function hasRegionWithComponents(region: PageRegion | undefined): boolean {
    if (!region || !region.components || region.components.length === 0) {
        return false;
    }
    // Check if components have valid id and typeId (required for rendering)
    return region.components.some((component: { id?: string; typeId?: string }) => component.id && component.typeId);
}

/**
 * Processes page data to extract regions and metadata for rendering
 */
function processPageData(page: ShopperExperience.schemas['Page']) {
    const { regions } = page;
    const promoContentRegion = regions?.find((region) => region.id === 'promoContent');
    const engagementContentRegion = regions?.find((region) => region.id === 'engagementContent');
    const promoContentDesignMetadata = getRegionDefinition(ProductPageMetadata, 'promoContent');
    const engagementContentDesignMetadata = getRegionDefinition(ProductPageMetadata, 'engagementContent');

    const hasPromoContent = hasRegionWithComponents(promoContentRegion);
    const hasEngagementContent = hasRegionWithComponents(engagementContentRegion);

    return {
        promoContentRegion,
        engagementContentRegion,
        promoContentDesignMetadata,
        engagementContentDesignMetadata,
        hasPromoContent,
        hasEngagementContent,
    };
}

/**
 * Component that handles async loading of recommendations with Suspense
 */
// eslint-disable-next-line react-refresh/only-export-components
const RecommendationsContent = ({
    data,
}: {
    data: Array<{
        config: { id: string; title: string };
        promise: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    }>;
}) => {
    if (!data || data.length === 0) {
        return null;
    }

    // Render all carousels - individual carousels will return null if they have no products
    // React will automatically filter out null values from the rendered output
    return (
        <>
            {data.map(({ config, promise }, idx) => (
                <ProductCarouselWithSuspense
                    className={idx > 0 ? 'mt-16' : ''}
                    key={config.id}
                    resolve={promise}
                    title={config.title}
                />
            ))}
        </>
    );
};

const Recommendations = withSuspense(RecommendationsContent, {
    fallback: <ProductRecommendationsSkeleton />,
}) as React.ComponentType<{
    resolve: Promise<
        Array<{ config: { id: string; title: string }; promise: Promise<ShopperSearch.schemas['ProductSearchResult']> }>
    >;
}>;

/**
 * Product view component that displays the product content.
 * This component receives loader data and renders the main product view including
 * breadcrumbs and product details.
 * @returns JSX element representing the product page layout
 */
// eslint-disable-next-line react-refresh/only-export-components
function ProductDetailView({ loaderData }: RouteComponentProps<ProductPageData>) {
    const { product, category, recommendations: recommendationsPromise } = loaderData;
    const productData = use(product);
    const categoryData = use(category);
    const analytics = useAnalytics();
    const lastTrackedProductIdRef = useRef<string | null>(null);

    // Track product view on mount and whenever productData changes
    useEffect(() => {
        // Only track if we haven't already tracked this product
        if (productData.id !== lastTrackedProductIdRef.current) {
            analytics.trackViewProduct({
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
    const renderPageContent = (page: ShopperExperience.schemas['Page']) => {
        const {
            promoContentRegion,
            engagementContentRegion,
            promoContentDesignMetadata,
            engagementContentDesignMetadata,
            hasPromoContent,
            hasEngagementContent,
        } = processPageData(page);

        return (
            <>
                {/* Promo Content Region - Promotional content above main product */}
                {hasPromoContent && promoContentRegion && (
                    <div className="mb-8">
                        <Region
                            region={promoContentRegion}
                            metadata={promoContentDesignMetadata}
                            key={promoContentRegion.id}
                            componentData={loaderData.componentData}
                        />
                    </div>
                )}

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
                {hasEngagementContent && engagementContentRegion ? (
                    <div className="mt-16">
                        <Region
                            region={engagementContentRegion}
                            metadata={engagementContentDesignMetadata}
                            key={engagementContentRegion.id}
                            componentData={loaderData.componentData}
                        />
                    </div>
                ) : (
                    <div className="mt-16">
                        <Recommendations resolve={recommendationsPromise} />
                    </div>
                )}
            </>
        );
    };

    const content = (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Suspense fallback={<div />}>
                    <Await resolve={loaderData.page} errorElement={<div />}>
                        {renderPageContent}
                    </Await>
                </Suspense>
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
