import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
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
    const mockResponse: ShopperSearch.schemas['SuggestionResult'] = {
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
            limit: undefined,
            includeEinsteinSuggestedPhrases: undefined,
            currency: 'USD',
        });
    });

    it('should handle expand parameter', async () => {
        await loader(createRequest('dress', 'images,prices'));

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'dress',
            expand: ['images', 'prices'],
            limit: undefined,
            includeEinsteinSuggestedPhrases: undefined,
            currency: 'USD',
        });
    });

    it('should handle errors', async () => {
        vi.mocked(fetchSearchSuggestions).mockRejectedValue(new Error('API Error'));

        const response = await loader(createRequest('dress'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.error).toBeDefined();
    });

    it('should handle includeEinsteinSuggestedPhrases parameter when true', async () => {
        const url = new URL('http://localhost/api/search-suggestions');
        url.searchParams.set('q', 'shoes');
        url.searchParams.set('includeEinsteinSuggestedPhrases', 'true');

        const request = {
            params: {},
            context: mockContext,
            request: new Request(url.toString()),
        };

        await loader(request);

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'shoes',
            expand: [],
            limit: undefined,
            includeEinsteinSuggestedPhrases: true,
            currency: 'USD',
        });
    });

    it('should handle includeEinsteinSuggestedPhrases parameter when false', async () => {
        const url = new URL('http://localhost/api/search-suggestions');
        url.searchParams.set('q', 'shoes');
        url.searchParams.set('includeEinsteinSuggestedPhrases', 'false');

        const request = {
            params: {},
            context: mockContext,
            request: new Request(url.toString()),
        };

        await loader(request);

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'shoes',
            expand: [],
            limit: undefined,
            includeEinsteinSuggestedPhrases: false,
            currency: 'USD',
        });
    });

    it('should handle includeEinsteinSuggestedPhrases parameter when not provided', async () => {
        const url = new URL('http://localhost/api/search-suggestions');
        url.searchParams.set('q', 'shoes');

        const request = {
            params: {},
            context: mockContext,
            request: new Request(url.toString()),
        };

        await loader(request);

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'shoes',
            expand: [],
            limit: undefined,
            includeEinsteinSuggestedPhrases: undefined,
            currency: 'USD',
        });
    });

    it('should handle includeEinsteinSuggestedPhrases with other parameters', async () => {
        const url = new URL('http://localhost/api/search-suggestions');
        url.searchParams.set('q', 'accessories');
        url.searchParams.set('expand', 'images,prices');
        url.searchParams.set('includeEinsteinSuggestedPhrases', 'true');

        const request = {
            params: {},
            context: mockContext,
            request: new Request(url.toString()),
        };

        await loader(request);

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'accessories',
            expand: ['images', 'prices'],
            limit: undefined,
            includeEinsteinSuggestedPhrases: true,
            currency: 'USD',
        });
    });

    it('should handle includeEinsteinSuggestedPhrases with invalid values as false', async () => {
        const url = new URL('http://localhost/api/search-suggestions');
        url.searchParams.set('q', 'bags');
        url.searchParams.set('includeEinsteinSuggestedPhrases', 'invalid');

        const request = {
            params: {},
            context: mockContext,
            request: new Request(url.toString()),
        };

        await loader(request);

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'bags',
            expand: [],
            limit: undefined,
            includeEinsteinSuggestedPhrases: false,
            currency: 'USD',
        });
    });

    it('should handle includeEinsteinSuggestedPhrases with empty string as false', async () => {
        const url = new URL('http://localhost/api/search-suggestions');
        url.searchParams.set('q', 'hats');
        url.searchParams.set('includeEinsteinSuggestedPhrases', '');

        const request = {
            params: {},
            context: mockContext,
            request: new Request(url.toString()),
        };

        await loader(request);

        expect(fetchSearchSuggestions).toHaveBeenCalledWith(mockContext, {
            q: 'hats',
            expand: [],
            limit: undefined,
            includeEinsteinSuggestedPhrases: false,
            currency: 'USD',
        });
    });
});
