/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { loader, fallback } from './index';
import { fetchSearchProducts } from '@/lib/api/search';
import ProductCarouselSkeleton from './skeleton';

// Mock the search API
vi.mock('@/lib/api/search', () => ({
    fetchSearchProducts: vi.fn(),
}));

// Mock the skeleton component
vi.mock('./skeleton', () => ({
    default: vi.fn(() => 'ProductCarouselSkeleton'),
}));

const mockFetchSearchProducts = vi.mocked(fetchSearchProducts);

describe('ProductCarousel Index', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loader function', () => {
        const mockContext = { get: vi.fn(), set: vi.fn() };

        const mockSearchResponse = {
            hits: [
                {
                    productId: 'test-product-1',
                    productName: 'Test Product 1',
                    price: 99.99,
                },
                {
                    productId: 'test-product-2',
                    productName: 'Test Product 2',
                    price: 149.99,
                },
            ],
            total: 2,
            query: '',
            refinements: [],
            searchPhraseSuggestions: { suggestedTerms: [] },
            sortingOptions: [],
            start: 0,
            count: 2,
            offset: 0,
            limit: 12,
        };

        beforeEach(() => {
            mockFetchSearchProducts.mockResolvedValue(mockSearchResponse);
        });

        const loaderTestCases = [
            {
                description: 'uses default values when no componentData provided',
                componentData: {},
                expected: { categoryId: 'mens-clothing-shorts', limit: 12 },
            },
            {
                description: 'uses provided categoryId and limit',
                componentData: { categoryId: 'womens-shoes', limit: 8 },
                expected: { categoryId: 'womens-shoes', limit: 8 },
            },
            {
                description: 'uses default categoryId when categoryId is falsy',
                componentData: { categoryId: '', limit: 6 },
                expected: { categoryId: 'mens-clothing-shorts', limit: 6 },
            },
            {
                description: 'uses default limit when limit is falsy',
                componentData: { categoryId: 'electronics', limit: 0 },
                expected: { categoryId: 'electronics', limit: 12 },
            },
            {
                description: 'passes through non-string categoryId due to type assertion',
                componentData: { categoryId: 123, limit: 6 },
                expected: { categoryId: 123, limit: 6 },
            },
            {
                description: 'passes through non-number limit due to type assertion',
                componentData: { categoryId: 'electronics', limit: 'invalid' },
                expected: { categoryId: 'electronics', limit: 'invalid' },
            },
            {
                description: 'handles null componentData gracefully',
                componentData: null as any,
                expected: { categoryId: 'mens-clothing-shorts', limit: 12 },
            },
            {
                description: 'extracts only categoryId and limit, ignoring other properties',
                componentData: {
                    categoryId: 'test-category',
                    limit: 10,
                    title: 'Some Title',
                    description: 'Some Description',
                    otherProp: 'ignored',
                },
                expected: { categoryId: 'test-category', limit: 10 },
            },
        ];

        test.each(loaderTestCases)('$description', async ({ componentData, expected }) => {
            const args = { componentData, context: mockContext };
            await loader(args);
            expect(mockFetchSearchProducts).toHaveBeenCalledWith(mockContext, expected);
        });

        test('returns the result from fetchSearchProducts', async () => {
            const args = {
                componentData: {
                    categoryId: 'test-category',
                    limit: 5,
                },
                context: mockContext,
            };

            const result = await loader(args);

            expect(result).toEqual(mockSearchResponse);
        });

        test('handles fetchSearchProducts errors', async () => {
            const mockError = new Error('API Error');
            mockFetchSearchProducts.mockRejectedValue(mockError);

            const args = {
                componentData: {},
                context: mockContext,
            };

            await expect(loader(args)).rejects.toThrow('API Error');
        });
    });

    describe('fallback export', () => {
        test('exports the skeleton component as fallback', () => {
            expect(fallback).toBe(ProductCarouselSkeleton);
            expect(fallback).toBeDefined();
            expect(typeof fallback).toBe('function');
        });
    });
});
