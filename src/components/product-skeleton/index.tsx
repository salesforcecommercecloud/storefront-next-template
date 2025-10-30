import { Skeleton } from '@/components/ui/skeleton';

/**
 * ProductSkeleton component provides a loading state placeholder for product pages.
 *
 * This skeleton component mimics the layout of a product page including:
 * - Breadcrumb navigation
 * - Mobile product title and description
 * - Two-column layout with image gallery and product info
 * - Product information accordion
 * - Recommended products section
 *
 * Used to improve perceived performance while product data is being fetched
 * from the commerce API, providing visual feedback to users during loading states.
 *
 * @returns {JSX.Element} A skeleton layout matching the product page structure
 */
export default function ProductSkeleton() {
    return (
        <div className="min-h-screen bg-background" data-testid="product-skeleton">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* Breadcrumbs skeleton */}
                    <div className="hidden md:block">
                        <nav aria-label="Breadcrumb" className="mb-6" data-testid="breadcrumbs-skeleton">
                            <div className="flex flex-wrap items-center text-sm">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="mx-1 h-3 w-3" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="mx-1 h-3 w-3" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </nav>
                    </div>

                    {/* Mobile Product Title skeleton - shown on mobile only */}
                    <div className="block md:hidden" data-testid="mobile-title-skeleton">
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>

                    {/* Main Product Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Left Column - Image Gallery skeleton */}
                        <div className="order-1">
                            <ImageGallerySkeleton />
                        </div>

                        {/* Right Column - Product Info skeleton */}
                        <div className="order-2">
                            <ProductInfoSkeleton />
                        </div>
                    </div>

                    {/* Product Information Accordion skeleton */}
                    <div className="mt-16">
                        <ProductAccordionSkeleton />
                    </div>

                    {/* Recommended Products Section skeleton */}
                    <div className="mt-16">
                        <RecommendedProductsSkeleton />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * ImageGallerySkeleton component provides a loading state for the product image gallery.
 *
 * Renders skeleton placeholders for:
 * - Main product image (square aspect ratio)
 * - Thumbnail navigation images
 *
 * @returns {JSX.Element} A skeleton layout for the product image gallery
 */
function ImageGallerySkeleton() {
    return (
        <div className="space-y-4" data-testid="image-gallery-skeleton">
            {/* Main product image */}
            <Skeleton className="aspect-square w-full rounded-lg" data-testid="main-image-skeleton" />

            {/* Thumbnail images */}
            <div className="flex space-x-2 overflow-x-auto" data-testid="thumbnails-skeleton">
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-md" />
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-md" />
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-md" />
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-md" />
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-md" />
            </div>
        </div>
    );
}

/**
 * ProductInfoSkeleton component provides a loading state for the product information section.
 *
 * Renders skeleton placeholders for:
 * - Product title and description (desktop only)
 * - Price information
 * - Product variant options (size, color, etc.)
 * - Quantity selector
 * - Add to cart and wishlist buttons
 * - Product features list
 *
 * @returns {JSX.Element} A skeleton layout for the product information panel
 */
function ProductInfoSkeleton() {
    return (
        <div className="space-y-6" data-testid="product-info-skeleton">
            {/* Desktop Product Title */}
            <div className="hidden md:block" data-testid="desktop-title-skeleton">
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Price */}
            <div className="space-y-2" data-testid="price-skeleton">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-16" />
            </div>

            {/* Product options/variants */}
            <div className="space-y-4" data-testid="variants-skeleton">
                <div>
                    <Skeleton className="h-5 w-20 mb-2" />
                    <div className="flex space-x-2">
                        <Skeleton className="h-10 w-16 rounded-md" />
                        <Skeleton className="h-10 w-16 rounded-md" />
                        <Skeleton className="h-10 w-16 rounded-md" />
                    </div>
                </div>

                <div>
                    <Skeleton className="h-5 w-16 mb-2" />
                    <div className="flex space-x-2">
                        <Skeleton className="h-10 w-20 rounded-md" />
                        <Skeleton className="h-10 w-20 rounded-md" />
                        <Skeleton className="h-10 w-20 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Quantity selector */}
            <div data-testid="quantity-skeleton">
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-10 w-24 rounded-md" />
            </div>

            {/* Add to cart button */}
            <Skeleton className="h-12 w-full rounded-md" data-testid="add-to-cart-skeleton" />

            {/* Wishlist button */}
            <Skeleton className="h-10 w-32 rounded-md" data-testid="wishlist-skeleton" />

            {/* Product features */}
            <div className="space-y-2" data-testid="features-skeleton">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
            </div>
        </div>
    );
}

/**
 * ProductAccordionSkeleton component provides a loading state for the product information accordion.
 *
 * Renders skeleton placeholders for:
 * - Multiple accordion sections with headers
 * - Content within each accordion panel
 * - Typically used for product details, specifications, shipping info, etc.
 *
 * @returns {JSX.Element} A skeleton layout for the product information accordion
 */
function ProductAccordionSkeleton() {
    return (
        <div className="space-y-4" data-testid="accordion-skeleton">
            {/* Accordion items */}
            {Array.from({ length: 4 }, (_, i) => i).map((index) => (
                <div key={index} className="border rounded-lg" data-testid="accordion-item-skeleton">
                    <div className="p-4 border-b">
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="p-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * RecommendedProductsSkeleton component provides a loading state for the recommended products section.
 *
 * Renders skeleton placeholders for:
 * - Section title
 * - Grid of recommended product cards
 * - Each product card includes image, title, and price placeholders
 *
 * @returns {JSX.Element} A skeleton layout for the recommended products section
 */
function RecommendedProductsSkeleton() {
    return (
        <div className="space-y-6" data-testid="recommended-products-skeleton">
            {/* Section title */}
            <Skeleton className="h-8 w-48" data-testid="recommended-title-skeleton" />

            {/* Product carousel */}
            <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                data-testid="recommended-products-grid">
                {Array.from({ length: 4 }, (_, i) => i).map((index) => (
                    <div key={index} className="space-y-3" data-testid="recommended-product-item">
                        <Skeleton className="aspect-square w-full rounded-md" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
