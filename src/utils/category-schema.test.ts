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
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { mockBuildConfig } from '@/test-utils/config';
import { type Config, createAppConfig } from '@/config';
import { generateCategorySchema } from './category-schema';

describe('generateCategorySchema', () => {
    const baseCategory: ShopperProducts.schemas['Category'] = {
        id: 'test-category-123',
        name: 'Test Category',
    } as ShopperProducts.schemas['Category'];

    const baseSearchResult: ShopperSearch.schemas['ProductSearchResult'] = {
        hits: [],
        total: 0,
        query: '',
        refinements: [],
        searchPhraseSuggestions: { suggestedTerms: [] },
        sortingOptions: [],
        offset: 0,
        limit: 0,
        start: 0,
        count: 0,
    } as ShopperSearch.schemas['ProductSearchResult'];

    const validPageUrl = 'https://example.com/category/test-category-123';
    const defaultCurrency = 'USD';

    it('should generate a valid CollectionPage schema with required fields', () => {
        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: baseSearchResult,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema['@context']).toBe('https://schema.org');
        expect(schema['@type']).toBe('CollectionPage');
        expect(schema.name).toBe('Test Category');
        expect(schema.url).toBe(validPageUrl);
    });

    it('should include category description when available', () => {
        const categoryWithDescription = {
            ...baseCategory,
            pageDescription: 'Test category description',
        };

        const schema = generateCategorySchema({
            category: categoryWithDescription,
            searchResult: baseSearchResult,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.description).toBe('Test category description');
    });

    it('should use category id as name fallback when name is missing', () => {
        const categoryWithoutName = {
            ...baseCategory,
            name: undefined,
        };

        const schema = generateCategorySchema({
            category: categoryWithoutName,
            searchResult: baseSearchResult,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.name).toBe('test-category-123');
    });

    it('should generate breadcrumb from parentCategoryTree when available', () => {
        const categoryWithParents = {
            ...baseCategory,
            parentCategoryTree: [
                { id: 'root', name: 'Home' },
                { id: 'parent-1', name: 'Parent Category' },
            ],
        };

        const schema = generateCategorySchema({
            category: categoryWithParents,
            searchResult: baseSearchResult,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.breadcrumb).toBeDefined();
        expect(schema.breadcrumb?.['@type']).toBe('BreadcrumbList');
        expect(schema.breadcrumb?.itemListElement).toHaveLength(3); // 2 parents + current category

        const breadcrumbs = schema.breadcrumb?.itemListElement || [];
        expect(breadcrumbs[0].name).toBe('Home');
        expect(breadcrumbs[0].item).toBe('https://example.com/category/root');
        expect(breadcrumbs[1].name).toBe('Parent Category');
        expect(breadcrumbs[1].item).toBe('https://example.com/category/parent-1');
        expect(breadcrumbs[2].name).toBe('Test Category');
        expect(breadcrumbs[2].item).toBe(validPageUrl);
    });

    it('should include current category in breadcrumb even without parentCategoryTree', () => {
        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: baseSearchResult,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.breadcrumb).toBeDefined();
        expect(schema.breadcrumb?.itemListElement).toHaveLength(1);
        expect(schema.breadcrumb?.itemListElement?.[0].name).toBe('Test Category');
        expect(schema.breadcrumb?.itemListElement?.[0].item).toBe(validPageUrl);
    });

    it('should generate ItemList with products from search results', () => {
        const searchResultWithProducts: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                    image: { link: 'https://example.com/image1.jpg' },
                },
                {
                    productId: 'product-2',
                    productName: 'Product 2',
                    price: 39.99,
                    currency: 'USD',
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 2,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 2,
            start: 0,
            count: 2,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithProducts,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.mainEntity).toBeDefined();
        expect(schema.mainEntity?.['@type']).toBe('ItemList');
        expect(schema.mainEntity?.numberOfItems).toBe(2);
        expect(schema.mainEntity?.itemListElement).toHaveLength(2);

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].position).toBe(1);
        expect(items[0].item['@type']).toBe('Product');
        expect(items[0].item.name).toBe('Product 1');
        expect(items[0].item.url).toBe('https://example.com/product/product-1');
        expect(items[0].item.image).toBe('https://example.com/image1.jpg');
        expect(items[0].item.offers?.price).toBe('29.99');
        expect(items[0].item.offers?.priceCurrency).toBe('USD');
    });

    it('should limit products to 20 items', () => {
        const manyProducts = Array.from({ length: 25 }, (_, i) => ({
            productId: `product-${i}`,
            productName: `Product ${i}`,
            price: 10 + i,
            currency: 'USD',
        })) as ShopperSearch.schemas['ProductSearchHit'][];

        const searchResultWithManyProducts: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: manyProducts,
            total: 25,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 25,
            start: 0,
            count: 25,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithManyProducts,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.mainEntity?.itemListElement).toHaveLength(20);
    });

    it('should handle products without productId', () => {
        const searchResultWithoutIds: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productName: 'Product Without ID',
                    price: 19.99,
                    currency: 'USD',
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithoutIds,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.url).toBeUndefined();
        expect(items[0].item.offers?.url).toBeUndefined();
    });

    it('should handle products without images', () => {
        const searchResultWithoutImages: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithoutImages,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.image).toBeUndefined();
    });

    it('should handle products without prices', () => {
        const searchResultWithoutPrices: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    currency: 'USD',
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithoutPrices,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.offers).toBeUndefined();
    });

    it('should set availability to InStock when config.products.orderableOnly is true', () => {
        const searchResultWithStock: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithStock,
            pageUrl: validPageUrl,
            defaultCurrency,
            config: createAppConfig({
                ...mockBuildConfig,
                ...({ app: { search: { products: { orderableOnly: true } } } } as Partial<Config>),
            }),
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.offers?.availability).toBe('https://schema.org/InStock');
    });

    it('should omit availability when config.products.orderableOnly is false', () => {
        const searchResultOutOfStock: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultOutOfStock,
            pageUrl: validPageUrl,
            defaultCurrency,
            config: createAppConfig({
                ...mockBuildConfig,
                ...({ app: { search: { products: { orderableOnly: false } } } } as Partial<Config>),
            }),
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.offers?.availability).toBeUndefined();
    });

    it('should set availability to OutOfStock when orderable is false, though config.products.orderableOnly is true', () => {
        const searchResultWithoutOrderable: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                    orderable: false,
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithoutOrderable,
            pageUrl: validPageUrl,
            defaultCurrency,
            config: createAppConfig({
                ...mockBuildConfig,
                ...({ app: { search: { products: { orderableOnly: true } } } } as Partial<Config>),
            }),
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.offers?.availability).toBe('https://schema.org/OutOfStock');
    });

    it('should set availability to X when orderable is true, though config.products.orderableOnly is false', () => {
        const searchResultWithoutOrderable: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                    orderable: true,
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithoutOrderable,
            pageUrl: validPageUrl,
            defaultCurrency,
            config: createAppConfig({
                ...mockBuildConfig,
                ...({ app: { search: { products: { orderableOnly: false } } } } as Partial<Config>),
            }),
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.offers?.availability).toBe('https://schema.org/InStock');
    });

    it('should handle invalid pageUrl gracefully', () => {
        const invalidUrl = 'not-a-valid-url';

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: baseSearchResult,
            pageUrl: invalidUrl,
            defaultCurrency,
        });

        expect(schema.url).toBe(invalidUrl);
        // Breadcrumb items should not have URLs when baseUrl is invalid
        if (schema.breadcrumb?.itemListElement) {
            schema.breadcrumb.itemListElement.forEach((item) => {
                if (item.item && item.item !== invalidUrl) {
                    expect(item.item).toBeUndefined();
                }
            });
        }
    });

    it('should handle empty search results', () => {
        const emptySearchResult: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [],
            total: 0,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 0,
            start: 0,
            count: 0,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: emptySearchResult,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.mainEntity).toBeDefined();
        expect(schema.mainEntity?.numberOfItems).toBe(0);
        expect(schema.mainEntity?.itemListElement).toBeUndefined();
    });

    it('should handle search results with undefined hits', () => {
        const searchResultWithoutHits: ShopperSearch.schemas['ProductSearchResult'] = {
            total: 0,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithoutHits,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        expect(schema.mainEntity).toBeDefined();
        expect(schema.mainEntity?.itemListElement).toBeUndefined();
    });

    it('should use disBaseLink as image fallback', () => {
        const searchResultWithDisBaseLink: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                    image: { disBaseLink: 'https://example.com/dis-image1.jpg' },
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithDisBaseLink,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.image).toBe('https://example.com/dis-image1.jpg');
    });

    it('should prefer link over disBaseLink for images', () => {
        const searchResultWithBothLinks: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                    currency: 'USD',
                    image: {
                        link: 'https://example.com/image1.jpg',
                        disBaseLink: 'https://example.com/dis-image1.jpg',
                    },
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithBothLinks,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.image).toBe('https://example.com/image1.jpg');
    });

    it('should handle parentCategoryTree items without id', () => {
        const categoryWithParentsWithoutIds = {
            ...baseCategory,
            parentCategoryTree: [{ name: 'Parent Without ID' }],
        };

        const schema = generateCategorySchema({
            category: categoryWithParentsWithoutIds,
            searchResult: baseSearchResult,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        const breadcrumbs = schema.breadcrumb?.itemListElement || [];
        expect(breadcrumbs[0].name).toBe('Parent Without ID');
        expect(breadcrumbs[0].item).toBeUndefined();
    });

    it('should use default currency when currency is missing', () => {
        const searchResultWithoutCurrency: ShopperSearch.schemas['ProductSearchResult'] = {
            hits: [
                {
                    productId: 'product-1',
                    productName: 'Product 1',
                    price: 29.99,
                },
            ] as ShopperSearch.schemas['ProductSearchHit'][],
            total: 1,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            offset: 0,
            limit: 1,
            start: 0,
            count: 1,
        } as ShopperSearch.schemas['ProductSearchResult'];

        const schema = generateCategorySchema({
            category: baseCategory,
            searchResult: searchResultWithoutCurrency,
            pageUrl: validPageUrl,
            defaultCurrency,
        });

        const items = schema.mainEntity?.itemListElement || [];
        expect(items[0].item.offers?.priceCurrency).toBe(defaultCurrency);
    });
});
