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
import { getProductBrand, getProductShortDescription, getProductRating } from './product-utils-plp';

describe('product-utils-plp', () => {
    describe('getProductBrand', () => {
        it('returns brand from representedProduct.brand', () => {
            expect(getProductBrand({ representedProduct: { brand: 'Acme' } })).toBe('Acme');
        });
        it('returns brand from representedProduct.c_brand', () => {
            expect(getProductBrand({ representedProduct: { c_brand: 'Market Street' } })).toBe('Market Street');
        });
        it('returns brand from product.c_brand when no representedProduct', () => {
            expect(getProductBrand({ c_brand: 'Nike' })).toBe('Nike');
        });
        it('returns brand from product.customProperties array', () => {
            expect(
                getProductBrand({
                    customProperties: [
                        { id: 'c_brand', value: 'Acme' },
                        { id: 'other', value: 'x' },
                    ],
                })
            ).toBe('Acme');
        });
        it('returns undefined when brand is empty or missing', () => {
            expect(getProductBrand({})).toBeUndefined();
            expect(getProductBrand({ representedProduct: {} })).toBeUndefined();
            expect(getProductBrand({ representedProduct: { brand: '  ' } })).toBeUndefined();
        });
    });

    describe('getProductShortDescription', () => {
        it('returns short description from representedProduct.c_shortDescription', () => {
            expect(getProductShortDescription({ representedProduct: { c_shortDescription: 'A great product.' } })).toBe(
                'A great product.'
            );
        });
        it('truncates to maxLength and appends ellipsis', () => {
            const long = 'A'.repeat(100);
            expect(getProductShortDescription({ representedProduct: { c_shortDescription: long } }, 50)).toBe(
                `${'A'.repeat(50).trim()}…`
            );
        });
        it('returns undefined when description is missing', () => {
            expect(getProductShortDescription({})).toBeUndefined();
        });
        it('returns short description from product.customProperties array', () => {
            expect(
                getProductShortDescription({
                    customProperties: [{ id: 'c_shortDescription', value: 'A great product for daily use.' }],
                })
            ).toBe('A great product for daily use.');
        });
    });

    describe('getProductRating', () => {
        it('returns mock rating and reviewCount (product data not read)', () => {
            expect(getProductRating({})).toEqual({ rating: 4, reviewCount: 218 });
            expect(getProductRating({ representedProduct: { c_reviewRating: 4.5, c_reviewCount: 100 } })).toEqual({
                rating: 4,
                reviewCount: 218,
            });
        });
    });
});
