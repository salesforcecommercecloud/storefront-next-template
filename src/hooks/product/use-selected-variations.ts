import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

interface UseSelectedVariationsParams {
    product: ShopperProducts.schemas['Product'];
    isChildProduct?: boolean;
}

/**
 * Hook to get currently selected variation values from URL parameters with fallback to product defaults.
 *
 * @param params - Configuration object
 * @param params.product - Product containing variation attributes and optional default variationValues
 * @param params.isChildProduct - Whether this product is a child product (part of set/bundle, default: false)
 * @returns Object of selected variations with attribute IDs as keys
 *
 * @example
 * // URL: /?color=NAVYWL&size=040&someOtherParam=ignored
 * const product = {
 *   variationAttributes: [
 *     { id: 'color', name: 'Color', values: [...] },
 *     { id: 'size', name: 'Size', values: [...] }
 *   ]
 * }
 *
 * const selections = useSelectedVariations({ product });
 * // Returns: { color: 'NAVYWL', size: '040' }
 * // Note: 'someOtherParam' is ignored because it's not a variation attribute and
 * default val will be used if url param for that attribute does not exist
 *
 * @example
 * // URL: / (no selections, no defaults)
 * const masterProduct = { variationAttributes: [...] }
 * const selections = useSelectedVariations({ product: masterProduct });
 * // Returns: {}
 * // Note: Empty object when no variations are selected and no defaults
 *
 * @example
 * // Child product within a bundle/set with nested URL parameters
 * // URL: /?childProduct456=color%3DRED%26size%3DL&otherParam=value
 * const childProduct = { id: 'childProduct456', variationAttributes: [...] }
 * const selections = useSelectedVariations({ product: childProduct, isChildProduct: true });
 * // Returns: { color: 'RED', size: 'L' }
 * // Note: Extracts and decodes nested parameters for individual products within bundles/sets
 */
export const useSelectedVariations = ({ product, isChildProduct = false }: UseSelectedVariationsParams) => {
    const [searchParams] = useSearchParams();

    return useMemo(() => {
        if (!product?.variationAttributes) return {};

        let params: URLSearchParams;

        if (isChildProduct) {
            // For child products (individual products within bundles/sets): params are nested like ?childProductId=color%3DRED%26size%3DL
            const productParamsString = searchParams.get(product.id) || '';
            params = new URLSearchParams(productParamsString);
        } else {
            // For regular products: use global URL params directly like ?color=RED&size=L
            params = searchParams;
        }

        // Build object of currently selected variation values from URL parameters with fallback to defaults
        // URL parameters and the product's default variationValues (for variant products)
        const result = product?.variationAttributes?.reduce(
            (selections, attribute) => {
                // First priority: Get the value from URL params for this specific variation attribute
                // For example: if attribute.id is 'color', look for ?color=NAVYWL in URL
                const urlValue = params.get(attribute.id);

                // Second priority: Fall back to product's default variationValues (for variant products)
                // For example: product.variationValues = { color: 'CHARCWL', size: '036', width: 'S' }
                const defaultValue = product.variationValues?.[attribute.id];

                // Use URL value if available, otherwise use default, otherwise skip this attribute
                const value = urlValue || defaultValue;

                // This keeps the returned object clean - no undefined/null values
                return value ? { ...selections, [attribute.id]: value } : selections;
            },
            {} as Record<string, string>
        );

        return result;
    }, [product, searchParams, isChildProduct]);
};
