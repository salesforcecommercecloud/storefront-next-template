import { use } from 'react';
import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';
import ProductSkeleton from '@/components/product-skeleton';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import ProductView from '@/components/product-view';
import ProductAccordion from '@/components/product-view/product-accordion';
import { Typography } from '@/components/typography';
import ChildProducts from '@/components/product-view/child-products';
import { isProductSet, isProductBundle } from '@/lib/product-utils';

type ProductPageData = {
    product: Promise<ShopperProductsTypes.Product>;
    category: Promise<ShopperProductsTypes.Category | undefined>;
    pageKey: string;
};

/**
 * Internal helper function that fetches product data and category information.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @returns Promise that resolves to an object containing product and category data promises
 */
function getPageData({ request, params, context }: LoaderFunctionArgs): ProductPageData {
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
        return undefined;
    });

    return {
        product: productPromise,
        category: categoryPromise,
        pageKey: productId,
    };
}
/**
 * Server-side loader function that fetches product data and category information.
 * This function runs on the server during SSR and prepares data for the product page.
 * @returns Promise that resolves to an object containing product and category promises
 */
export function loader(args: LoaderFunctionArgs) {
    return getPageData(args);
}

/**
 * Client-side loader function that handles data loading for client-side navigation.
 * This function ensures React Router doesn't block navigation by returning promises
 * directly instead of wrapped in a data object.
 * @returns Promise that resolves to an object containing product and category promises
 */
export function clientLoader(args: ClientLoaderFunctionArgs) {
    // For variant navigation, return current data immediately to prevent skeleton
    // Background fetching will be handled by the component
    return getPageData(args);
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

    // Don't revalidate for other search parameter changes (color, size, etc.)
    return false;
}

/**
 * Product view component that displays the product content.
 * This component receives loader data and renders the main product view including
 * breadcrumbs and product details.
 * @returns JSX element representing the product page layout
 */
// eslint-disable-next-line react-refresh/only-export-components
function ProductDetailView({ loaderData: { product, category } }: RouteComponentProps<ProductPageData>) {
    const productData = use(product);
    const categoryData = use(category);

    const isProductASet = isProductSet(productData);
    const isProductABundle = isProductBundle(productData);

    return (
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
                        <>
                            <ProductView product={productData} category={categoryData} />
                            <ProductAccordion product={productData} />
                        </>
                    )}
                </div>

                {/* Recommended Products Section */}
                <div className="mt-16">
                    {/*<ProductCarousel title={uiStrings.product.recommendedProductsTitle} />*/}
                </div>
            </div>
        </div>
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
