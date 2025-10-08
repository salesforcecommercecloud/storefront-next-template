/**
 * Get the human-friendly version of the variation values that users have selected.
 * Useful for displaying these values in the UI.
 *
 * @param variationAttributes - The products variation attributes.
 * @param values - The variations selected attribute values.
 * @returns A key value map of the display name and display value.
 *
 * @example
 * const displayValues = getDisplayVariationValues(
 *     [ {
 *         "id": "color",
 *         "name": "Colour",
 *         "values": [ { "name": "royal", "orderable": true, "value": "JJ5FUXX" } ]
 *     } ],
 *     { "color": "JJ5FUXX" }
 * )
 * // returns { "Colour": "royal" }
 */

import { type ShopperProductsTypes, type ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { findImageGroupBy } from '@/lib/image-groups-utils';

/**
 * Type definition for swatch data used in color attribute selectors
 */
export type SwatchData = {
    imageUrl: string;
    alt: string;
    colorName: string;
    colorValue: string;
    isSelected?: boolean;
};

/**
 * Extract color values from variation attributes
 *
 * @param {ShopperProductsTypes.VariationAttribute[] | undefined} variationAttributes - The variation attributes to search
 * @returns {ShopperProductsTypes.VariationAttributeValue[]} Array of color variation values
 *
 * @example
 * const colorValues = getColorValues(product.variationAttributes);
 * // Returns all color variation values from the product
 */
export function getColorValues(
    variationAttributes: ShopperProductsTypes.VariationAttribute[] | undefined
): ShopperProductsTypes.VariationAttributeValue[] {
    if (variationAttributes && Array.isArray(variationAttributes)) {
        for (const attr of variationAttributes) {
            if (attr.id === 'color' && attr.values && Array.isArray(attr.values)) {
                return attr.values;
            }
        }
    }
    return [];
}

/**
 * Build swatch data from an image group for a specific color
 *
 * @param {ShopperProductsTypes.ImageGroup} imageGroup - The image group containing swatch images
 * @param {string} colorValue - The color value for this swatch
 * @param {string} colorName - The display name for this color
 * @returns {SwatchData[]} Array of swatch data objects
 *
 * @example
 * const swatches = buildImageSwatchData(imageGroup, 'red', 'Red');
 * // Returns swatch data for all images in the image group
 */
export function buildImageSwatchData(
    imageGroup: ShopperProductsTypes.ImageGroup,
    colorValue: string,
    colorName: string
): SwatchData[] {
    const swatchData: SwatchData[] = [];

    if (imageGroup.images && Array.isArray(imageGroup.images)) {
        imageGroup.images.forEach((image: ShopperProductsTypes.Image) => {
            const imageLink = image.disBaseLink || image.link;
            // Only add swatch if we have a valid color value and image link
            if (colorValue && imageLink) {
                swatchData.push({
                    imageUrl: imageLink,
                    alt: colorName || (image.alt as string) || `${colorValue} swatch`,
                    colorName,
                    colorValue,
                    isSelected: false, // Will be set later by the component
                });
            }
        });
    }

    return swatchData;
}

/**
 * Converts a record of variation attribute IDs and values into a record
 * of human-readable attribute names and value names.
 *
 * This is useful for displaying product variation selections (e.g. color, size)
 * in a more user-friendly format rather than showing internal IDs.
 *
 * @param {ShopperProductsTypes.VariationAttribute[]} [variationAttributes=[]]
 *   The list of variation attributes available for the product.
 *   Each attribute contains an `id`, a `name`, and a list of possible `values`.
 *
 * @param {Record<string, string>} [values={}]
 *   A record mapping variation attribute IDs to selected values.
 *   For example: `{ color: "red", size: "m" }`.
 *
 * @returns {Record<string, string>}
 *   A record mapping attribute display names to value display names.
 *   For example: `{ Color: "Red", Size: "Medium" }`.
 *
 * @example
 * const variationAttributes = [
 *   {
 *     id: "color",
 *     name: "Color",
 *     values: [
 *       { value: "red", name: "Red" },
 *       { value: "blue", name: "Blue" }
 *     ]
 *   },
 *   {
 *     id: "size",
 *     name: "Size",
 *     values: [
 *       { value: "s", name: "Small" },
 *       { value: "m", name: "Medium" }
 *     ]
 *   }
 * ];
 *
 * const values = { color: "red", size: "m" };
 *
 * getDisplayVariationValues(variationAttributes, values);
 * // => { Color: "Red", Size: "Medium" }
 */
export const getDisplayVariationValues = (
    variationAttributes: ShopperProductsTypes.VariationAttribute[] = [],
    values: Record<string, string> = {}
): Record<string, string> => {
    return Object.entries(values).reduce((acc: Record<string, string>, [id, value]) => {
        const attribute = variationAttributes.find(({ id: attributeId }) => attributeId === id);
        if (attribute && attribute.name) {
            const attributeValue = attribute.values?.find(({ value: attrValue }) => attrValue === value);
            if (attributeValue && attributeValue.name) {
                return {
                    ...acc,
                    [attribute.name]: attributeValue.name,
                };
            }
        }
        return acc;
    }, {});
};

/**
 * Creates a product URL with optional color parameter.
 * Centralizes the path creation logic for product links.
 *
 * @param {string | undefined} productId - The product ID to create the URL for.
 * @param {string | null} [selectedColorValue=null] - Optional color value to append as a query parameter.
 * @returns {string} The formatted product URL or '#' if productId is undefined.
 *
 * @example
 * createProductUrl('12345'); // => '/product/12345'
 * createProductUrl('12345', 'red'); // => '/product/12345?color=red'
 * createProductUrl('12345', null); // => '/product/12345'
 * createProductUrl(undefined); // => '#'
 */
export const createProductUrl = (productId: string | undefined, selectedColorValue: string | null = null): string => {
    if (!productId) return '#';
    const baseUrl = `/product/${productId}`;
    return selectedColorValue ? `${baseUrl}?color=${selectedColorValue}` : baseUrl;
};

/**
 * Get images filtered by color variation attribute
 *
 * @param {ShopperProductsTypes.Product} product - The product containing image groups
 * @param {string | null} selectedColor - The selected color value to filter by
 * @returns {ShopperProductsTypes.Image[]} Array of images matching the color, or default images
 *
 * @example
 * const images = getImagesForColor(product, 'red');
 * // Returns images for the red color variant, or default images if no match
 */
export function getImagesForColor(
    product: ShopperProductsTypes.Product,
    selectedColor: string | null
): ShopperProductsTypes.Image[] {
    // Return all images if no color is selected or no image groups exist
    if (!selectedColor || !product.imageGroups) {
        return product.imageGroups?.find((group) => group.viewType === 'large')?.images || [];
    }

    // Find image group that matches the selected color
    const imageGroup = findImageGroupBy(product.imageGroups, {
        viewType: 'large',
        selectedVariationAttributes: {
            color: selectedColor,
        },
    });

    // Return images from the matching group, or fallback to default images
    return imageGroup?.images || [];
}

/**
 * Decorated variation attribute with href and swatch image
 */
export type DecoratedVariationAttribute = ShopperProductsTypes.VariationAttribute & {
    values: DecoratedVariationAttributeValue[];
};

/**
 * Decorated variation attribute value with href and swatch image
 */
export type DecoratedVariationAttributeValue = ShopperProductsTypes.VariationAttributeValue & {
    href: string;
    swatch?: ShopperProductsTypes.Image;
};

/**
 * Provided a product this function will return the variation attributes decorated with
 * `href` and `swatch` image for the given attribute values. This allows easier access
 * when creating components that commonly use this information.
 *
 * @param {ShopperProductsTypes.Product} product - The product to decorate attributes for
 * @param {object} [opts={}] - Options for decoration
 * @param {string} [opts.swatchViewType='swatch'] - The viewType for the swatch image
 *
 * @returns {DecoratedVariationAttribute[]} decoratedVariationAttributes
 */
export const getDecoratedVariationAttributes = (
    product: ShopperSearchTypes.ProductSearchHit,
    opts: { swatchViewType?: string } = {}
): DecoratedVariationAttribute[] => {
    const { swatchViewType = 'swatch' } = opts;

    if (!product?.variationAttributes) {
        return [];
    }

    return product.variationAttributes.map((variationAttribute) => ({
        ...variationAttribute,
        values: (variationAttribute.values || []).map((value) => {
            // Create URL search params for this variation value
            const searchParams = new URLSearchParams();
            if (variationAttribute.id && value.value) {
                searchParams.set(variationAttribute.id, value.value);
            }

            // Build href for this variation
            const href = `/product/${product.productId}?${searchParams.toString()}`;

            // Find swatch image for this variation value
            const swatchImageGroup = findImageGroupBy(product.imageGroups || [], {
                viewType: swatchViewType,
                selectedVariationAttributes: {
                    [variationAttribute.id || '']: value.value,
                },
            });

            const swatch = swatchImageGroup?.images?.[0];

            return {
                ...value,
                href,
                swatch,
            };
        }),
    }));
};

/**
 * Determines if a product is a product set.
 * A product set is a collection of related products that can be purchased together.
 * @param product - The product to check
 * @returns true if the product is a product set, false otherwise
 */
export function isProductSet(product: ShopperProductsTypes.Product): boolean {
    return Boolean(product?.type?.set);
}

/**
 * Determines if a product is a product bundle.
 * A product bundle is a group of products sold together as a single unit.
 * @param product - The product to check
 * @returns true if the product is a product bundle, false otherwise
 */
export function isProductBundle(product: ShopperProductsTypes.Product): boolean {
    return Boolean(product?.type?.bundle);
}
