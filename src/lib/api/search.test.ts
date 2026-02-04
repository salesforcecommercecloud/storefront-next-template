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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClients } from '@/lib/api-clients';
import { createTestContext } from '@/lib/test-utils';
import { fetchSearchProducts } from './search';

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

describe('', () => {
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
                    commerce: {
                        defaultCurrency: 'EUR',
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
                        refine: ['orderable_only=true'],
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
                    commerce: {
                        sites: [
                            {
                                defaultCurrency: 'USD',
                            },
                        ],
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

        it('should use default refine when no categoryId, filters, or refine provided', async () => {
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
                    query: expect.objectContaining({
                        refine: ['orderable_only=true'],
                    }),
                },
            });
        });

        it('should allow explicit currency to override config currency', async () => {
            const mockContext = createTestContext({
                currency: 'JPY',
                appConfig: {
                    commerce: {
                        sites: [
                            {
                                defaultCurrency: 'EUR',
                            },
                        ],
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
                        refine: ['orderable_only=true'],
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

        it('should not include orderable_only when config has orderableOnly=false', async () => {
            const mockContext = createTestContext({
                appConfig: {
                    search: {
                        products: {
                            orderableOnly: false,
                        },
                    },
                } as any,
            });

            mockProductSearch.mockResolvedValue({ data: { hits: [] } });

            await fetchSearchProducts(mockContext, {
                q: 'dress',
                categoryId: 'womens',
                currency: 'USD',
            });

            expect(mockProductSearch).toHaveBeenCalledWith({
                params: {
                    query: expect.objectContaining({
                        refine: ['cgid=womens'], // <-- orderable_only=true not included
                    }),
                },
            });
        });
    });
});
