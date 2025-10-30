import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { loader } from './resource.search-suggestions';
import { createTestContext } from '@/lib/test-utils';
import { fetchSearchSuggestions } from '@/lib/api/search';

// Mock error handler
vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn().mockResolvedValue({
        responseMessage: 'API Error',
        status_code: '500',
    }),
}));

// Mock the fetch function
vi.mock('@/lib/api/search', () => ({
    fetchSearchSuggestions: vi.fn(),
}));

describe('Search Suggestions API', () => {
    const mockResponse: ShopperSearchTypes.SuggestionResult = {
        searchPhrase: 'dress',
        categorySuggestions: {
            categories: [{ id: 'dresses', name: 'Dresses', parentCategoryName: 'Clothing' }],
            suggestedTerms: [],
        },
        productSuggestions: {
            products: [{ productId: 'dress-001', productName: 'Summer Dress', currency: 'USD', price: 99.99 }],
            suggestedTerms: [],
        },
    };

    let mockContext: ReturnType<typeof createTestContext>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = createTestContext();
        vi.mocked(fetchSearchSuggestions).mockResolvedValue(mockResponse);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createRequest = (q: string, expand?: string): LoaderFunctionArgs => {
        const url = new URL('http://localhost/api/search-suggestions');
        url.searchParams.set('q', q);
        if (expand) url.searchParams.set('expand', expand);

        return {
            params: {},
            context: mockContext,
            request: new Request(url.toString()),
        };
    };

    it('should return search suggestions', async () => {
        const response = await loader(createRequest('dress'));
        const result = await response.json();

        expect(result).toEqual({ success: true, data: mockResponse });
        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'dress',
            expand: [],
        });
    });

    it('should handle expand parameter', async () => {
        await loader(createRequest('dress', 'images,prices'));

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'dress',
            expand: ['images', 'prices'],
        });
    });

    it('should handle errors', async () => {
        vi.mocked(fetchSearchSuggestions).mockRejectedValue(new Error('API Error'));

        const response = await loader(createRequest('dress'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.error).toBeDefined();
    });
});
