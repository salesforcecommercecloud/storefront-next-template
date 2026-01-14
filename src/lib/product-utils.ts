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

import type { ShopperBasketsV2, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
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
 * @param {ShopperProducts.schemas['VariationAttribute'][] | undefined} variationAttributes - The variation attributes to search
 * @returns {ShopperProducts.schemas['VariationAttributeValue'][]} Array of color variation values
 *
 * @example
 * const colorValues = getColorValues(product.variationAttributes);
 * // Returns all color variation values from the product
 */
export function getColorValues(
    variationAttributes: ShopperProducts.schemas['VariationAttribute'][] | undefined
): ShopperProducts.schemas['VariationAttributeValue'][] {
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
 * @param {ShopperProducts.schemas['ImageGroup']} imageGroup - The image group containing swatch images
 * @param {string} colorValue - The color value for this swatch
 * @param {string} colorName - The display name for this color
 * @returns {SwatchData[]} Array of swatch data objects
 *
 * @example
 * const swatches = buildImageSwatchData(imageGroup, 'red', 'Red');
 * // Returns swatch data for all images in the image group
 */
export function buildImageSwatchData(
    imageGroup: ShopperProducts.schemas['ImageGroup'],
    colorValue: string,
    colorName: string
): SwatchData[] {
    const swatchData: SwatchData[] = [];

    if (imageGroup.images && Array.isArray(imageGroup.images)) {
        imageGroup.images.forEach((image: ShopperProducts.schemas['Image']) => {
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
 * @param {ShopperProducts.schemas['VariationAttribute'][]} [variationAttributes=[]]
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
    variationAttributes: ShopperProducts.schemas['VariationAttribute'][] = [],
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
 * Creates a product URL with optional attribute parameter.
 * Centralizes the path creation logic for product links.
 *
 * @param {string | undefined} productId - The product ID to create the URL for.
 * @param {string | null} [selectedAttributeValue=null] - Optional attribute value to append as a query parameter.
 * @param {string} [attributeType='color'] - The attribute type for the query parameter.
 * @returns {string} The formatted product URL or '#' if productId is undefined.
 *
 * @example
 * createProductUrl('12345'); // => '/product/12345'
 * createProductUrl('12345', 'red'); // => '/product/12345?color=red'
 * createProductUrl('12345', 'L', 'size'); // => '/product/12345?size=L'
 * createProductUrl('12345', null); // => '/product/12345'
 * createProductUrl(undefined); // => '#'
 */
export const createProductUrl = (
    productId: string | undefined,
    selectedAttributeValue: string | null = null,
    attributeType: string = 'color'
): string => {
    if (!productId) return '#';
    const baseUrl = `/product/${productId}`;
    return selectedAttributeValue ? `${baseUrl}?${attributeType}=${selectedAttributeValue}` : baseUrl;
};

/**
 * Get images filtered by color variation attribute
 *
 * @param {ShopperProducts.schemas['Product']} product - The product containing image groups
 * @param {string | null} selectedColor - The selected color value to filter by
 * @returns {ShopperProducts.schemas['Image'][]} Array of images matching the color, or default images
 *
 * @example
 * const images = getImagesForColor(product, 'red');
 * // Returns images for the red color variant, or default images if no match
 */
export function getImagesForColor(
    product: ShopperProducts.schemas['Product'],
    selectedColor: string | null
): ShopperProducts.schemas['Image'][] {
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
export type DecoratedVariationAttribute = ShopperProducts.schemas['VariationAttribute'] & {
    values: DecoratedVariationAttributeValue[];
};

/**
 * Decorated variation attribute value with href and swatch image
 */
export type DecoratedVariationAttributeValue = ShopperProducts.schemas['VariationAttributeValue'] & {
    href: string;
    swatch?: ShopperProducts.schemas['Image'];
};

/**
 * Provided a product this function will return the variation attributes decorated with
 * `href` and `swatch` image for the given attribute values. This allows easier access
 * when creating components that commonly use this information.
 *
 * @param {ShopperProducts.schemas['Product']} product - The product to decorate attributes for
 * @param {object} [opts={}] - Options for decoration
 * @param {string} [opts.swatchViewType='swatch'] - The viewType for the swatch image
 *
 * @returns {DecoratedVariationAttribute[]} decoratedVariationAttributes
 */
export const getDecoratedVariationAttributes = (
    product: ShopperSearch.schemas['ProductSearchHit'],
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
export function isProductSet(product: ShopperProducts.schemas['Product']): boolean {
    return Boolean(product?.type?.set);
}

/**
 * Determines if a product is a product bundle.
 * A product bundle is a group of products sold together as a single unit.
 * @param product - The product to check
 * @returns true if the product is a product bundle, false otherwise
 */
export function isProductBundle(product: ShopperProducts.schemas['Product']): boolean {
    return Boolean(product?.type?.bundle);
}

/**
 * Determines if a product is a standard product.
 * A standard product is a product that does not have variants.
 * @param product - The product to check
 * @returns true if the product is a standard product, false otherwise
 */
export function isStandardProduct(product: ShopperProducts.schemas['Product']): boolean {
    return Boolean(product?.type?.item);
}

/**
 * Determines if a product item is a bonus product.
 * A bonus product is a product that was added to the cart as part of a promotion.
 * @param productItem - The product item to check
 * @returns true if the product item is a bonus product, false otherwise
 */
export function isBonusProduct(productItem: ShopperBasketsV2.schemas['ProductItem']): boolean {
    return Boolean(productItem?.bonusProductLineItem);
}

/**
 * Determines the type of bonus product.
 * Returns 'choice' for choice-based bonus products (customers can select from options),
 * 'auto' for auto bonus products (automatically added), or null for non-bonus products.
 * @param productItem - The product item to check
 * @param bonusDiscountLineItems - Array of bonus discount line items from the basket
 * @returns 'choice' | 'auto' | null
 */
export function getBonusProductType(
    productItem: ShopperBasketsV2.schemas['ProductItem'],
    bonusDiscountLineItems?: ShopperBasketsV2.schemas['BonusDiscountLineItem'][]
): 'choice' | 'auto' | null {
    if (!isBonusProduct(productItem)) {
        return null;
    }

    const bonusDiscountLineItem = bonusDiscountLineItems?.find(
        (item) => item.id === productItem.bonusDiscountLineItemId
    );

    // If the bonusDiscountLineItem has bonusProducts array with items, it's choice-based
    if (bonusDiscountLineItem?.bonusProducts && bonusDiscountLineItem.bonusProducts.length > 0) {
        return 'choice';
    }

    return 'auto';
}

/**
 * Determines if a product requires variant selection before adding to cart.
 * Returns true for master products with variants or products with selectable attributes.
 *
 * @param product - The product to check
 * @returns true if variant selection is required, false for standard products
 */
export function requiresVariantSelection(product: ShopperProducts.schemas['Product']): boolean {
    // If this is already a variant (not a master), it can be added directly
    if (product.type?.variant) {
        return false;
    }

    // Check if it's a master product with variants
    if (product.variants && product.variants.length > 0) {
        return true;
    }

    // Check if it has variation attributes that need selection
    if (product.variationAttributes && product.variationAttributes.length > 0) {
        const hasSelectableAttributes = product.variationAttributes.some(
            (attr) => attr.values && attr.values.length > 1
        );
        return hasSelectableAttributes;
    }

    return false;
}

/**
 * Gets the primary image URL for a product from its image groups.
 * Prefers 'large' view type, falls back to first available image.
 * For variants, uses variation values to find the correct color-specific image.
 *
 * @param product - The product with image groups
 * @param viewType - Image view type preference (default: 'large')
 * @param variationValues - Optional variation values for variant-specific images (e.g., {color: 'red'})
 * @returns Image URL or undefined if no images available
 */
export function getPrimaryProductImageUrl(
    product: ShopperProducts.schemas['Product'],
    viewType: string = 'large',
    variationValues?: Record<string, string>
): string | undefined {
    // If variation values provided, find matching image group for the specific variant
    if (variationValues && Object.keys(variationValues).length > 0) {
        const imageGroup = findImageGroupBy(product.imageGroups || [], {
            viewType,
            selectedVariationAttributes: variationValues,
        });
        if (imageGroup?.images?.[0]) {
            return imageGroup.images[0].disBaseLink || imageGroup.images[0].link;
        }
    }

    // Try to find image group with specified view type
    const imageGroup = product.imageGroups?.find((group) => group.viewType === viewType);

    if (imageGroup?.images?.[0]) {
        return imageGroup.images[0].disBaseLink || imageGroup.images[0].link;
    }

    // Fallback: get first image from any group
    if (product.imageGroups?.[0]?.images?.[0]) {
        return product.imageGroups[0].images[0].disBaseLink || product.imageGroups[0].images[0].link;
    }

    return undefined;
}
