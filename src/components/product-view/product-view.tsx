/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { type ReactElement } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import ImageGallery from '@/components/image-gallery';
import ProductInfo from './product-info';
import ProductCartActions from '@/components/product-cart-actions';
import ProductViewProvider from '@/providers/product-view';
import { useProductImages } from '@/hooks/product/use-product-images';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';
import CategoryBreadcrumbs from '../category-breadcrumbs';
import { isProductSet, isProductBundle } from '@/lib/product-utils';

interface ProductViewProps {
    product: ShopperProducts.schemas['Product'];
    category?: ShopperProducts.schemas['Category'];
    mode?: 'add' | 'edit';
}

/**
 * ProductView component renders a complete product detail view with image gallery and product information.
 *
 * @param props - The component props
 * @param props.product - The product data from Salesforce Commerce Cloud containing all product details,
 *                        variants, pricing, and metadata
 * @param props.category - Optional category data used for breadcrumb navigation. If not provided,
 *                         no breadcrumbs will be rendered in the product view
 *
 * @returns A React element containing the complete product view layout
 *
 * @example
 * ```tsx
 * // With category for breadcrumbs
 * <ProductView product={productData} category={categoryData} />
 *
 * // Without category (no breadcrumbs will be shown)
 * <ProductView product={productData} />
 * ```
 */
export default function ProductView({ product, category }: ProductViewProps): ReactElement {
    // Calculate directly without useMemo since these are simple operations
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);
    const breadcrumbData = category?.parentCategoryTree || [];

    // Get selected attributes from URL parameters for image gallery
    const selectedAttributes = useSelectedVariations({ product });
    const { galleryImages } = useProductImages({
        product,
        selectedAttributes,
    });

    return (
        <ProductViewProvider product={product} mode="add">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 space-y-6">
                {/* Left Column - Image Gallery */}
                <div className="order-1">
                    <ImageGallery images={galleryImages} eager={!isProductASet && !isProductABundle} />
                </div>

                {/* Right Column - Product Info */}
                <div className="order-2">
                    {/* Breadcrumbs */}
                    {breadcrumbData.length > 0 && category && (
                        <div className="hidden md:block">
                            <CategoryBreadcrumbs category={category} />
                        </div>
                    )}
                    <ProductInfo product={product} />
                    <ProductCartActions product={product} />
                </div>
            </div>
        </ProductViewProvider>
    );
}
