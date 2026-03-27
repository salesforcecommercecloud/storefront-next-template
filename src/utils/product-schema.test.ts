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
import { generateProductSchema } from './product-schema';

describe('generateProductSchema', () => {
    const baseProduct: ShopperProducts.schemas['Product'] = {
        id: 'test-product-123',
        name: 'Test Product',
        currency: 'USD',
        price: 99.99,
        imageGroups: [
            {
                viewType: 'large',
                images: [
                    {
                        link: 'https://example.com/image-large.jpg',
                        alt: 'Test Product Large',
                    },
                ],
            },
        ],
        inventory: {
            id: 'inv-1',
            orderable: true,
            ats: 10,
            stockLevel: 10,
            backorderable: false,
            preorderable: false,
        },
    };

    describe('Basic schema structure', () => {
        it('should generate a valid Product schema with required fields', () => {
            const schema = generateProductSchema(baseProduct, 'https://example.com/product/test-product-123');

            expect(schema['@context']).toBe('https://schema.org');
            expect(schema['@type']).toBe('Product');
            expect(schema.name).toBe('Test Product');
            expect(schema.sku).toBe('test-product-123');
            expect(schema.productID).toBe('test-product-123');
            expect(schema.url).toBe('https://example.com/product/test-product-123');
        });

        it('should use productUrl parameter when provided', () => {
            const customUrl = 'https://example.com/custom-url';
            const schema = generateProductSchema(baseProduct, customUrl);

            expect(schema.url).toBe(customUrl);
        });

        it('should not use slugUrl from API response (may contain internal URLs)', () => {
            const productWithSlug = {
                ...baseProduct,
                slugUrl: 'https://internal.aws.lambda.com/product/123',
            };
            const schema = generateProductSchema(productWithSlug);

            // Should be undefined, not using the internal URL from slugUrl
            expect(schema.url).toBeUndefined();
        });

        it('should handle missing productUrl and slugUrl', () => {
            const productWithoutUrl = {
                ...baseProduct,
                slugUrl: undefined,
            };
            const schema = generateProductSchema(productWithoutUrl);

            expect(schema.url).toBeUndefined();
        });
    });

    describe('Description handling', () => {
        it('should use longDescription when available', () => {
            const product = {
                ...baseProduct,
                longDescription: 'Long description',
                shortDescription: 'Short description',
            };
            const schema = generateProductSchema(product);

            expect(schema.description).toBe('Long description');
        });

        it('should fallback to shortDescription when longDescription is missing', () => {
            const product = {
                ...baseProduct,
                shortDescription: 'Short description',
            };
            const schema = generateProductSchema(product);

            expect(schema.description).toBe('Short description');
        });

        it('should fallback to pageDescription when longDescription and shortDescription are missing', () => {
            const product = {
                ...baseProduct,
                pageDescription: 'Page description',
            };
            const schema = generateProductSchema(product);

            expect(schema.description).toBe('Page description');
        });

        it('should use empty string when no description is available', () => {
            const product = {
                ...baseProduct,
                longDescription: undefined,
                shortDescription: undefined,
                pageDescription: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.description).toBe('');
        });
    });

    describe('Image handling', () => {
        it('should use single image when only one image is available', () => {
            const schema = generateProductSchema(baseProduct);

            expect(schema.image).toBe('https://example.com/image-large.jpg');
            expect(typeof schema.image).toBe('string');
        });

        it('should use image array when 2-5 images are available', () => {
            const product = {
                ...baseProduct,
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [
                            { link: 'https://example.com/image1.jpg' },
                            { link: 'https://example.com/image2.jpg' },
                        ],
                    },
                    {
                        viewType: 'medium',
                        images: [{ link: 'https://example.com/image3.jpg' }],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(Array.isArray(schema.image)).toBe(true);
            expect((schema.image as string[]).length).toBe(3);
        });

        it('should limit images to 5 maximum', () => {
            const product = {
                ...baseProduct,
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [
                            { link: 'https://example.com/image1.jpg' },
                            { link: 'https://example.com/image2.jpg' },
                            { link: 'https://example.com/image3.jpg' },
                            { link: 'https://example.com/image4.jpg' },
                            { link: 'https://example.com/image5.jpg' },
                            { link: 'https://example.com/image6.jpg' },
                        ],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(Array.isArray(schema.image)).toBe(true);
            expect((schema.image as string[]).length).toBe(5);
        });

        it('should prioritize large images over medium images', () => {
            const product = {
                ...baseProduct,
                imageGroups: [
                    {
                        viewType: 'medium',
                        images: [{ link: 'https://example.com/medium.jpg' }],
                    },
                    {
                        viewType: 'large',
                        images: [{ link: 'https://example.com/large.jpg' }],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            // When there are 2 images, it returns an array
            expect(Array.isArray(schema.image)).toBe(true);
            expect((schema.image as string[])[0]).toBe('https://example.com/large.jpg');
        });

        it('should exclude small and thumbnail images', () => {
            const product = {
                ...baseProduct,
                imageGroups: [
                    {
                        viewType: 'small',
                        images: [{ link: 'https://example.com/small.jpg' }],
                    },
                    {
                        viewType: 'thumbnail',
                        images: [{ link: 'https://example.com/thumb.jpg' }],
                    },
                    {
                        viewType: 'large',
                        images: [{ link: 'https://example.com/large.jpg' }],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.image).toBe('https://example.com/large.jpg');
        });

        it('should handle products without images', () => {
            const product = {
                ...baseProduct,
                imageGroups: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.image).toBe('');
        });
    });

    describe('Brand handling', () => {
        it('should handle brand as string', () => {
            const product = {
                ...baseProduct,
                brand: 'Nike',
            };
            const schema = generateProductSchema(product);

            expect(schema.brand).toEqual({
                '@type': 'Brand',
                name: 'Nike',
            });
        });

        it('should handle brand as object with name property', () => {
            const product = {
                ...baseProduct,
                brand: { name: 'Adidas' },
            } as unknown as ShopperProducts.schemas['Product'];
            const schema = generateProductSchema(product);

            expect(schema.brand).toEqual({
                '@type': 'Brand',
                name: 'Adidas',
            });
        });

        it('should not add brand when brand is null', () => {
            const product = {
                ...baseProduct,
                brand: null,
            } as unknown as ShopperProducts.schemas['Product'];
            const schema = generateProductSchema(product);

            expect(schema.brand).toBeUndefined();
        });

        it('should not add brand when brand object has no name property', () => {
            const product = {
                ...baseProduct,
                brand: { id: 'brand-123' },
            } as unknown as ShopperProducts.schemas['Product'];
            const schema = generateProductSchema(product);

            expect(schema.brand).toBeUndefined();
        });

        it('should not add brand when brand is undefined', () => {
            const product = {
                ...baseProduct,
                brand: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.brand).toBeUndefined();
        });
    });

    describe('Price and offers', () => {
        it('should include offers when price and currency are available', () => {
            const schema = generateProductSchema(baseProduct);

            expect(schema.offers).toBeDefined();
            expect(schema.offers?.['@type']).toBe('Offer');
            expect(schema.offers?.price).toBe('99.99');
            expect(schema.offers?.priceCurrency).toBe('USD');
            expect(schema.offers?.availability).toBe('https://schema.org/InStock');
            expect(schema.offers?.itemCondition).toBe('https://schema.org/NewCondition');
            expect(schema.offers?.priceValidUntil).toBeDefined();
            expect(schema.offers?.priceValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/); // ISO date format
        });

        it('should not include offers when price is missing', () => {
            const product = {
                ...baseProduct,
                price: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.offers).toBeUndefined();
        });

        it('should not include offers when currency is missing', () => {
            const product = {
                ...baseProduct,
                currency: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.offers).toBeUndefined();
        });

        it('should use tieredPrices when price is not available', () => {
            const product = {
                ...baseProduct,
                price: undefined,
                tieredPrices: [
                    {
                        price: 79.99,
                        quantity: 1,
                        pricebook: 'usd-list',
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.price).toBe('79.99');
        });

        it('should use priceRanges when price and tieredPrices are not available', () => {
            const product = {
                ...baseProduct,
                price: undefined,
                tieredPrices: undefined,
                priceRanges: [
                    {
                        minPrice: 49.99,
                        maxPrice: 99.99,
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.price).toBe('49.99');
        });

        it('should include price range when priceMax is different from price', () => {
            const product = {
                ...baseProduct,
                price: 99.99,
                priceMax: 149.99,
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.lowPrice).toBe('99.99');
            expect(schema.offers?.highPrice).toBe('149.99');
        });

        it('should set priceValidUntil to 1 year from now', () => {
            const now = new Date();
            const oneYearFromNow = new Date(now);
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            const expectedDate = oneYearFromNow.toISOString().split('T')[0];

            const schema = generateProductSchema(baseProduct);

            // Allow for slight timing differences (within 1 second)
            const actualDate = schema.offers?.priceValidUntil;
            expect(actualDate).toBeDefined();
            if (actualDate) {
                const actual = new Date(actualDate);
                const expected = new Date(expectedDate);
                const diff = Math.abs(actual.getTime() - expected.getTime());
                expect(diff).toBeLessThan(1000); // Less than 1 second difference
            }
        });
    });

    describe('Availability status', () => {
        it('should set InStock when orderable and ats > 0', () => {
            const product = {
                ...baseProduct,
                inventory: {
                    id: 'inv-1',
                    orderable: true,
                    ats: 10,
                    stockLevel: 10,
                    backorderable: false,
                    preorderable: false,
                },
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.availability).toBe('https://schema.org/InStock');
        });

        it('should set BackOrder when orderable, ats = 0, and backorderable', () => {
            const product = {
                ...baseProduct,
                inventory: {
                    id: 'inv-1',
                    orderable: true,
                    ats: 0,
                    stockLevel: 0,
                    backorderable: true,
                    preorderable: false,
                },
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.availability).toBe('https://schema.org/BackOrder');
        });

        it('should set PreOrder when orderable, ats = 0, backorderable = false, and preorderable', () => {
            const product = {
                ...baseProduct,
                inventory: {
                    id: 'inv-1',
                    orderable: true,
                    ats: 0,
                    stockLevel: 0,
                    backorderable: false,
                    preorderable: true,
                },
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.availability).toBe('https://schema.org/PreOrder');
        });

        it('should set OutOfStock when not orderable', () => {
            const product = {
                ...baseProduct,
                inventory: {
                    id: 'inv-1',
                    orderable: false,
                    ats: 0,
                    stockLevel: 0,
                    backorderable: false,
                    preorderable: false,
                },
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.availability).toBe('https://schema.org/OutOfStock');
        });

        it('should set OutOfStock when inventory is missing', () => {
            const product = {
                ...baseProduct,
                inventory: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.availability).toBe('https://schema.org/OutOfStock');
        });
    });

    describe('Product identifiers', () => {
        it('should include MPN when manufacturerSKU is available', () => {
            const product = {
                ...baseProduct,
                manufacturerSKU: 'MFG-12345',
            };
            const schema = generateProductSchema(product);

            expect(schema.mpn).toBe('MFG-12345');
        });

        it('should not include MPN when manufacturerSKU is missing', () => {
            const product = {
                ...baseProduct,
                manufacturerSKU: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.mpn).toBeUndefined();
        });

        it('should include GTIN when ean is available', () => {
            const product = {
                ...baseProduct,
                ean: '1234567890123',
            };
            const schema = generateProductSchema(product);

            expect(schema.gtin).toBe('1234567890123');
        });

        it('should not include GTIN when ean is missing', () => {
            const product = {
                ...baseProduct,
                ean: undefined,
            };
            const schema = generateProductSchema(product);

            expect(schema.gtin).toBeUndefined();
        });

        it('should include category when primaryCategoryId is available', () => {
            const product = {
                ...baseProduct,
                primaryCategoryId: 'category-123',
            };
            const schema = generateProductSchema(product);

            expect(schema.category).toBe('category-123');
        });
    });

    describe('Variation attributes', () => {
        it('should include color when color variation attribute exists', () => {
            const product = {
                ...baseProduct,
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [
                            {
                                value: 'red',
                                name: 'Red',
                            },
                        ],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.color).toBe('Red');
        });

        it('should use value when name is not available for color', () => {
            const product = {
                ...baseProduct,
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [
                            {
                                value: 'blue',
                                name: undefined,
                            },
                        ],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.color).toBe('blue');
        });

        it('should include all variation attributes as additionalProperty', () => {
            const product = {
                ...baseProduct,
                variationAttributes: [
                    {
                        id: 'size',
                        name: 'Size',
                        values: [
                            { value: 's', name: 'Small' },
                            { value: 'm', name: 'Medium' },
                        ],
                    },
                    {
                        id: 'material',
                        name: 'Material',
                        values: [{ value: 'cotton', name: 'Cotton' }],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.additionalProperty).toBeDefined();
            expect(schema.additionalProperty?.length).toBe(2);
            expect(schema.additionalProperty?.[0]).toEqual({
                '@type': 'PropertyValue',
                name: 'Size',
                value: 'Small, Medium',
            });
            expect(schema.additionalProperty?.[1]).toEqual({
                '@type': 'PropertyValue',
                name: 'Material',
                value: 'Cotton',
            });
        });

        it('should handle variation attributes without names', () => {
            const product = {
                ...baseProduct,
                variationAttributes: [
                    {
                        id: 'size',
                        values: [{ value: 's', name: 'Small' }],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.additionalProperty?.[0].name).toBe('size');
        });

        it('should not include variation attributes when array is empty', () => {
            const product = {
                ...baseProduct,
                variationAttributes: [],
            };
            const schema = generateProductSchema(product);

            expect(schema.color).toBeUndefined();
            expect(schema.additionalProperty).toBeUndefined();
        });
    });

    describe('Custom attributes', () => {
        it('should include custom attributes as additionalProperty', () => {
            const product = {
                ...baseProduct,
                customAttributes: [
                    { id: 'c_isNew', value: true },
                    { id: 'c_isSale', value: false },
                    { id: 'c_rating', value: 4.5 },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.additionalProperty).toBeDefined();
            const customProps = schema.additionalProperty?.filter(
                (prop) => prop.name === 'c_isNew' || prop.name === 'c_isSale' || prop.name === 'c_rating'
            );
            expect(customProps?.length).toBe(3);
            expect(customProps?.find((p) => p.name === 'c_isNew')?.value).toBe(true);
            expect(customProps?.find((p) => p.name === 'c_isSale')?.value).toBe(false);
            expect(customProps?.find((p) => p.name === 'c_rating')?.value).toBe(4.5);
        });

        it('should merge custom attributes with variation attributes', () => {
            const product = {
                ...baseProduct,
                variationAttributes: [
                    {
                        id: 'size',
                        name: 'Size',
                        values: [{ value: 'm', name: 'Medium' }],
                    },
                ],
                customAttributes: [{ id: 'c_isNew', value: true }],
            };
            const schema = generateProductSchema(product);

            expect(schema.additionalProperty).toBeDefined();
            expect(schema.additionalProperty?.length).toBe(2);
        });

        it('should not include custom attributes with null or undefined values', () => {
            const product = {
                ...baseProduct,
                customAttributes: [
                    { id: 'c_valid', value: 'test' },
                    { id: 'c_null', value: null },
                    { id: 'c_undefined', value: undefined },
                ],
            };
            const schema = generateProductSchema(product);

            expect(schema.additionalProperty).toBeDefined();
            const customProps = schema.additionalProperty?.filter((prop) => prop.name.startsWith('c_'));
            expect(customProps?.length).toBe(1);
            expect(customProps?.[0].name).toBe('c_valid');
        });

        it('should not include custom attributes without id', () => {
            const product = {
                ...baseProduct,
                customAttributes: [{ value: 'test' }, { id: 'c_valid', value: 'valid' }],
            } as ShopperProducts.schemas['Product'];
            const schema = generateProductSchema(product);

            expect(schema.additionalProperty).toBeDefined();
            const customProps = schema.additionalProperty?.filter((prop) => prop.name.startsWith('c_'));
            expect(customProps?.length).toBe(1);
        });
    });

    describe('Edge cases', () => {
        it('should handle product with minimal data', () => {
            const minimalProduct: ShopperProducts.schemas['Product'] = {
                id: 'minimal-123',
                name: 'Minimal Product',
            };
            const schema = generateProductSchema(minimalProduct);

            expect(schema['@context']).toBe('https://schema.org');
            expect(schema['@type']).toBe('Product');
            expect(schema.name).toBe('Minimal Product');
            expect(schema.sku).toBe('minimal-123');
            expect(schema.offers).toBeUndefined();
        });

        it('should handle product with null price', () => {
            const product = {
                ...baseProduct,
                price: null,
            } as unknown as ShopperProducts.schemas['Product'];
            const schema = generateProductSchema(product);

            expect(schema.offers).toBeUndefined();
        });

        it('should handle product with price 0', () => {
            const product = {
                ...baseProduct,
                price: 0,
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.price).toBe('0.00');
        });

        it('should format price to 2 decimal places', () => {
            const product = {
                ...baseProduct,
                price: 99.999,
            };
            const schema = generateProductSchema(product);

            expect(schema.offers?.price).toBe('100.00');
        });

        it('should handle product with empty name', () => {
            const product = {
                ...baseProduct,
                name: '',
            };
            const schema = generateProductSchema(product);

            expect(schema.name).toBe('');
        });

        it('should handle duplicate image URLs and only include unique ones', () => {
            const product = {
                ...baseProduct,
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [
                            { link: 'https://example.com/image1.jpg' },
                            { link: 'https://example.com/image1.jpg' }, // duplicate
                            { link: 'https://example.com/image2.jpg' },
                        ],
                    },
                ],
            };
            const schema = generateProductSchema(product);

            if (Array.isArray(schema.image)) {
                expect(schema.image.length).toBe(2);
                expect(schema.image[0]).toBe('https://example.com/image1.jpg');
                expect(schema.image[1]).toBe('https://example.com/image2.jpg');
            }
        });
    });
});
