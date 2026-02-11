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
'use client';

import { useCallback } from 'react';
import { Link } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { createProductUrl, getImagesForColor } from '@/lib/product-utils';
import { useDynamicImageContext } from '@/providers/dynamic-image';
import { ProductImage } from './product-image';

interface ProductImageContainerProps {
    product: ShopperSearch.schemas['ProductSearchHit'];
    selectedColorValue?: string | null;
    className?: string;
    handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
    /** Image aspect ratio (width/height). If provided, calculates height based on viewport width. Defaults to 1 (square) */
    imgAspectRatio?: number;
}

const ProductImageContainer = ({
    product,
    selectedColorValue = null,
    className,
    handleProductClick,
    imgAspectRatio = 1,
}: ProductImageContainerProps) => {
    // Get the product image for the selected color variant
    const currentImage = getImagesForColor(product, selectedColorValue, 'medium').at(0) ?? product.image;
    const currentImageUrl = currentImage?.disBaseLink || currentImage?.link;

    // Report the image URL to the dynamic image context, if available
    const imageContext = useDynamicImageContext();
    currentImageUrl && imageContext?.addSource(currentImageUrl);

    const handleClick = useCallback(() => {
        handleProductClick?.(product);
    }, [handleProductClick, product]);

    // Calculate responsive widths based on viewport
    // These will be used to calculate the height based on aspect ratio
    const responsiveWidths = [
        // Each product image can take up the full 50% of the screen width
        '50vw', // base <= 479px
        '50vw', // sm >= 480px ; <= 767px
        // Due to the search refinements panel (fixed 280px), the product images
        // grid doesn't consume the entire screen. The smaller the images get,
        // the more this extra panel impacts the calculation of the responsive
        // image dimensions. Thus, to prevent over-fetching, we define smaller
        // dimensions than the column definitions might suggest. Due to large
        // margins it's also fine to floor the values.
        '15vw', // 15vw is generally a good fit for sizes `md` and above:
        // md >= 768px ; <= 991px | 280px consume ~28-36% of the entire screen | 4 image columns on ~2/3 of the screen ==> ~16vw
        // lg >= 992px ; <= 1279px | 280px consume ~22-28% of the entire screen | 5 image columns on ~3/4 of the screen ==> ~15vw
        // xl >= 1280px ; <= 1535px | 280px consume ~18-22% of the entire screen | 5 image columns on ~4/5 of the screen ==> ~16vw
        // 2xl >= 1536px | 280px consume less than 18% of the screen | 5 image columns on ~5/6 of the screen ==> ~16vw
    ];

    // Calculate height based on aspect ratio
    // imgAspectRatio = width / height, so height = width / imgAspectRatio
    // We use CSS calc with viewport units to compute height dynamically
    const heightStyle =
        imgAspectRatio !== 1
            ? {
                  // Use padding-bottom trick for aspect ratio, but calculate based on viewport width
                  // For responsive widths, we need to calculate height for each breakpoint
                  // Using aspect-ratio CSS property with calc for viewport-based calculation
                  aspectRatio: `${imgAspectRatio}`,
                  // Fallback: use padding-bottom percentage trick
                  paddingBottom: imgAspectRatio !== 1 ? `${(1 / imgAspectRatio) * 100}%` : undefined,
              }
            : {};

    return (
        <div
            className={`relative overflow-hidden rounded-lg bg-secondary/20 border-secondary flex flex-col ${
                imgAspectRatio === 1 ? 'aspect-square' : ''
            } ${className || ''}`}
            style={heightStyle}>
            {/* Product Image */}
            <Link
                to={createProductUrl(product.productId, selectedColorValue)}
                onClick={handleClick}
                className="block w-full h-full flex-1"
                aria-label={`View ${product.productName}`}>
                <ProductImage
                    src={currentImageUrl || ''}
                    alt={product.productName || 'Product'}
                    className="w-full h-full object-cover transition-all duration-200 group-hover:scale-105"
                    widths={responsiveWidths}
                />
            </Link>
        </div>
    );
};

export { ProductImageContainer };
