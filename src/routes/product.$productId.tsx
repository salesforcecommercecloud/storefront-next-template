import { use } from 'react';
import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperProductsTypes, ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';
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
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import {
    getCookieFromRequestAs,
    getCookieFromDocumentAs,
    getSelectedStoreInfoCookieName,
} from '@/extensions/store-locator/utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import PickupProvider from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

type ProductPageData = {
    product: Promise<ShopperProductsTypes.Product>;
    category: Promise<ShopperProductsTypes.Category | undefined>;
    recommendations: Promise<
        Array<{
            config: { id: string; title: string };
            promise: Promise<ShopperSearchTypes.ProductSearchResult>;
        }>
    >;
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
    const client = createClient(context);
    const productPromise = client.ShopperProducts.getProduct({
        parameters: {
            id: searchParams.get('pid') || productId,
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
    });

    // Create category promise that handles the optional fetch
    const categoryPromise = productPromise.then((product) => {
        if (product.primaryCategoryId) {
            return client.ShopperProducts.getCategory({
                parameters: {
                    id: product.primaryCategoryId,
                    levels: 1,
                },
            }).catch(() => undefined);
        }

        // For variant products, try to get the master product's category
        if (!product.primaryCategoryId && product.master?.masterId) {
            return client.ShopperProducts.getProduct({
                parameters: { id: product.master.masterId },
            })
                .then((masterProduct) => {
                    if (masterProduct.primaryCategoryId) {
                        return client.ShopperProducts.getCategory({
                            parameters: {
                                id: masterProduct.primaryCategoryId,
                                levels: 1, // Get subcategories
                            },
                        });
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
            const parentCategoryPromise = client.ShopperProducts.getCategory({
                parameters: {
                    id: category.parentCategoryId,
                    levels: 1, // Get subcategories
                },
            });
            const parentCategory = await parentCategoryPromise;
            subcategories =
                parentCategory.categories?.map((sub: ShopperProductsTypes.Category) => ({
                    id: sub.id,
                    name: sub.name || '',
                    parentCategoryId: sub.parentCategoryId || category.parentCategoryId || '',
                })) || [];
        }

        return generateRecommendationPromises(context, {
            product: baseProduct,
            category,
            subcategories,
        });
    });

    return {
        product: productPromise,
        category: categoryPromise,
        recommendations: recommendationsPromise,
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
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: string; nextUrl: string }) {
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

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Revalidate if inventoryId parameter changes (different store selection)
    const currentInventoryId = currentUrlObj.searchParams.get('inventoryId');
    const nextInventoryId = nextUrlObj.searchParams.get('inventoryId');
    if (currentInventoryId !== nextInventoryId) {
        return true;
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Don't revalidate for other search parameter changes (color, size, etc.)
    return false;
}

/**
 * Component that handles async loading of recommendations with Suspense
 */
// eslint-disable-next-line react-refresh/only-export-components
const RecommendationsContent = ({
    data,
}: {
    data: Array<{ config: { id: string; title: string }; promise: Promise<ShopperSearchTypes.ProductSearchResult> }>;
}) => {
    if (!data || data.length === 0) {
        return null;
    }

    // Render all carousels - individual carousels will return null if they have no products
    // React will automatically filter out null values from the rendered output
    return (
        <>
            {data.map(({ config, promise }) => (
                <ProductCarouselWithSuspense key={config.id} resolve={promise} title={config.title} />
            ))}
        </>
    );
};

const Recommendations = withSuspense(RecommendationsContent, {
    fallback: <ProductRecommendationsSkeleton />,
}) as React.ComponentType<{
    resolve: Promise<
        Array<{ config: { id: string; title: string }; promise: Promise<ShopperSearchTypes.ProductSearchResult> }>
    >;
}>;

/**
 * Product view component that displays the product content.
 * This component receives loader data and renders the main product view including
 * breadcrumbs and product details.
 * @returns JSX element representing the product page layout
 */
// eslint-disable-next-line react-refresh/only-export-components
function ProductDetailView({
    loaderData: { product, category, recommendations: recommendationsPromise, pageKey: _pageKey },
}: RouteComponentProps<ProductPageData>) {
    const productData = use(product);
    const categoryData = use(category);

    const isProductASet = isProductSet(productData);
    const isProductABundle = isProductBundle(productData);

    const content = (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

                {/* Recommended Products Section */}
                <div className="mt-16">
                    <Recommendations resolve={recommendationsPromise} />
                </div>
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
