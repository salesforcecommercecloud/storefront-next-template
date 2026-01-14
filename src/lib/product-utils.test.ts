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

import { describe, it, expect } from 'vitest';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import {
    getDisplayVariationValues,
    createProductUrl,
    getImagesForColor,
    isProductBundle,
    isStandardProduct,
    requiresVariantSelection,
    getPrimaryProductImageUrl,
} from './product-utils';

describe('product-utils', () => {
    describe('getDisplayVariationValues', () => {
        const mockVariationAttributes: ShopperProducts.schemas['VariationAttribute'][] = [
            {
                id: 'color',
                name: 'Color',
                values: [
                    { value: 'red', name: 'Red' },
                    { value: 'blue', name: 'Blue' },
                    { value: 'green', name: 'Green' },
                ],
            },
            {
                id: 'size',
                name: 'Size',
                values: [
                    { value: 's', name: 'Small' },
                    { value: 'm', name: 'Medium' },
                    { value: 'l', name: 'Large' },
                ],
            },
            {
                id: 'material',
                name: 'Material',
                values: [
                    { value: 'cotton', name: 'Cotton' },
                    { value: 'silk', name: 'Silk' },
                ],
            },
        ];

        it('should return display values for valid inputs', () => {
            const values = { color: 'red', size: 'm' };
            const result = getDisplayVariationValues(mockVariationAttributes, values);

            expect(result).toEqual({
                Color: 'Red',
                Size: 'Medium',
            });
        });

        it('should handle single attribute selection', () => {
            const values = { color: 'blue' };
            const result = getDisplayVariationValues(mockVariationAttributes, values);

            expect(result).toEqual({
                Color: 'Blue',
            });
        });

        it('should handle all attributes selected', () => {
            const values = { color: 'green', size: 'l', material: 'cotton' };
            const result = getDisplayVariationValues(mockVariationAttributes, values);

            expect(result).toEqual({
                Color: 'Green',
                Size: 'Large',
                Material: 'Cotton',
            });
        });

        it('should ignore unknown attribute IDs', () => {
            const values = { color: 'red', unknownAttribute: 'value' };
            const result = getDisplayVariationValues(mockVariationAttributes, values);

            expect(result).toEqual({
                Color: 'Red',
            });
        });

        it('should ignore unknown attribute values', () => {
            const values = { color: 'purple', size: 'm' };
            const result = getDisplayVariationValues(mockVariationAttributes, values);

            expect(result).toEqual({
                Size: 'Medium',
            });
        });

        it('should handle empty variation attributes array', () => {
            const values = { color: 'red', size: 'm' };
            const result = getDisplayVariationValues([], values);

            expect(result).toEqual({});
        });

        it('should handle empty values object', () => {
            const result = getDisplayVariationValues(mockVariationAttributes, {});

            expect(result).toEqual({});
        });

        it('should handle undefined variation attributes (default parameter)', () => {
            const values = { color: 'red' };
            const result = getDisplayVariationValues(undefined, values);

            expect(result).toEqual({});
        });

        it('should handle undefined values (default parameter)', () => {
            const result = getDisplayVariationValues(mockVariationAttributes, undefined);

            expect(result).toEqual({});
        });

        it('should handle both parameters undefined', () => {
            const result = getDisplayVariationValues();

            expect(result).toEqual({});
        });

        it('should handle attributes without names', () => {
            const attributesWithoutNames: ShopperProducts.schemas['VariationAttribute'][] = [
                {
                    id: 'color',
                    // name is missing
                    values: [{ value: 'red', name: 'Red' }],
                },
            ];
            const values = { color: 'red' };
            const result = getDisplayVariationValues(attributesWithoutNames, values);

            expect(result).toEqual({});
        });

        it('should handle attribute values without names', () => {
            const attributesWithoutValueNames: ShopperProducts.schemas['VariationAttribute'][] = [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        { value: 'red' }, // name is missing
                    ],
                },
            ];
            const values = { color: 'red' };
            const result = getDisplayVariationValues(attributesWithoutValueNames, values);

            expect(result).toEqual({});
        });

        it('should handle attributes without values array', () => {
            const attributesWithoutValues: ShopperProducts.schemas['VariationAttribute'][] = [
                {
                    id: 'color',
                    name: 'Color',
                    // values array is missing
                },
            ];
            const values = { color: 'red' };
            const result = getDisplayVariationValues(attributesWithoutValues, values);

            expect(result).toEqual({});
        });
    });

    describe('createProductUrl', () => {
        it('should create basic product URL without color', () => {
            const result = createProductUrl('12345');

            expect(result).toBe('/product/12345');
        });

        it('should create product URL with color parameter', () => {
            const result = createProductUrl('12345', 'red');

            expect(result).toBe('/product/12345?color=red');
        });

        it('should create product URL with custom attribute type', () => {
            const result = createProductUrl('12345', 'L', 'size');

            expect(result).toBe('/product/12345?size=L');
        });

        it('should default to color when attribute type not specified', () => {
            const result = createProductUrl('12345', 'blue');

            expect(result).toBe('/product/12345?color=blue');
        });
    });

    describe('getImagesForColor', () => {
        const defaultLargeImages: ShopperProducts.schemas['Image'][] = [
            {
                link: 'https://example.com/default1.jpg',
                disBaseLink: 'https://example.com/default1.jpg',
                alt: 'Default Image 1',
            },
            {
                link: 'https://example.com/default2.jpg',
                disBaseLink: 'https://example.com/default2.jpg',
                alt: 'Default Image 2',
            },
        ];

        const redImages: ShopperProducts.schemas['Image'][] = [
            {
                link: 'https://example.com/red1.jpg',
                disBaseLink: 'https://example.com/red1.jpg',
                alt: 'Red Image 1',
            },
            {
                link: 'https://example.com/red2.jpg',
                disBaseLink: 'https://example.com/red2.jpg',
                alt: 'Red Image 2',
            },
        ];

        const blueImages: ShopperProducts.schemas['Image'][] = [
            {
                link: 'https://example.com/blue1.jpg',
                disBaseLink: 'https://example.com/blue1.jpg',
                alt: 'Blue Image 1',
            },
        ];

        const productWithColorVariants: ShopperProducts.schemas['Product'] = {
            id: 'test-product',
            imageGroups: [
                {
                    viewType: 'large',
                    images: defaultLargeImages,
                },
                {
                    viewType: 'large',
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [{ value: 'red' }],
                        },
                    ],
                    images: redImages,
                },
                {
                    viewType: 'large',
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [{ value: 'blue' }],
                        },
                    ],
                    images: blueImages,
                },
                {
                    viewType: 'swatch',
                    images: [
                        {
                            link: 'https://example.com/swatch.jpg',
                            disBaseLink: 'https://example.com/swatch.jpg',
                            alt: 'Swatch',
                        },
                    ],
                },
            ],
        };

        it('should return default large images when no color is selected', () => {
            const result = getImagesForColor(productWithColorVariants, null);

            expect(result).toEqual(defaultLargeImages);
        });

        it('should return color-specific images when color is selected', () => {
            const redResult = getImagesForColor(productWithColorVariants, 'red');
            const blueResult = getImagesForColor(productWithColorVariants, 'blue');

            expect(redResult).toEqual(redImages);
            expect(blueResult).toEqual(blueImages);
        });

        it('should handle product without imageGroups', () => {
            const productWithoutImages: ShopperProducts.schemas['Product'] = {
                id: 'test-product',
                // imageGroups is missing
            };

            const result = getImagesForColor(productWithoutImages, 'red');

            expect(result).toEqual([]);
        });

        it('should handle product with empty imageGroups array', () => {
            const productWithEmptyImageGroups: ShopperProducts.schemas['Product'] = {
                id: 'test-product',
                imageGroups: [],
            };

            const resultWithColor = getImagesForColor(productWithEmptyImageGroups, 'red');
            const resultWithoutColor = getImagesForColor(productWithEmptyImageGroups, null);

            expect(resultWithColor).toEqual([]);
            expect(resultWithoutColor).toEqual([]);
        });

        it('should handle large image group without images array', () => {
            const productWithIncompleteImageGroup: ShopperProducts.schemas['Product'] = {
                id: 'test-product',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [],
                    },
                ],
            };

            const result = getImagesForColor(productWithIncompleteImageGroup, null);

            expect(result).toEqual([]);
        });

        it('should prioritize exact color matches over default images', () => {
            const productWithDefaultAndColorImages: ShopperProducts.schemas['Product'] = {
                id: 'test-product',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: defaultLargeImages,
                    },
                    {
                        viewType: 'large',
                        variationAttributes: [
                            {
                                id: 'color',
                                values: [{ value: 'red' }],
                            },
                        ],
                        images: redImages,
                    },
                ],
            };

            const result = getImagesForColor(productWithDefaultAndColorImages, 'red');

            expect(result).toEqual(redImages);
        });

        it('should handle multiple variation attributes in image groups', () => {
            const productWithMultipleAttributes: ShopperProducts.schemas['Product'] = {
                id: 'test-product',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: defaultLargeImages,
                    },
                    {
                        viewType: 'large',
                        variationAttributes: [
                            {
                                id: 'color',
                                values: [{ value: 'red' }],
                            },
                            {
                                id: 'size',
                                values: [{ value: 'large' }],
                            },
                        ],
                        images: redImages,
                    },
                ],
            };

            const result = getImagesForColor(productWithMultipleAttributes, 'red');

            expect(result).toEqual(redImages);
        });

        it('should handle case sensitivity in color matching', () => {
            const result1 = getImagesForColor(productWithColorVariants, 'Red');
            const result2 = getImagesForColor(productWithColorVariants, 'RED');

            expect(result1).toEqual([]);
            expect(result2).toEqual([]);
        });
    });

    describe('product type helpers', () => {
        it('isProductBundle returns true when product.type.bundle is true', () => {
            const product = { id: 'p1', type: { bundle: true } } as unknown as ShopperProducts.schemas['Product'];
            expect(isProductBundle(product)).toBe(true);
        });

        it('isProductBundle returns false when product.type.bundle is falsy', () => {
            const product = { id: 'p2', type: { item: true } } as unknown as ShopperProducts.schemas['Product'];
            expect(isProductBundle(product)).toBe(false);
        });

        it('isStandardProduct returns true when product.type.item is true', () => {
            const product = { id: 'p4', type: { item: true } } as unknown as ShopperProducts.schemas['Product'];
            expect(isStandardProduct(product)).toBe(true);
        });

        it('isStandardProduct returns false when product.type.item is falsy', () => {
            const product = { id: 'p5', type: { master: true } } as unknown as ShopperProducts.schemas['Product'];
            expect(isStandardProduct(product)).toBe(false);
        });
    });

    describe('requiresVariantSelection', () => {
        it('returns true for products with variants array', () => {
            const product = {
                id: 'master-product',
                variants: [{ productId: 'variant-1' }, { productId: 'variant-2' }],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(requiresVariantSelection(product)).toBe(true);
        });

        it('returns true for products with multiple selectable variation attribute values', () => {
            const product = {
                id: 'product-with-variations',
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [
                            { value: 'red', name: 'Red' },
                            { value: 'blue', name: 'Blue' },
                        ],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(requiresVariantSelection(product)).toBe(true);
        });

        it('returns false for products with single variation attribute value', () => {
            const product = {
                id: 'single-variant',
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [{ value: 'red', name: 'Red' }],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(requiresVariantSelection(product)).toBe(false);
        });

        it('returns false for standard products without variants', () => {
            const product = {
                id: 'standard-product',
                type: { item: true },
            } as unknown as ShopperProducts.schemas['Product'];

            expect(requiresVariantSelection(product)).toBe(false);
        });

        it('returns false for products with empty variants array', () => {
            const product = {
                id: 'empty-variants',
                variants: [],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(requiresVariantSelection(product)).toBe(false);
        });

        it('returns false for variant products even with sibling variants array', () => {
            const product = {
                id: '793775370033M',
                type: { variant: true },
                variants: [
                    { productId: '793775370033M', variationValues: { color: 'TURQUSI' } },
                    { productId: '793775362380M', variationValues: { color: 'REDSI' } },
                ],
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [
                            { value: 'TURQUSI', name: 'Turquoise' },
                            { value: 'REDSI', name: 'Red' },
                        ],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            // This is a variant product (not a master), so it should not require variant selection
            // even though it has a variants array containing sibling variants
            expect(requiresVariantSelection(product)).toBe(false);
        });
    });

    describe('getPrimaryProductImageUrl', () => {
        it('returns large image URL when available', () => {
            const product = {
                id: 'product-with-images',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [
                            { disBaseLink: 'https://cdn.example.com/large.jpg', link: 'https://example.com/large.jpg' },
                        ],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(getPrimaryProductImageUrl(product)).toBe('https://cdn.example.com/large.jpg');
        });

        it('prefers disBaseLink over link', () => {
            const product = {
                id: 'product',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [
                            { disBaseLink: 'https://cdn.example.com/image.jpg', link: 'https://example.com/image.jpg' },
                        ],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(getPrimaryProductImageUrl(product)).toBe('https://cdn.example.com/image.jpg');
        });

        it('falls back to link when disBaseLink is not available', () => {
            const product = {
                id: 'product',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [{ link: 'https://example.com/image.jpg' }],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(getPrimaryProductImageUrl(product)).toBe('https://example.com/image.jpg');
        });

        it('falls back to first available image when large view type not found', () => {
            const product = {
                id: 'product',
                imageGroups: [
                    {
                        viewType: 'swatch',
                        images: [{ link: 'https://example.com/swatch.jpg' }],
                    },
                    {
                        viewType: 'medium',
                        images: [{ link: 'https://example.com/medium.jpg' }],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            // Falls back to first image group
            expect(getPrimaryProductImageUrl(product)).toBe('https://example.com/swatch.jpg');
        });

        it('returns undefined when no images available', () => {
            const product = {
                id: 'product-no-images',
            } as unknown as ShopperProducts.schemas['Product'];

            expect(getPrimaryProductImageUrl(product)).toBeUndefined();
        });

        it('returns undefined when imageGroups is empty', () => {
            const product = {
                id: 'product',
                imageGroups: [],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(getPrimaryProductImageUrl(product)).toBeUndefined();
        });

        it('allows custom viewType parameter', () => {
            const product = {
                id: 'product',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [{ link: 'https://example.com/large.jpg' }],
                    },
                    {
                        viewType: 'small',
                        images: [{ link: 'https://example.com/small.jpg' }],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            expect(getPrimaryProductImageUrl(product, 'small')).toBe('https://example.com/small.jpg');
        });

        it('returns variant-specific image when variationValues provided', () => {
            const product = {
                id: 'product-with-color-variants',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [{ link: 'https://example.com/default.jpg' }],
                    },
                    {
                        viewType: 'large',
                        variationAttributes: [
                            {
                                id: 'color',
                                values: [{ value: 'red' }],
                            },
                        ],
                        images: [{ disBaseLink: 'https://example.com/red.jpg' }],
                    },
                    {
                        viewType: 'large',
                        variationAttributes: [
                            {
                                id: 'color',
                                values: [{ value: 'blue' }],
                            },
                        ],
                        images: [{ disBaseLink: 'https://example.com/blue.jpg' }],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            // Should return red variant image
            expect(getPrimaryProductImageUrl(product, 'large', { color: 'red' })).toBe('https://example.com/red.jpg');

            // Should return blue variant image
            expect(getPrimaryProductImageUrl(product, 'large', { color: 'blue' })).toBe('https://example.com/blue.jpg');
        });

        it('falls back to default image when variationValues do not match any image group', () => {
            const product = {
                id: 'product-with-color-variants',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [{ link: 'https://example.com/default.jpg' }],
                    },
                    {
                        viewType: 'large',
                        variationAttributes: [
                            {
                                id: 'color',
                                values: [{ value: 'red' }],
                            },
                        ],
                        images: [{ disBaseLink: 'https://example.com/red.jpg' }],
                    },
                ],
            } as unknown as ShopperProducts.schemas['Product'];

            // Request a color that doesn't exist - should fall back to default large image
            expect(getPrimaryProductImageUrl(product, 'large', { color: 'green' })).toBe(
                'https://example.com/default.jpg'
            );
        });
    });
});
