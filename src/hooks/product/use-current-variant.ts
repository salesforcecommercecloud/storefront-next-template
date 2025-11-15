/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';

interface UseCurrentVariantProps {
    product: ShopperProducts.schemas['Product'];
    isChildProduct?: boolean;
}

/**
 * Determines the current product variant based on selected variation attributes and URL parameters.
 * Automatically syncs the variant selection with URL query parameters for shareable product links.
 *
 * @example Basic usage in ProductView
 * ```tsx
 * function ProductView({ product }) {
 *   const currentVariant = useCurrentVariant({ product });
 *
 *   return (
 *     <div>
 *       {currentVariant && (
 *         <p>Selected: {currentVariant.productId}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @param props - Configuration object
 * @param props.product - Product with variants array
 * @param props.isChildProduct - If true, prevents URL updates (useful for product sets/bundles)
 * @returns The matching variant object or undefined if no exact match is found
 */
export function useCurrentVariant({ product, isChildProduct = false }: UseCurrentVariantProps) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Use useSelectedVariations to get URL-aware selected attributes
    const selectedAttributes = useSelectedVariations({ product, isChildProduct });

    const variants = useMemo(() => product?.variants ?? [], [product]);

    // Find current variant based on selected attributes or URL param
    const currentVariant = useMemo(() => {
        const potentialVariants = variants.filter(
            ({ variationValues }) =>
                variationValues &&
                Object.keys(selectedAttributes).every((key) => {
                    return variationValues[key] === selectedAttributes[key];
                })
        );
        // If there's only 1 match, then we have narrowed down the true variant (meaning all of the variation attributes have been selected)
        return potentialVariants.length === 1 ? potentialVariants[0] : undefined;
    }, [selectedAttributes, variants]);

    // Update URL when variant changes
    useEffect(() => {
        if (product?.id && currentVariant && currentVariant.productId !== product.id && !isChildProduct) {
            const currentPid = searchParams.get('pid');
            // Only set pid if it's not already set to the correct value
            if (currentPid !== currentVariant.productId) {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set('pid', currentVariant.productId);
                setSearchParams(newSearchParams, { replace: true, preventScrollReset: true });
            }
        }
    }, [currentVariant, product, searchParams, setSearchParams, isChildProduct]);

    return currentVariant;
}
