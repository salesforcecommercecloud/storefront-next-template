/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { useMemo } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { GalleryImage } from '@/components/image-gallery';
import { findImageGroupBy } from '@/lib/image-groups-utils';

interface UseProductImagesProps {
    product: ShopperProducts.schemas['Product'];
    selectedAttributes?: Record<string, string>;
    viewType?: string;
}

interface UseProductImagesReturn {
    galleryImages: GalleryImage[];
}

/**
 * Helper function to get default images from image groups
 * @param imageGroups - The image groups array
 * @param viewType - The view type to filter by (defaults to 'large')
 * @returns Array of images for the specified view type
 */
const getDefaultImages = (
    imageGroups: ShopperProducts.schemas['ImageGroup'][] | undefined,
    viewType: string = 'large'
): ShopperProductsTypes.Image[] => {
    return imageGroups?.find((group) => group.viewType === viewType)?.images || [];
};

/**
 * Manages product images based on variation attributes with automatic fallbacks.
 *
 * @example Basic usage in ProductView
 * ```tsx
 * const [selectedAttributes, setSelectedAttributes] = useState({});
 * const { galleryImages } = useProductImages({
 *   product,
 *   selectedAttributes,
 * });
 * return <ImageGallery images={galleryImages} />;
 * ```
 *
 * @example With specific view type
 * ```tsx
 * const { galleryImages } = useProductImages({
 *   product,
 *   selectedAttributes: { color: 'red', size: 'M' },
 *   viewType: 'large'
 * });
 * ```
 *
 * @param props - Configuration object
 * @param props.product - Product with image groups
 * @param props.selectedAttributes - Selected variation attributes
 * @param props.viewType - Image size ('large', 'medium', 'small', etc.)
 * @returns Gallery images and utility functions
 */
export function useProductImages({
    product,
    selectedAttributes,
    viewType = 'large',
}: UseProductImagesProps): UseProductImagesReturn {
    // Get images filtered by selected attributes
    const filteredImages = useMemo(() => {
        // Return default images if no attributes are selected
        if (!selectedAttributes || Object.keys(selectedAttributes).length === 0) {
            return getDefaultImages(product.imageGroups, viewType);
        }

        // Find image group that matches the selected attributes
        const imageGroup = findImageGroupBy(product.imageGroups || [], {
            viewType,
            selectedVariationAttributes: selectedAttributes,
        });

        // Return images from the matching group, or fallback to default images
        return imageGroup?.images || getDefaultImages(product.imageGroups, viewType);
    }, [product.imageGroups, selectedAttributes, viewType]);

    // Transform Commerce SDK images to GalleryImage format
    const galleryImages: GalleryImage[] = useMemo(() => {
        if (!filteredImages || filteredImages.length === 0) {
            return [];
        }

        return filteredImages.map((image: ShopperProductsTypes.Image) => ({
            src: image.disBaseLink || image.link || '',
            alt: image.alt || product.name || '',
            thumbSrc: image.disBaseLink || image.link || '',
        }));
    }, [filteredImages, product.name]);

    return {
        // Transformed images
        /** Array of images formatted for gallery display, filtered by selected attributes */
        galleryImages,
    };
}
