import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { useSelectedVariations } from './use-selected-variations';
import { findImageGroupBy } from '@/lib/image-groups-utils';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';

const getProductViewSearchParams = (search: string, productId: string) => {
    const allParams = new URLSearchParams(search);
    const productParams = new URLSearchParams(allParams.get(productId) || '');
    return [allParams, productParams] as const;
};

const updateSearchParams = (params: URLSearchParams, newParams: Record<string, string>) => {
    Object.entries(newParams).forEach(([key, value]) => {
        params.set(key, value);
    });
};

const buildVariantValueHref = ({
    pathname,
    existingParams,
    newParams,
    productId,
    isChildProduct,
}: {
    pathname: string;
    existingParams: readonly [URLSearchParams, URLSearchParams];
    newParams: Record<string, string>;
    productId: string;
    isChildProduct: boolean;
}) => {
    const [allParams, productParams] = existingParams;

    // Create copies to avoid mutating the original params
    const newAllParams = new URLSearchParams(allParams);
    const newProductParams = new URLSearchParams(productParams);

    if (isChildProduct) {
        updateSearchParams(newProductParams, newParams);
        newAllParams.set(productId, newProductParams.toString());
    } else {
        updateSearchParams(newAllParams, newParams);
    }

    return `${pathname}?${newAllParams.toString()}`;
};

/**
 * Determine if a products variant attribute value is orderable without having to
 * load the variant in question, but filtering the list of variants with the
 * passed in attribute values.
 */
const isVariantValueOrderable = (
    product: ShopperProductsTypes.Product,
    variationParams: Record<string, string>
): boolean => {
    if (!product.variants) return true;

    return product.variants
        .filter(({ variationValues }) =>
            Object.keys(variationParams).every((key) => variationValues?.[key] === variationParams[key])
        )
        .some(({ orderable }) => orderable);
};

export interface VariationAttribute {
    id: string;
    name: string;
    selectedValue: {
        name?: string;
        value?: string;
    };
    values: Array<{
        name: string;
        value: string;
        orderable?: boolean;
        image?: ShopperProductsTypes.Image;
        href: string;
        selected: boolean;
        disabled?: boolean;
    }>;
}

interface UseVariationAttributesParams {
    product: ShopperProductsTypes.Product;
    isChildProduct?: boolean;
}

/**
 * Use a decorated version of a product variation attributes. This version
 * will have the following additions: which variation attribute is selected,
 * each value will have a product url, the swatch image if there is one, and
 * an updated orderable flag.
 *
 * Each variation attribute includes the currently selected value from URL parameters,
 * available values with generated hrefs, and proper selection state.
 *
 * @param params - Configuration object
 * @param params.product - a product containing variation attributes and optional image groups
 * @param params.isChildProduct - whether this product is a child product (part of set/bundle, default: false)
 * @returns Array of processed variation attributes with URL state and navigation hrefs
 *
 * @example
 * // Basic usage with a suit product
 * const variationAttributes = useVariationAttributes({ product: navySuitProduct });
 * // Returns: [
 * //   {
 * //     id: 'color',
 * //     name: 'Color',
 * //     selectedValue: { name: 'Navy', value: 'NAVYWL' },
 * //     values: [{ name: 'Navy', value: 'NAVYWL', href: '/?color=NAVYWL', selected: true, ... }]
 * //   },
 * //   {
 * //     id: 'size',
 * //     name: 'Size',
 * //     selectedValue: { name: undefined, value: undefined },
 * //     values: [
 * //       { name: '36', value: '036', href: '/?color=NAVYWL&size=036', selected: false, ... },
 * //       { name: '38', value: '038', href: '/?color=NAVYWL&size=038', selected: false, ... }
 * //     ]
 * //   }
 * // ]
 *
 * @example
 * // URL: /?color=NAVYWL&size=040
 * const variationAttributes = useVariationAttributes({ product: navySuitProduct });
 * variationAttributes[0].selectedValue; // { name: 'Navy', value: 'NAVYWL' }
 * variationAttributes[1].selectedValue; // { name: '40', value: '040' }
 */
export const useVariationAttributes = ({
    product,
    isChildProduct = false,
}: UseVariationAttributesParams): VariationAttribute[] => {
    const location = useLocation();
    const selectedVariations = useSelectedVariations({ product, isChildProduct });

    return useMemo(() => {
        if (!product?.variationAttributes || !product?.id) return [];

        const existingParams = getProductViewSearchParams(location.search, product.id);

        return product?.variationAttributes.map((variationAttribute) => {
            const currentValue = selectedVariations[variationAttribute.id || ''];
            const selectedValueObj = variationAttribute.values?.find(({ value }) => value === currentValue);

            return {
                id: variationAttribute.id || '',
                name: variationAttribute.name || '',
                selectedValue: {
                    name: selectedValueObj?.name,
                    value: selectedValueObj?.value,
                },
                values: (variationAttribute.values || []).map((value) => {
                    // Build href using buildVariantValueHref
                    const href = buildVariantValueHref({
                        pathname: location.pathname,
                        existingParams,
                        newParams: { [variationAttribute.id || '']: value.value },
                        productId: product.id || '',
                        isChildProduct,
                    });

                    // Find swatch image for this variation - only for color attributes
                    let image: ShopperProductsTypes.Image | undefined;
                    if (product.imageGroups && variationAttribute.id === 'color') {
                        const imageGroup = findImageGroupBy(product.imageGroups, {
                            viewType: 'swatch',
                            selectedVariationAttributes: {
                                ['color']: value.value,
                            },
                        });
                        image = imageGroup?.images?.[0];
                    }

                    // Check if this variation value is orderable by looking at variants
                    const variationParams = {
                        ...selectedVariations,
                        [variationAttribute.id || '']: value.value,
                    };
                    const isOrderable = isVariantValueOrderable(product, variationParams);

                    return {
                        name: value.name || value.value,
                        value: value.value,
                        orderable: isOrderable,
                        disabled: !isOrderable,
                        image,
                        href,
                        selected: currentValue === value.value,
                    };
                }),
            };
        });
    }, [product, location.pathname, location.search, selectedVariations, isChildProduct]);
};
