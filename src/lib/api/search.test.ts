import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClients } from '@/lib/api-clients';
import { createTestContext } from '@/lib/test-utils';
import { fetchSearchProducts, fetchSearchSuggestions } from './search';

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

describe('', () => {
    describe('fetchSearchSuggestions', () => {
        const mockGetSearchSuggestions = vi.fn();
        const mockClients = {
            shopperSearch: {
                getSearchSuggestions: mockGetSearchSuggestions,
            },
            use: vi.fn(),
        };

        const mockContext = createTestContext();

        beforeEach(() => {
            vi.clearAllMocks();
            vi.mocked(createApiClients).mockReturnValue(mockClients as never);
        });

        it('should call getSearchSuggestions with basic parameters', async () => {
            const mockResult = { searchPhrase: 'dress' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            const result = await fetchSearchSuggestions(mockContext, { q: 'dress', currency: 'USD' });

            expect(createApiClients).toHaveBeenCalledWith(mockContext);
            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'dress',
                        currency: 'USD',
                    },
                },
            });
            expect(result).toBe(mockResult);
        });

        it('should call getSearchSuggestions with all parameters', async () => {
            const mockResult = { searchPhrase: 'shirt' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            await fetchSearchSuggestions(mockContext, {
                q: 'shirt',
                expand: ['images', 'prices'],
                limit: 10,
                currency: 'EUR',
            });

            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'shirt',
                        expand: ['images', 'prices'],
                        limit: 10,
                        currency: 'EUR',
                    },
                },
            });
        });

        it('should exclude undefined optional parameters', async () => {
            const mockResult = { searchPhrase: 'jacket' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            await fetchSearchSuggestions(mockContext, {
                q: 'jacket',
                expand: undefined,
                limit: undefined,
                currency: 'USD',
            });

            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'jacket',
                        currency: 'USD',
                    },
                },
            });
        });

        it('should include includeEinsteinSuggestedPhrases when true', async () => {
            const mockResult = { searchPhrase: 'shoes' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            await fetchSearchSuggestions(mockContext, {
                q: 'shoes',
                includeEinsteinSuggestedPhrases: true,
                currency: 'USD',
            });

            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'shoes',
                        currency: 'USD',
                        includeEinsteinSuggestedPhrases: true,
                    },
                },
            });
        });

        it('should include includeEinsteinSuggestedPhrases when false', async () => {
            const mockResult = { searchPhrase: 'shoes' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            await fetchSearchSuggestions(mockContext, {
                q: 'shoes',
                includeEinsteinSuggestedPhrases: false,
                currency: 'USD',
            });

            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'shoes',
                        currency: 'USD',
                        includeEinsteinSuggestedPhrases: false,
                    },
                },
            });
        });

        it('should exclude includeEinsteinSuggestedPhrases when undefined', async () => {
            const mockResult = { searchPhrase: 'shoes' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            await fetchSearchSuggestions(mockContext, {
                q: 'shoes',
                includeEinsteinSuggestedPhrases: undefined,
                currency: 'USD',
            });

            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'shoes',
                        currency: 'USD',
                    },
                },
            });
        });

        it('should handle includeEinsteinSuggestedPhrases with all other parameters', async () => {
            const mockResult = { searchPhrase: 'accessories' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            await fetchSearchSuggestions(mockContext, {
                q: 'accessories',
                expand: ['images', 'prices'],
                limit: 15,
                includeEinsteinSuggestedPhrases: true,
                currency: 'EUR',
            });

            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'accessories',
                        expand: ['images', 'prices'],
                        limit: 15,
                        currency: 'EUR',
                        includeEinsteinSuggestedPhrases: true,
                    },
                },
            });
        });

        it('should handle includeEinsteinSuggestedPhrases with mixed undefined parameters', async () => {
            const mockResult = { searchPhrase: 'bags' };
            mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

            await fetchSearchSuggestions(mockContext, {
                q: 'bags',
                expand: ['images'],
                limit: undefined,
                includeEinsteinSuggestedPhrases: false,
                currency: 'USD',
            });

            expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'bags',
                        expand: ['images'],
                        currency: 'USD',
                        includeEinsteinSuggestedPhrases: false,
                    },
                },
            });
        });
    });

    describe('fetchSearchProducts', () => {
        const mockProductSearch = vi.fn();
        const mockClients = {
            shopperSearch: {
                productSearch: mockProductSearch,
            },
            use: vi.fn(),
        };

        beforeEach(() => {
            vi.clearAllMocks();
            vi.mocked(createApiClients).mockReturnValue(mockClients as never);
        });

        it('should call productSearch with defaults and return data', async () => {
            const mockContext = createTestContext({
                currency: 'EUR',
                appConfig: {
                    site: {
                        currency: 'EUR',
                    },
                } as never,
            });

            const mockResult = { hits: [], total: 0 };
            mockProductSearch.mockResolvedValue({ data: mockResult });

            const result = await fetchSearchProducts(mockContext, { currency: 'EUR' });

            expect(createApiClients).toHaveBeenCalledWith(mockContext);
            expect(mockProductSearch).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: '',
                        sort: 'best-matches',
                        limit: 24,
                        offset: 0,
                        expand: ['promotions', 'variations', 'prices', 'images', 'page_meta_tags', 'custom_properties'],
                        currency: 'EUR',
                        allImages: true,
                        allVariationProperties: true,
                        perPricebook: true,
                    },
                },
            });
            expect(result).toBe(mockResult);
        });

        it('should build refine from categoryId and filters (and not include duplicates)', async () => {
            const mockContext = createTestContext({
                appConfig: {
                    site: {
                        currency: 'USD',
                    },
                } as never,
            });

            mockProductSearch.mockResolvedValue({ data: { hits: [] } });

            await fetchSearchProducts(mockContext, {
                categoryId: 'mens',
                filters: {
                    color: ['blue', 'blue', 'red'],
                    size: ['M'],
                },
                refine: ['cgid=mens', 'color=blue'],
                currency: 'USD',
            });

            expect(mockProductSearch).toHaveBeenCalledWith({
                params: {
                    query: expect.objectContaining({
                        refine: expect.arrayContaining(['cgid=mens', 'color=blue', 'color=red', 'size=M']),
                    }),
                },
            });

            const refineArg = mockProductSearch.mock.calls[0][0].params.query.refine as unknown as string[];
            expect(new Set(refineArg).size).toBe(refineArg.length);
        });

        it('should omit refine when no categoryId, filters, or refine provided', async () => {
            const mockContext = createTestContext();
            mockProductSearch.mockResolvedValue({ data: { hits: [] } });

            await fetchSearchProducts(mockContext, {
                q: 'dress',
                refine: [],
                filters: undefined,
                categoryId: undefined,
                currency: 'USD',
            });

            expect(mockProductSearch).toHaveBeenCalledWith({
                params: {
                    query: expect.not.objectContaining({
                        refine: expect.anything(),
                    }),
                },
            });
        });

        it('should allow explicit currency to override config currency', async () => {
            const mockContext = createTestContext({
                currency: 'JPY',
                appConfig: {
                    site: {
                        currency: 'EUR',
                    },
                } as never,
            });

            mockProductSearch.mockResolvedValue({ data: { hits: [] } });

            await fetchSearchProducts(mockContext, {
                q: 'shirt',
                currency: 'JPY',
            });

            expect(mockProductSearch).toHaveBeenCalledWith({
                params: {
                    query: expect.objectContaining({
                        q: 'shirt',
                        currency: 'JPY',
                    }),
                },
            });
        });

        it('should pass through non-default query parameters', async () => {
            const mockContext = createTestContext();
            mockProductSearch.mockResolvedValue({ data: { hits: [] } });

            await fetchSearchProducts(mockContext, {
                q: 'boots',
                sort: 'price-low-to-high',
                limit: 12,
                offset: 24,
                expand: ['prices'],
                allImages: false,
                allVariationProperties: false,
                perPricebook: false,
                currency: 'USD',
            });

            expect(mockProductSearch).toHaveBeenCalledWith({
                params: {
                    query: {
                        q: 'boots',
                        sort: 'price-low-to-high',
                        limit: 12,
                        offset: 24,
                        expand: ['prices'],
                        currency: expect.any(String),
                        allImages: false,
                        allVariationProperties: false,
                        perPricebook: false,
                    },
                },
            });
        });

        it('should propagate errors from productSearch', async () => {
            const mockContext = createTestContext();
            const err = new Error('boom');
            mockProductSearch.mockRejectedValue(err);

            await expect(fetchSearchProducts(mockContext, { q: 'x' })).rejects.toThrow('boom');
        });
    });
});
